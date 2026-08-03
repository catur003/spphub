import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSnapClient, SESI_BAYAR_EXPIRY_JAM, batalkanTransaksiMidtrans } from "@/lib/midtrans";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "siswa") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const paksaBaru = body?.paksaBaru === true;

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

  // Sama seperti alur SPP: reuse token pending yang masih hidup daripada
  // bikin transaksi baru ke Midtrans tiap klik.
  const pendingTerakhir = await prisma.pembayaranLain.findFirst({
    where: { tagihanLainId: tagihan.id, status: "pending" },
    orderBy: { createdAt: "desc" },
  });

  const expiryMs = SESI_BAYAR_EXPIRY_JAM * 60 * 60 * 1000;
  const masihValid =
    pendingTerakhir &&
    Date.now() - new Date(pendingTerakhir.createdAt).getTime() < expiryMs &&
    (pendingTerakhir.rawResponse as any)?.token;

  if (masihValid && !paksaBaru) {
    const cached = pendingTerakhir!.rawResponse as any;
    return NextResponse.json({ token: cached.token, clientKey: cached.clientKey, isProd: cached.isProd, reused: true });
  }

  let snap, clientKey, isProd;
  try {
    ({ snap, clientKey, isProduction: isProd } = await getSnapClient());
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Sistem pembayaran belum dikonfigurasi admin" }, { status: 500 });
  }

  if (paksaBaru && pendingTerakhir) {
    await batalkanTransaksiMidtrans(pendingTerakhir.orderId);
  }

  // Sama seperti alur SPP: tandai pending lama punya tagihan ini sebagai
  // "expired" dulu sebelum bikin transaksi baru, biar gak numpuk row yatim.
  await prisma.pembayaranLain.updateMany({
    where: { tagihanLainId: tagihan.id, status: "pending" },
    data: { status: "expired" },
  });

  const orderId = `LAIN-${tagihan.id}-${Date.now()}`;

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
    custom_expiry: {
      expiry_duration: SESI_BAYAR_EXPIRY_JAM,
      unit: "hour",
    },
  };

  try {
    const transaction = await snap.createTransaction(parameter);

    await prisma.pembayaranLain.create({
      data: {
        tagihanLainId: tagihan.id,
        siswaId: tagihan.siswaId,
        orderId,
        jumlah: tagihan.nominal,
        metode: "midtrans",
        status: "pending",
        rawResponse: { token: transaction.token, redirect_url: transaction.redirect_url, clientKey, isProd },
      },
    });

    return NextResponse.json({ token: transaction.token, clientKey, isProd, reused: false });
  } catch (err: any) {
    console.error("Midtrans error:", err);
    return NextResponse.json({ error: "Gagal membuat transaksi ke Midtrans" }, { status: 500 });
  }
}
