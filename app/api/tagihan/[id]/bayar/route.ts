import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSnapClient } from "@/lib/midtrans";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "siswa") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Pastikan tagihan ini emang punya siswa yang lagi login (bukan siswa lain)
  const siswa = await prisma.siswa.findUnique({ where: { akunId: session.user.id } });
  if (!siswa) {
    return NextResponse.json({ error: "Akun ini belum terhubung ke data siswa" }, { status: 400 });
  }

  const tagihan = await prisma.tagihanSpp.findUnique({ where: { id } });
  if (!tagihan || tagihan.siswaId !== siswa.id) {
    return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  }
  if (tagihan.status === "lunas") {
    return NextResponse.json({ error: "Tagihan ini udah lunas" }, { status: 400 });
  }
  if (tagihan.status === "menunggu_verifikasi") {
    return NextResponse.json(
      { error: "Tagihan ini lagi diverifikasi petugas, tunggu sebentar ya" },
      { status: 400 }
    );
  }

  let snap, clientKey, isProduction;
  try {
    ({ snap, clientKey, isProduction } = await getSnapClient());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const orderId = `SPP-${tagihan.id}-${Date.now()}`;

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: tagihan.nominal,
    },
    customer_details: {
      first_name: siswa.namaLengkap,
    },
    item_details: [
      {
        id: tagihan.id,
        price: tagihan.nominal,
        quantity: 1,
        name: `SPP ${tagihan.bulan}/${tagihan.tahun}`.slice(0, 50),
      },
    ],
  };

  let transaction;
  try {
    transaction = await snap.createTransaction(parameter);
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal membuat transaksi Midtrans: " + (e as Error).message },
      { status: 502 }
    );
  }

  await prisma.pembayaran.create({
    data: {
      tagihanSppId: tagihan.id,
      siswaId: siswa.id,
      orderId,
      jumlah: tagihan.nominal,
      metode: "midtrans_snap",
      status: "pending",
      rawResponse: transaction,
    },
  });

  return NextResponse.json({
    tagihanId: tagihan.id,
    snapToken: transaction.token,
    clientKey,
    isProduction,
  });
}
