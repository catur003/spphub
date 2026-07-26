import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const kategori = searchParams.get("kategori") || "";

    const where: any = {};
    if (kategori) where.kategori = kategori;
    if (q) {
      where.OR = [
        { judul: { contains: q } },
        { keterangan: { contains: q } },
        { penanggungJawab: { contains: q } },
      ];
    }

    const list = await prisma.pengeluaran.findMany({
      where,
      orderBy: { tanggal: "desc" },
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("[GET /api/pengeluaran] Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data pengeluaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const { judul, kategori, nominal, tanggal, penanggungJawab, buktiUrl, keterangan } = body;

    if (!judul || !nominal || Number(nominal) <= 0) {
      return NextResponse.json({ error: "Judul dan nominal wajib diisi dan lebih besar dari 0" }, { status: 400 });
    }

    const item = await prisma.pengeluaran.create({
      data: {
        judul: String(judul).trim(),
        kategori: kategori || "Lain-lain",
        nominal: Number(nominal),
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        penanggungJawab: penanggungJawab ? String(penanggungJawab).trim() : session.user.name || null,
        buktiUrl: buktiUrl || null,
        keterangan: keterangan ? String(keterangan).trim() : null,
      },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("[POST /api/pengeluaran] Error:", error);
    return NextResponse.json({ error: "Gagal menambah data pengeluaran: " + error.message }, { status: 500 });
  }
}
