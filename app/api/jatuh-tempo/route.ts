import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

const JENIS_VALID = ["spp", "lainnya"];

export async function GET(req: NextRequest) {
  const { error } = await requireApiRole(["owner", "petugas"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const jenis = searchParams.get("jenis") || undefined;
  const tahunAjaranId = searchParams.get("tahunAjaranId") || undefined;

  try {
    const preset = await prisma.jatuhTempoPreset.findMany({
      where: {
        ...(jenis ? { jenis: jenis as never } : {}),
        ...(tahunAjaranId ? { tahunAjaranId } : {}),
      },
      include: { tahunAjaran: { select: { id: true, nama: true, aktif: true } } },
      orderBy: { tanggal: "asc" },
    });

    const res = NextResponse.json(preset);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: any) {
    console.error("[GET /api/jatuh-tempo] Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat preset jatuh tempo: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const { nama, tanggal, jenis, tahunAjaranId } = body;

    if (!nama || typeof nama !== "string" || !nama.trim()) {
      return NextResponse.json({ error: "Nama preset wajib diisi" }, { status: 400 });
    }
    if (!tanggal) {
      return NextResponse.json({ error: "Tanggal jatuh tempo wajib diisi" }, { status: 400 });
    }
    if (!jenis || !JENIS_VALID.includes(jenis)) {
      return NextResponse.json(
        { error: `jenis tidak valid. Pilihan: ${JENIS_VALID.join(", ")}` },
        { status: 400 }
      );
    }
    if (!tahunAjaranId) {
      return NextResponse.json({ error: "Tahun ajaran wajib dipilih" }, { status: 400 });
    }

    const preset = await prisma.jatuhTempoPreset.create({
      data: {
        nama: nama.trim(),
        tanggal: new Date(tanggal),
        jenis,
        tahunAjaranId,
      },
      include: { tahunAjaran: { select: { id: true, nama: true, aktif: true } } },
    });

    return NextResponse.json(preset, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/jatuh-tempo] Error:", error);
    return NextResponse.json(
      { error: "Gagal membuat preset jatuh tempo: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
