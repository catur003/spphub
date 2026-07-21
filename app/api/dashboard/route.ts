import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Total Siswa
  const totalSiswa = await prisma.siswa.count({ where: { status: "aktif" } });

  // 2. Data Bulan Ini (Tagihan Spp)
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const tagihanBulanIni = await prisma.tagihanSpp.findMany({
    where: { bulan: currentMonth, tahun: currentYear },
  });

  const pendapatanBulanIni = tagihanBulanIni
    .filter(t => t.status === "lunas")
    .reduce((acc, curr) => acc + curr.nominal, 0);

  const tunggakanBulanIni = tagihanBulanIni
    .filter(t => t.status === "belum_bayar" || t.status === "terlambat")
    .reduce((acc, curr) => acc + curr.nominal, 0);

  // 3. Chart Data: Rasio Status Tagihan Bulan Ini
  const lunasCount = tagihanBulanIni.filter(t => t.status === "lunas").length;
  const belumCount = tagihanBulanIni.filter(t => t.status === "belum_bayar").length;
  const terlambatCount = tagihanBulanIni.filter(t => t.status === "terlambat").length;
  const pieChartData = [
    { name: "Lunas", value: lunasCount, color: "#10b981" },
    { name: "Belum Bayar", value: belumCount, color: "#f59e0b" },
    { name: "Terlambat", value: terlambatCount, color: "#ef4444" },
  ];

  // 4. Chart Data: Pemasukan 6 Bulan Terakhir
  // Kita fetch data dari Pembayaran (karena lebih valid berdasarkan tanggal bayar)
  const enamBulanLalu = new Date();
  enamBulanLalu.setMonth(now.getMonth() - 5);
  enamBulanLalu.setDate(1);
  enamBulanLalu.setHours(0,0,0,0);

  const pembayaran6Bulan = await prisma.pembayaran.findMany({
    where: { 
      status: "success",
      paidAt: { gte: enamBulanLalu }
    },
    select: { jumlah: true, paidAt: true }
  });

  const barChartMap: Record<string, number> = {};
  for(let i=5; i>=0; i--) {
    const d = new Date();
    d.setMonth(now.getMonth() - i);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    barChartMap[`${yyyy}-${mm}`] = 0;
  }

  pembayaran6Bulan.forEach(p => {
    if(!p.paidAt) return;
    const mm = String(p.paidAt.getMonth() + 1).padStart(2, '0');
    const yyyy = p.paidAt.getFullYear();
    const key = `${yyyy}-${mm}`;
    if(barChartMap[key] !== undefined) {
      barChartMap[key] += p.jumlah;
    }
  });

  const BULAN_LABEL_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const barChartData = Object.keys(barChartMap).map(key => {
    const [y, m] = key.split("-");
    return {
      name: `${BULAN_LABEL_SHORT[parseInt(m)]} ${y}`,
      total: barChartMap[key]
    };
  });

  // 5. Transaksi Terakhir (Ambil dari Tagihan yang lunas baru-baru ini)
  const transaksiTerbaru = await prisma.tagihanSpp.findMany({
    where: { status: "lunas" },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: {
      siswa: { select: { namaLengkap: true, kelas: { select: { namaKelas: true } } } },
    }
  });

  return NextResponse.json({
    totalSiswa,
    pendapatanBulanIni,
    tunggakanBulanIni,
    transaksiTerbaru,
    pieChartData,
    barChartData,
    bulan: currentMonth,
    tahun: currentYear,
  });
}
