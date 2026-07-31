import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireApiRole(["owner", "petugas"]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const bulan = searchParams.get("bulan");
  const tahun = searchParams.get("tahun");
  const kelasId = searchParams.get("kelasId") || undefined;
  const tingkat = searchParams.get("tingkat") || undefined;
  const q = searchParams.get("q") || undefined;

  const siswaFilter =
    kelasId
      ? { kelasId }
      : tingkat
      ? { kelas: { tingkat: Number(tingkat) } }
      : undefined;

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
    siswaFilter || qFilter
      ? { ...(siswaFilter || {}), ...(qFilter || {}) }
      : undefined;

  try {
    const tagihan = await prisma.tagihanSpp.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(bulan ? { bulan: Number(bulan) } : {}),
        ...(tahun ? { tahun: Number(tahun) } : {}),
        ...(siswaWhere ? { siswa: siswaWhere } : {}),
      },
      select: {
        id: true,
        bulan: true,
        tahun: true,
        nominal: true,
        status: true,
        jatuhTempo: true,
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
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      take: q ? 50 : 300,
    });

    const res = NextResponse.json(tagihan);
    // no-store: data ini sering berubah (bayar, generate massal, dll) dan
    // di-fetch ulang manual (muatData) tiap kali ada aksi. Cache-Control lama
    // (max-age=15) bikin browser sempet nyuguhin data basi sampai ~15 detik
    // walau fetch ulang udah dipanggil setelah update -> user ngerasa "harus
    // refresh manual".
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: any) {
    console.error("[GET /api/tagihan] error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
