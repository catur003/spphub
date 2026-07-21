import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const bulan = searchParams.get("bulan");
  const tahun = searchParams.get("tahun");

  const tagihan = await prisma.tagihanSpp.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(bulan ? { bulan: Number(bulan) } : {}),
      ...(tahun ? { tahun: Number(tahun) } : {}),
    },
    include: { siswa: { select: { namaLengkap: true, nis: true } } },
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    take: 200,
  });

  return NextResponse.json(tagihan);
}
