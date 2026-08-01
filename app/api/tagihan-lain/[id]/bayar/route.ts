import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSnapClient } from "@/lib/midtrans";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "siswa") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const tagihan = await prisma.tagihanLain.findUnique({
    where: { id },
    include: { siswa: { include: { akun: true } }, jenisTagihanLain: true },
  });

  if (!tagihan) {
    return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  }

  if (tagihan.siswa.akun?.id !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (tagihan.status === "lunas" || tagihan.status === "menunggu_verifikasi") {
    return NextResponse.json({ error: "Tagihan ini tidak bisa dibayar (sudah lunas / proses)" }, { status: 400 });
  }

  let snap, clientKey, isProd;
  try {
    ({ snap, clientKey, isProduction: isProd } = await getSnapClient());
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Sistem pembayaran belum dikonfigurasi admin" }, { status: 500 });
  }

  // Sama seperti alur SPP: tandai pending lama punya tagihan ini sebagai
  // "expired" dulu sebelum bikin transaksi baru, biar gak numpuk row yatim.
  await prisma.pembayaranLain.updateMany({
    where: { tagihanLainId: tagihan.id, status: "pending" },
    data: { status: "expired" },
  });

  const orderId = `LAIN-${tagihan.id}-${Date.now()}`;

  await prisma.pembayaranLain.create({
    data: {
      tagihanLainId: tagihan.id,
      siswaId: tagihan.siswaId,
      orderId,
      jumlah: tagihan.nominal,
      metode: "midtrans",
      status: "pending",
    },
  });

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: tagihan.nominal,
    },
    customer_details: {
      first_name: tagihan.siswa.namaLengkap,
      email: tagihan.siswa.akun?.email || "",
    },
    item_details: [
      {
        id: tagihan.id,
        price: tagihan.nominal,
        quantity: 1,
        name: tagihan.jenisTagihanLain.nama,
      },
    ],
  };

  try {
    const transaction = await snap.createTransaction(parameter);
    return NextResponse.json({ token: transaction.token, clientKey, isProd });
  } catch (err: any) {
    console.error("Midtrans error:", err);
    return NextResponse.json({ error: "Gagal membuat transaksi ke Midtrans" }, { status: 500 });
  }
}
