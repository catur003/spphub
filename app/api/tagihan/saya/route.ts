import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "siswa") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const siswa = await prisma.siswa.findUnique({ where: { akunId: session.user.id } });
  if (!siswa) {
    return NextResponse.json({ error: "Akun ini belum terhubung ke data siswa" }, { status: 404 });
  }

  const tagihan = await prisma.tagihanSpp.findMany({
    where: { siswaId: siswa.id },
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    include: {
      tahunAjaran: true,
      pembayaran: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json(tagihan);
}
