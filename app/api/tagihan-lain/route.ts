import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireApiRole(["owner", "petugas"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const jenisTagihanLainId = searchParams.get("jenisTagihanLainId") || undefined;
  const kelasId = searchParams.get("kelasId") || undefined;
  const tahunAjaranId = searchParams.get("tahunAjaranId") || undefined;
  const q = searchParams.get("q") || undefined;

  const siswaFilter = kelasId ? { kelasId } : undefined;

  const qFilter = q
    ? {
        OR: [
          { namaLengkap: { contains: q } },
          { nis: { contains: q } },
          { nisn: { contains: q } },
        ],
      }
    : undefined;

  const siswaWhere =
    siswaFilter || qFilter ? { ...(siswaFilter || {}), ...(qFilter || {}) } : undefined;

  try {
    const tagihan = await prisma.tagihanLain.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(jenisTagihanLainId ? { jenisTagihanLainId } : {}),
        ...(tahunAjaranId ? { tahunAjaranId } : {}),
        ...(siswaWhere ? { siswa: siswaWhere } : {}),
      },
      select: {
        id: true,
        nominal: true,
        status: true,
        jatuhTempo: true,
        keterangan: true,
        createdAt: true,
        jenisTagihanLain: { select: { id: true, nama: true } },
        siswa: {
          select: {
            id: true,
            namaLengkap: true,
            nis: true,
            nisn: true,
            jenisKelamin: true,
            namaWali: true,
            kontakWali: true,
            fotoUrl: true,
            kelas: { select: { id: true, namaKelas: true, tingkat: true, waliKelas: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: q ? 50 : 300,
    });

    const res = NextResponse.json(tagihan);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: any) {
    console.error("[GET /api/tagihan-lain] error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data tagihan lain: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
