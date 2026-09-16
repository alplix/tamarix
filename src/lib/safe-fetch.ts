import { validateTargetUrl, UnsafeUrlError } from "./url-validation";

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB — plenty for headers/HTML, avoids huge downloads
const DEFAULT_TIMEOUT_MS = 8000;

export interface SafeFetchResult {
  response: Response;
  finalUrl: string;
  bodyText: string;
  truncated: boolean;
}

export interface SafeFetchOptions {
  method?: "GET" | "HEAD" | "OPTIONS";
  timeoutMs?: number;
  readBody?: boolean;
}

/**
 * Fetches a URL that has already passed (or will pass) SSRF validation, following
 * redirects manually so each hop is re-validated before it is followed. Never
 * throws on HTTP error statuses — only on network/timeout/SSRF failures.
 */
export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const method = options.method ?? "GET";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const readBody = options.readBody ?? true;

  let currentUrl = rawUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const { url } = await validateTargetUrl(currentUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "SiteGuardAI-Scanner/1.0 (+passive security scan)",
          Accept: "*/*",
        },
      });
    } catch {
      if (controller.signal.aborted) {
        throw new UnsafeUrlError("request_timeout");
      }
      throw new UnsafeUrlError("connection_failed");
    } finally {
      clearTimeout(timer);
    }

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get("location");

    if (isRedirect && location) {
      response.body?.cancel?.().catch(() => {});
      currentUrl = new URL(location, url).toString();
      continue;
    }

    if (!readBody) {
      return { response, finalUrl: url.toString(), bodyText: "", truncated: false };
    }

    const { text, truncated } = await readLimitedBody(response);
    return { response, finalUrl: url.toString(), bodyText: text, truncated };
  }

  throw new UnsafeUrlError("too_many_redirects");
}

async function readLimitedBody(response: Response): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) {
    const text = await response.text().catch(() => "");
    return { text: text.slice(0, MAX_BODY_BYTES), truncated: text.length > MAX_BODY_BYTES };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        truncated = true;
        await reader.cancel().catch(() => {});
        break;
      }
      chunks.push(value);
    }
  }

  const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return { text: buffer.toString("utf-8"), truncated };
}

export { UnsafeUrlError };
