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

  // 3. Transaksi Terakhir (Ambil dari Tagihan yang lunas baru-baru ini atau Pembayaran)
  // Untuk kesederhanaan, ambil dari TagihanSpp yang lunas, diurutkan by updatedAt
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
    bulan: currentMonth,
    tahun: currentYear,
  });
}
