import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiRole(["owner", "petugas"]);
  if (error) return error;

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
