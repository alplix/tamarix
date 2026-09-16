import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";
import { performScan, UnsafeUrlError } from "@/lib/scan-service";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";
import { t, type MessageKey } from "@/lib/i18n/translate";

export const dynamic = "force-dynamic";

function clientKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  const locale = getLocaleFromRequest(req);
  const key = clientKey(req);

  if (isRateLimited(key)) {
    return NextResponse.json({ error: t(locale, "error.rate_limited") }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: t(locale, "error.invalid_body") }, { status: 400 });
  }

  const url = typeof (body as { url?: unknown })?.url === "string" ? (body as { url: string }).url.trim() : null;
  const force = Boolean((body as { force?: unknown })?.force);

  if (!url) {
    return NextResponse.json({ error: t(locale, "error.missing_url") }, { status: 400 });
  }

  try {
    const { scan, cached } = await performScan(url, locale, force);
    return NextResponse.json({ scan, cached }, { status: 200 });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      if (err.code === "request_timeout") {
        return NextResponse.json({ error: t(locale, "error.scan_timeout") }, { status: 504 });
      }
      if (err.code === "connection_failed" || err.code === "too_many_redirects") {
        return NextResponse.json({ error: t(locale, "error.scan_unreachable") }, { status: 422 });
      }
      return NextResponse.json({ error: t(locale, `error.${err.code}` as MessageKey) }, { status: 400 });
    }
    console.error("Scan failed", err);
    return NextResponse.json({ error: t(locale, "error.unexpected") }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const locale = getLocaleFromRequest(req);
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number.parseInt(limitParam ?? "10", 10) || 10, 1), 50);

  try {
    const scans = await prisma.scan.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, url: true, score: true, createdAt: true, httpsStatus: true, headersStatus: true },
    });
    return NextResponse.json({ scans }, { status: 200 });
  } catch (err) {
    console.error("Failed to list scans", err);
    return NextResponse.json({ error: t(locale, "error.history_load_failed") }, { status: 500 });
  }
}
