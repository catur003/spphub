import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

/** Batas atas jumlah baris detail yang dikirim dalam satu respons laporan.
 *  Angka ringkasan tetap dihitung dari SELURUH data lewat groupBy, jadi
 *  pembatasan ini cuma memotong tabel detailnya, bukan totalnya. */
const MAKS_BARIS_LAPORAN = 2000;

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get("bulan");
    const tahun = searchParams.get("tahun");
    const kelasId = searchParams.get("kelasId");
    const tingkat = searchParams.get("tingkat");
    const status = searchParams.get("status");
    const q = searchParams.get("q") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {
      ...(bulan ? { bulan: Number(bulan) } : {}),
      ...(tahun ? { tahun: Number(tahun) } : {}),
      ...(status ? { status: status as never } : {}),
      ...(kelasId
        ? { siswa: { kelasId } }
        : tingkat
        ? { siswa: { kelas: { tingkat: Number(tingkat) } } }
        : {}),
    };

    if (q) {
      where.siswa = {
        ...(where.siswa || {}),
        OR: [
          { namaLengkap: { contains: q } },
          { nis: { contains: q } },
          { nisn: { contains: q } },
        ],
      };
    }

    if (startDate || endDate) {
      where.jatuhTempo = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate + "T23:59:59.999Z") } : {}),
      };
    }

    // Ringkasan dihitung di DB lewat groupBy, BUKAN dengan me-reduce array
    // hasil findMany. Dua alasan: (1) totalnya tetap benar walaupun daftar
    // barisnya dibatasi, (2) gak perlu narik puluhan ribu row ke memori cuma
    // buat dijumlahkan.
    const perStatus = await prisma.tagihanSpp.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
      _sum: { nominal: true },
    });

    const ringkasan = perStatus.reduce(
      (acc, grup) => {
        const jumlah = grup._count._all;
        const nominal = grup._sum.nominal || 0;
        acc.totalTagihan += jumlah;
        acc.totalNominal += nominal;
        if (grup.status === "lunas") {
          acc.totalLunas += jumlah;
          acc.nominalLunas += nominal;
        } else {
          acc.totalBelumLunas += jumlah;
          acc.nominalBelumLunas += nominal;
        }
        return acc;
      },
      { totalTagihan: 0, totalNominal: 0, totalLunas: 0, nominalLunas: 0, totalBelumLunas: 0, nominalBelumLunas: 0 }
    );

    // Dulu findMany di sini gak punya `take` sama sekali — sekolah dengan 300
    // siswa × 12 bulan udah 3.600 row, tiap row bawa relasi siswa + kelas +
    // pembayaran, semuanya dikirim dalam satu JSON. Sekarang dibatasi, dan
    // kalau kepotong, frontend dikasih tau lewat flag `terpotong` biar bisa
    // nyaranin user mempersempit filternya.
    const daftar = await prisma.tagihanSpp.findMany({
      where,
      include: {
        siswa: { select: { namaLengkap: true, nis: true, nisn: true, kelas: true } },
        pembayaran: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      take: MAKS_BARIS_LAPORAN,
    });

    return NextResponse.json({
      ringkasan,
      daftar,
      terpotong: ringkasan.totalTagihan > daftar.length,
      maksBaris: MAKS_BARIS_LAPORAN,
    });
  } catch (error: any) {
    console.error("[GET /api/laporan] Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat laporan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
