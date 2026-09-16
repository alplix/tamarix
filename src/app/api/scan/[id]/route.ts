import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const scan = await prisma.scan.findUnique({
      where: { id },
      include: { findings: true },
    });

    if (!scan) {
      return NextResponse.json({ error: "Tarama bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ scan }, { status: 200 });
  } catch (err) {
    console.error("Failed to load scan", err);
    return NextResponse.json({ error: "Tarama yüklenemedi." }, { status: 500 });
  }
}
