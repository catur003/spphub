import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { namaPegawai: { contains: q } },
        { jabatan: { contains: q } },
        { keterangan: { contains: q } },
      ];
    }

    const list = await prisma.utangPegawai.findMany({
      where,
      orderBy: { tanggalPinjam: "desc" },
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("[GET /api/utang-pegawai] Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data utang pegawai" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const { namaPegawai, jabatan, nominalPinjaman, tanggalPinjam, keterangan } = body;

    if (!namaPegawai || !nominalPinjaman || Number(nominalPinjaman) <= 0) {
      return NextResponse.json({ error: "Nama pegawai dan nominal pinjaman wajib diisi" }, { status: 400 });
    }

    const item = await prisma.utangPegawai.create({
      data: {
        namaPegawai: String(namaPegawai).trim(),
        jabatan: jabatan ? String(jabatan).trim() : null,
        nominalPinjaman: Number(nominalPinjaman),
        nominalTerbayar: 0,
        status: "aktif",
        tanggalPinjam: tanggalPinjam ? new Date(tanggalPinjam) : new Date(),
        keterangan: keterangan ? String(keterangan).trim() : null,
      },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("[POST /api/utang-pegawai] Error:", error);
    return NextResponse.json({ error: "Gagal mecatat pinjaman pegawai: " + error.message }, { status: 500 });
  }
}
