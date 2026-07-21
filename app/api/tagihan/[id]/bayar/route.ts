import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
// @ts-ignore
import midtransClient from "midtrans-client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "siswa") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const tagihan = await prisma.tagihanSpp.findUnique({
    where: { id },
    include: { siswa: { include: { akun: true } } },
  });

  if (!tagihan) {
    return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  }

  // Cek apakah ini benar tagihan milik siswa yang sedang login
  if (tagihan.siswa.akun?.id !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (tagihan.status === "lunas" || tagihan.status === "menunggu_verifikasi") {
    return NextResponse.json({ error: "Tagihan ini tidak bisa dibayar (sudah lunas / proses)" }, { status: 400 });
  }

  // Ambil pengaturan payment
  const settings = await prisma.pengaturanPembayaran.findFirst();
  if (!settings) {
    return NextResponse.json({ error: "Sistem pembayaran belum dikonfigurasi admin" }, { status: 500 });
  }

  const isProd = settings.environment === "production";
  const serverKey = isProd ? settings.productionServerKey : settings.sandboxServerKey;
  const clientKey = isProd ? settings.productionClientKey : settings.sandboxClientKey;

  if (!serverKey || !clientKey) {
    return NextResponse.json({ error: "API Key Midtrans belum dikonfigurasi admin" }, { status: 500 });
  }

  const snap = new midtransClient.Snap({
    isProduction: isProd,
    serverKey: serverKey,
    clientKey: clientKey,
  });

  // Buat Order ID unik (TagihanID + Timestamp)
  const orderId = `SPP-${tagihan.id}-${Date.now()}`;

  // Simpan record pembayaran pending ke DB
  await prisma.pembayaran.create({
    data: {
      tagihanSppId: tagihan.id,
      siswaId: tagihan.siswaId,
      orderId: orderId,
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
        name: `SPP Bulan ${tagihan.bulan} / ${tagihan.tahun}`,
      },
    ],
  };

  try {
    const transaction = await snap.createTransaction(parameter);
    return NextResponse.json({ token: transaction.token, clientKey });
  } catch (err: any) {
    console.error("Midtrans error:", err);
    return NextResponse.json({ error: "Gagal membuat transaksi ke Midtrans" }, { status: 500 });
  }
}
