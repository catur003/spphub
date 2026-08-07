import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

// Jaring pengaman terakhir: laporan tanpa filter periode sama sekali bisa
// menarik SELURUH histori tagihan sekolah (semua bulan, semua tahun) dalam
// satu response — 300 siswa x beberapa tahun operasional bisa gampang
// tembus puluhan ribu row lengkap dengan relasi siswa+kelas+pembayaran.
// Cap ini BUKAN pagination (frontend sengaja unbounded biar Export
// CSV/Cetak PDF selalu dapat data lengkap sesuai filter — lihat komentar di
// app/admin/laporan/page.tsx), tapi batas atas mutlak biar satu request
// yang gak sengaja dipanggil tanpa filter (atau filter yang kebetulan
// cocok ke ribuan row) gak bikin response raksasa / membebani DB & network.
const MAKS_ROW_LAPORAN = 5000;

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

    // Hitung total row yang cocok filter DULU (query ringan, cuma COUNT) —
    // biar tahu apakah bakal kepotong cap SEBELUM narik semua kolom+relasi.
    const totalCocok = await prisma.tagihanSpp.count({ where });
    const terpotong = totalCocok > MAKS_ROW_LAPORAN;

    const daftar = await prisma.tagihanSpp.findMany({
      where,
      include: {
        siswa: { select: { namaLengkap: true, nis: true, nisn: true, kelas: true } },
        pembayaran: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      take: MAKS_ROW_LAPORAN,
    });

    // Ringkasan dihitung dari agregat DB langsung (bukan .reduce() di JS
    // atas `daftar` yang bisa kepotong cap) — supaya angka total/nominal
    // di kartu ringkasan TETAP akurat mencerminkan SEMUA row yang cocok
    // filter, walau tabel detail di bawahnya kepotong cap.
    const [agregatSemua, agregatLunas] = await Promise.all([
      prisma.tagihanSpp.aggregate({ where, _count: { _all: true }, _sum: { nominal: true } }),
      prisma.tagihanSpp.aggregate({
        where: { ...where, status: "lunas" },
        _count: { _all: true },
        _sum: { nominal: true },
      }),
    ]);

    const totalTagihan = agregatSemua._count._all;
    const totalNominal = agregatSemua._sum.nominal || 0;
    const totalLunas = agregatLunas._count._all;
    const nominalLunas = agregatLunas._sum.nominal || 0;

    const ringkasan = {
      totalTagihan,
      totalNominal,
      totalLunas,
      nominalLunas,
      totalBelumLunas: totalTagihan - totalLunas,
      nominalBelumLunas: totalNominal - nominalLunas,
    };

    return NextResponse.json({
      ringkasan,
      daftar,
      terpotong,
      totalCocok,
      catatan: terpotong
        ? `Menampilkan ${MAKS_ROW_LAPORAN} dari ${totalCocok} data yang cocok filter. Persempit filter (periode/kelas) untuk melihat & mengekspor semuanya.`
        : undefined,
    });
  } catch (error: any) {
    console.error("[GET /api/laporan] Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat laporan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
