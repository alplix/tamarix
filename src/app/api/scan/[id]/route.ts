import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";
import { t } from "@/lib/i18n/translate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const locale = getLocaleFromRequest(req);
  const { id } = await params;

  try {
    const scan = await prisma.scan.findUnique({
      where: { id },
      include: { findings: true },
    });

    if (!scan) {
      return NextResponse.json({ error: t(locale, "error.scan_not_found") }, { status: 404 });
    }

    return NextResponse.json({ scan }, { status: 200 });
  } catch (err) {
    console.error("Failed to load scan", err);
    return NextResponse.json({ error: t(locale, "error.scan_load_failed") }, { status: 500 });
  }
}
