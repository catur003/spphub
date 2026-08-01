import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireApiRole(["owner", "petugas"]);
  if (error) return error;

  try {
    const jenis = await prisma.jenisTagihanLain.findMany({
      orderBy: { nama: "asc" },
    });

    const res = NextResponse.json(jenis);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: any) {
    console.error("[GET /api/tagihan-lain/jenis] Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat jenis tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const { nama, nominalDefault } = body;

    if (!nama || typeof nama !== "string" || !nama.trim()) {
      return NextResponse.json({ error: "Nama jenis tagihan wajib diisi" }, { status: 400 });
    }

    const jenis = await prisma.jenisTagihanLain.create({
      data: {
        nama: nama.trim(),
        nominalDefault: Number(nominalDefault) || 0,
      },
    });

    return NextResponse.json(jenis, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/tagihan-lain/jenis] Error:", error);
    return NextResponse.json(
      { error: "Gagal membuat jenis tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
