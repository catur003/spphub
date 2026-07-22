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

    // 1. Total Siswa Aktif
    const totalSiswa = await prisma.siswa.count({ where: { status: "aktif" } });

    // 2. Siswa Baru Bulan Ini
    const awalBulanIni = new Date(currentYear, currentMonth - 1, 1);
    const siswaBaruBulanIni = await prisma.siswa.count({
      where: { createdAt: { gte: awalBulanIni } },
    });

    // 3. Data Tagihan Bulan Ini
    const tagihanBulanIni = await prisma.tagihanSpp.findMany({
      where: { bulan: currentMonth, tahun: currentYear },
    });

    const pendapatanBulanIni = tagihanBulanIni
      .filter((t) => t.status === "lunas")
      .reduce((acc, curr) => acc + curr.nominal, 0);

    const tunggakanBulanIni = tagihanBulanIni
      .filter((t) => t.status === "belum_bayar" || t.status === "terlambat")
      .reduce((acc, curr) => acc + curr.nominal, 0);

    // 4. Jumlah Siswa Aktif yang Tagihannya Belum Dibuat Bulan Ini
    const siswaSudahAdaTagihanCount = await prisma.tagihanSpp.count({
      where: { bulan: currentMonth, tahun: currentYear, siswa: { status: "aktif" } },
    });
    const jumlahTagihanBelumDibuat = Math.max(0, totalSiswa - siswaSudahAdaTagihanCount);

    // 5. Chart Data: Rasio Status Tagihan Bulan Ini
    const lunasCount = tagihanBulanIni.filter((t) => t.status === "lunas").length;
    const belumCount = tagihanBulanIni.filter((t) => t.status === "belum_bayar").length;
    const terlambatCount = tagihanBulanIni.filter((t) => t.status === "terlambat").length;
    const pieChartData = [
      { name: "Lunas", value: lunasCount, color: "#10b981" },
      { name: "Belum Bayar", value: belumCount, color: "#f59e0b" },
      { name: "Terlambat", value: terlambatCount, color: "#ef4444" },
    ];

    // 6. Chart Data: Pemasukan 6 Bulan Terakhir
    const enamBulanLalu = new Date();
    enamBulanLalu.setMonth(now.getMonth() - 5);
    enamBulanLalu.setDate(1);
    enamBulanLalu.setHours(0, 0, 0, 0);

    const pembayaran6Bulan = await prisma.pembayaran.findMany({
      where: {
        status: "success",
        paidAt: { gte: enamBulanLalu },
      },
      select: { jumlah: true, paidAt: true },
    });

    const barChartMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      barChartMap[`${yyyy}-${mm}`] = 0;
    }

    pembayaran6Bulan.forEach((p) => {
      if (!p.paidAt) return;
      const mm = String(p.paidAt.getMonth() + 1).padStart(2, "0");
      const yyyy = p.paidAt.getFullYear();
      const key = `${yyyy}-${mm}`;
      if (barChartMap[key] !== undefined) {
        barChartMap[key] += p.jumlah;
      }
    });

    const BULAN_LABEL_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const barChartData = Object.keys(barChartMap).map((key) => {
      const [y, m] = key.split("-");
      return {
        name: `${BULAN_LABEL_SHORT[parseInt(m)]} ${y}`,
        total: barChartMap[key],
      };
    });

    // 7. Transaksi Terakhir
    const transaksiTerbaru = await prisma.tagihanSpp.findMany({
      where: { status: "lunas" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        siswa: { select: { namaLengkap: true, kelas: { select: { namaKelas: true } } } },
      },
    });

    // 8. Notifikasi / Pengumuman Penting Terbaru
    const notifikasiPenting = await prisma.pengumuman.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    return NextResponse.json({
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
  } catch (error: any) {
    console.error("[GET /api/dashboard] Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data dashboard: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
