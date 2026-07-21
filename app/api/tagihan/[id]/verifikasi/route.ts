import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const tagihan = await prisma.tagihanSpp.findUnique({ where: { id } });
  if (!tagihan) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  if (tagihan.status === "lunas") {
    return NextResponse.json({ error: "Tagihan ini udah lunas" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.pembayaran.create({
      data: {
        tagihanSppId: id,
        siswaId: tagihan.siswaId,
        orderId: `MANUAL-${id}-${Date.now()}`,
        jumlah: tagihan.nominal,
        metode: body.metode || "transfer_bank",
        status: "success",
        paidAt: new Date(),
      },
    }),
    prisma.tagihanSpp.update({
      where: { id },
      data: { status: "lunas" },
    }),
  ]);

  return NextResponse.json({ success: true });
}
