import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";
import { performScan, ScanTimeoutError, ScanUnreachableError, UnsafeUrlError } from "@/lib/scan-service";

export const dynamic = "force-dynamic";

function clientKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  const key = clientKey(req);
  if (isRateLimited(key)) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const url = typeof (body as { url?: unknown })?.url === "string" ? (body as { url: string }).url.trim() : null;
  const force = Boolean((body as { force?: unknown })?.force);

  if (!url) {
    return NextResponse.json({ error: "Bir website URL'si girin." }, { status: 400 });
  }

  try {
    const { scan, cached } = await performScan(url, force);
    return NextResponse.json({ scan, cached }, { status: 200 });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ScanTimeoutError) {
      return NextResponse.json({ error: "Site zaman aşımına uğradı, lütfen daha sonra tekrar deneyin." }, { status: 504 });
    }
    if (err instanceof ScanUnreachableError) {
      return NextResponse.json({ error: "Siteye erişilemedi. Adresi kontrol edip tekrar deneyin." }, { status: 422 });
    }
    console.error("Scan failed", err);
    return NextResponse.json({ error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
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
    return NextResponse.json({ error: "Geçmiş taramalar yüklenemedi." }, { status: 500 });
  }
}
