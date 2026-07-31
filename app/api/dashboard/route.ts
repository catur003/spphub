import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET() {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
  if (error) return error;

    const now = new Date();
    // PENTING: jangan pakai now.getMonth()/getFullYear() langsung. Method itu
    // baca timezone SERVER (kalau di-hosting kayak Railway, defaultnya UTC),
    // sedangkan form "Generate Tagihan" di app/admin/tagihan/page.tsx pakai
    // new Date() di BROWSER admin (otomatis WIB/Asia-Jakarta). Beda ~7 jam
    // ini bikin bulan yang dicek dashboard (UTC) vs bulan yang beneran
    // di-generate (WIB) bisa gak sinkron di sekitar jam 00.00-07.00 WIB —
    // efeknya "Pengingat tagihan belum dibuat" gak ilang walau tagihan buat
    // bulan itu (versi WIB) udah lengkap dibuat. Dikunci eksplisit ke
    // Asia/Jakarta biar konsisten sama browser admin.
    const jakartaParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "numeric",
    }).formatToParts(now);
    const currentMonth = Number(jakartaParts.find((p) => p.type === "month")!.value);
    const currentYear = Number(jakartaParts.find((p) => p.type === "year")!.value);
    // Dikonstruksi sebagai instant UTC yang collay sama "00:00 WIB tanggal 1"
    // (WIB = UTC+7, jadi 00:00 WIB = 17:00 UTC hari sebelumnya) — konsisten
    // sama currentMonth/currentYear di atas yang udah dikunci Asia/Jakarta.
    const awalBulanIni = new Date(Date.UTC(currentYear, currentMonth - 1, 1, -7, 0, 0));
    const enamBulanLaluBase = new Date(Date.UTC(currentYear, currentMonth - 1 - 5, 1, -7, 0, 0));
    const enamBulanLalu = enamBulanLaluBase;

    // Parallel queries including financial modules
    const [
      totalSiswa,
      siswaBaruBulanIni,
      tagihanBulanIni,
      siswaSudahAdaTagihanCount,
      pembayaran6Bulan,
      transaksiTerbaru,
      notifikasiPenting,
      sppLunasAll,
      pendapatanLainAll,
      pengeluaranAll,
      tunggakanGrouped,
      utangAgg,
    ] = await Promise.all([
      prisma.siswa.count({ where: { status: "aktif" } }),
      prisma.siswa.count({ where: { createdAt: { gte: awalBulanIni } } }),
      prisma.tagihanSpp.findMany({
        where: { bulan: currentMonth, tahun: currentYear },
        select: { status: true, nominal: true },
      }),
      prisma.tagihanSpp.count({
        where: { bulan: currentMonth, tahun: currentYear, siswa: { status: "aktif" } },
      }),
      prisma.pembayaran.findMany({
        where: { status: "success", paidAt: { gte: enamBulanLalu } },
        select: { jumlah: true, paidAt: true },
      }),
      prisma.tagihanSpp.findMany({
        where: { status: "lunas" },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          nominal: true,
          bulan: true,
          tahun: true,
          updatedAt: true,
          siswa: { select: { namaLengkap: true, kelas: { select: { namaKelas: true } } } },
        },
      }),
      prisma.pengumuman.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, judul: true, isi: true, createdAt: true },
      }),
      prisma.tagihanSpp.aggregate({
        where: { status: "lunas" },
        _sum: { nominal: true },
      }),
      prisma.pendapatanLain.aggregate({
        _sum: { nominal: true },
      }),
      prisma.pengeluaran.aggregate({
        _sum: { nominal: true },
      }),
      // Dulu ini findMany narik SEMUA baris tagihan belum lunas cuma buat
      // di-reduce manual di JS. Sekarang groupBy per siswa langsung dari DB
      // -> hasilnya cuma 1 baris per siswa yang nunggak, bukan 1 baris per tagihan.
      prisma.tagihanSpp.groupBy({
        by: ["siswaId"],
        where: { status: { in: ["belum_bayar", "terlambat"] } },
        _sum: { nominal: true },
      }),
      // Sama, ganti findMany+reduce jadi aggregate langsung dari DB.
      prisma.utangPegawai.aggregate({
        where: { status: "aktif" },
        _sum: { nominalPinjaman: true, nominalTerbayar: true },
        _count: true,
      }),
    ]);

    const totalSppLunas = sppLunasAll._sum.nominal || 0;
    const totalPendapatanLain = pendapatanLainAll._sum.nominal || 0;
    const totalPengeluaran = pengeluaranAll._sum.nominal || 0;

    const totalPemasukan = totalSppLunas + totalPendapatanLain;
    const saldoKas = totalPemasukan - totalPengeluaran;
    const labaRugi = totalPemasukan - totalPengeluaran;

    const sppBelumDibayarTotal = tunggakanGrouped.reduce((acc, g) => acc + (g._sum.nominal || 0), 0);
    const sppBelumDibayarCount = tunggakanGrouped.length;

    const utangPegawaiTotal = Math.max(
      0,
      (utangAgg._sum.nominalPinjaman || 0) - (utangAgg._sum.nominalTerbayar || 0)
    );
    const utangPegawaiCount = utangAgg._count;

    const pendapatanBulanIni = tagihanBulanIni
      .filter((t) => t.status === "lunas")
      .reduce((acc, curr) => acc + curr.nominal, 0);

    const tunggakanBulanIni = tagihanBulanIni
      .filter((t) => t.status === "belum_bayar" || t.status === "terlambat")
      .reduce((acc, curr) => acc + curr.nominal, 0);

    const jumlahTagihanBelumDibuat = Math.max(0, totalSiswa - siswaSudahAdaTagihanCount);

    const lunasCount = tagihanBulanIni.filter((t) => t.status === "lunas").length;
    const belumCount = tagihanBulanIni.filter((t) => t.status === "belum_bayar").length;
    const terlambatCount = tagihanBulanIni.filter((t) => t.status === "terlambat").length;
    const pieChartData = [
      { name: "Lunas", value: lunasCount, color: "#10b981" },
      { name: "Belum Bayar", value: belumCount, color: "#f59e0b" },
      { name: "Terlambat", value: terlambatCount, color: "#ef4444" },
    ];

    const BULAN_LABEL_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const barChartMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      barChartMap[`${d.getFullYear()}-${mm}`] = 0;
    }
    pembayaran6Bulan.forEach((p) => {
      if (!p.paidAt) return;
      const mm = String(p.paidAt.getMonth() + 1).padStart(2, "0");
      const key = `${p.paidAt.getFullYear()}-${mm}`;
      if (barChartMap[key] !== undefined) barChartMap[key] += p.jumlah;
    });
    const barChartData = Object.keys(barChartMap).map((key) => {
      const [y, m] = key.split("-");
      return { name: `${BULAN_LABEL_SHORT[parseInt(m)]} ${y}`, total: barChartMap[key] };
    });

    const response = NextResponse.json({
      saldoKas,
      labaRugi,
      sppBelumDibayarTotal,
      sppBelumDibayarCount,
      utangPegawaiTotal,
      utangPegawaiCount,
      totalSiswa,
      siswaBaruBulanIni,
      pendapatanBulanIni,
      tunggakanBulanIni,
      jumlahTagihanBelumDibuat,
      transaksiTerbaru,
      pieChartData,
      barChartData,
      notifikasiPenting,
      bulan: currentMonth,
      tahun: currentYear,
    });

    // Diperpendek dari 60s -> 5s. Dashboard sering dibuka lagi setelah owner
    // barusan generate tagihan/verifikasi bayar; 60 detik kelamaan buat angka
    // ringkasan kelihatan basi.
    response.headers.set("Cache-Control", "private, max-age=5, stale-while-revalidate=10");
    return response;
  } catch (error: any) {
    console.error("[GET /api/dashboard] Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data dashboard: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
