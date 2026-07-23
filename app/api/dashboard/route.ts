import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const awalBulanIni = new Date(currentYear, currentMonth - 1, 1);
    const enamBulanLalu = new Date(currentYear, now.getMonth() - 5, 1);
    enamBulanLalu.setHours(0, 0, 0, 0);

    // Run all queries in parallel
    const [
      totalSiswa,
      siswaBaruBulanIni,
      tagihanBulanIni,
      siswaSudahAdaTagihanCount,
      pembayaran6Bulan,
      transaksiTerbaru,
      notifikasiPenting,
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
    ]);

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
      const d = new Date(currentYear, now.getMonth() - i, 1);
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

    // Cache for 60 seconds, stale-while-revalidate 120s (real-time enough for dashboard)
    response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
    return response;
  } catch (error: any) {
    console.error("[GET /api/dashboard] Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data dashboard: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
