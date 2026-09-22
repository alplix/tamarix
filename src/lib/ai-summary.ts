import type { AiSummary, Finding, ScoreResult } from "./types";
import type { Locale } from "./i18n/locales";
import { LOCALES } from "./i18n/locales";
import { translateFinding } from "./findings";

const TILVAR_API_URL = "https://tilvar.athena.org.tr/api/chat";
const REQUEST_TIMEOUT_MS = 20_000;

export interface AiSummaryOutcome {
  summary: AiSummary | null;
  error: string | null;
}

interface TilvarChatResponse {
  reply: string;
  kind: string;
}

interface TilvarErrorBody {
  detail?: string;
}

function languageName(locale: Locale): string {
  return LOCALES.find((l) => l.code === locale)?.name ?? "English";
}

/** Builds a compact, already-derived, already-localized summary to send to Tilvar — never raw HTML or full headers. */
function buildPrompt(locale: Locale, url: string, score: ScoreResult, findings: Finding[]): string {
  const nonPassFindings = findings.filter((f) => f.severity !== "PASS");
  const compact = nonPassFindings.map((f) => {
    const translated = translateFinding(locale, f);
    return { category: translated.category, severity: translated.severity, title: translated.title, description: translated.description };
  });

  // Tilvar's /api/chat has no forced-JSON-schema mode, so the schema is spelled out AND shown as a worked
  // example (illustrative values, not to be reused) -- this matters much more here than it did for a
  // schema-following model, and the "no findings -> empty array" line heads off a common failure mode where a
  // clean scan (all PASS, so `compact` is []) gets an invented finding anyway.
  return `Below is a set of ALREADY-COLLECTED passive security scan findings for a website. You will only interpret this data — you will not send any request to the site yourself.

Site: ${url}
Security score: ${score.score}/100

Findings (JSON):
${JSON.stringify(compact, null, 2)}

Task: Produce a response that matches ONLY the following JSON schema, with no other text, no markdown code fences, and no explanation before or after it:

{
  "overview": "a 2-3 sentence overall assessment",
  "findingExplanations": [
    {
      "title": "the finding's title (must match the title above)",
      "explanation": "a short explanation",
      "whyItMatters": "why it matters",
      "recommendation": "the recommended fix"
    }
  ]
}

Worked example of the exact shape expected (values illustrative only, do not reuse them):
{"overview":"This site has one issue that needs attention.","findingExplanations":[{"title":"HTTPS is not available","explanation":"The site can be reached over plain HTTP.","whyItMatters":"Traffic can be read or altered in transit.","recommendation":"Redirect all HTTP traffic to HTTPS and enable HSTS."}]}

findingExplanations must contain exactly one entry per finding above, in the same order — if the findings list above is empty, findingExplanations must be an empty array []. Write ALL text values (overview, title, explanation, whyItMatters, recommendation) in ${languageName(locale)}. Respond with ONLY valid JSON, no markdown code fences.`;
}

function isValidAiSummary(value: unknown): value is AiSummary {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.overview !== "string") return false;
  if (!Array.isArray(obj.findingExplanations)) return false;
  return obj.findingExplanations.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const e = entry as Record<string, unknown>;
    return (
      typeof e.title === "string" &&
      typeof e.explanation === "string" &&
      typeof e.whyItMatters === "string" &&
      typeof e.recommendation === "string"
    );
  });
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

async function callTilvar(content: string, apiKey: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(TILVAR_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content }],
        web: false,
        think: false,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateAiSummary(
  url: string,
  score: ScoreResult,
  findings: Finding[],
  locale: Locale
): Promise<AiSummaryOutcome> {
  const apiKey = process.env.TAMARIX_TILVAR_API_KEY;
  if (!apiKey) {
    return { summary: null, error: "TAMARIX_TILVAR_API_KEY is not configured." };
  }

  const content = buildPrompt(locale, url, score, findings);

  let response: Response;
  try {
    response = await callTilvar(content, apiKey);

    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get("Retry-After"));
      const waitMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 0;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      response = await callTilvar(content, apiKey);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return { summary: null, error: `The AI request failed: ${message}` };
  }

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const errorBody = (await response.json()) as TilvarErrorBody;
      detail = errorBody.detail;
    } catch {
      // Response body wasn't JSON (or was empty) — fall back to a status-only message.
    }
    return {
      summary: null,
      error: detail ? `Tilvar API returned ${response.status}: ${detail}` : `Tilvar API returned ${response.status}`,
    };
  }

  let data: TilvarChatResponse;
  try {
    data = (await response.json()) as TilvarChatResponse;
  } catch {
    return { summary: null, error: "Tilvar API returned a non-JSON response." };
  }

  if (!data.reply) {
    return { summary: null, error: "Tilvar API returned no reply content." };
  }

  let parsed: unknown;
  try {
    parsed = extractJson(data.reply);
  } catch {
    return { summary: null, error: "The AI response was not valid JSON." };
  }

  if (!isValidAiSummary(parsed)) {
    return { summary: null, error: "The AI response did not match the expected schema." };
  }

  return { summary: parsed, error: null };
}
