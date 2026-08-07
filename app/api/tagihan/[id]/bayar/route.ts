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

  // Kalau ada sesi bayar (token) yang masih hidup dan siswa gak minta baru,
  // reuse token itu daripada bikin transaksi baru ke Midtrans tiap klik.
  // Ini yang benerin bug "spam Bayar Sekarang generate timeout baru terus".
  const pendingTerakhir = await prisma.pembayaran.findFirst({
    where: { tagihanSppId: tagihan.id, status: "pending" },
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

  // Kalau user eksplisit minta transaksi baru (ganti metode bayar), cancel
  // dulu transaksi pending lama ke Midtrans sebelum bikin yang baru.
  if (paksaBaru && pendingTerakhir) {
    await batalkanTransaksiMidtrans(pendingTerakhir.orderId);
  }

  // Buat Order ID unik (TagihanID + Timestamp)
  const orderId = `SPP-${tagihan.id}-${Date.now()}`;

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
    // Kontrol eksplisit berapa lama sesi bayar ini valid, biar konsisten
    // (bukan default Midtrans yang gak jelas). Catatan: channel QRIS punya
    // batas sendiri dari jaringan QRIS nasional, gak selalu ikut ini.
    custom_expiry: {
      expiry_duration: SESI_BAYAR_EXPIRY_JAM,
      unit: "hour",
    },
  };

  try {
    const transaction = await snap.createTransaction(parameter);

    // Tandai pending lama punya tagihan ini sebagai "expired" & simpan
    // record pembayaran baru DALAM SATU TRANSAKSI DB — dan cuma dijalankan
    // SETELAH createTransaction ke Midtrans di atas dipastikan berhasil.
    //
    // Dulu updateMany "expired" ini jalan SEBELUM snap.createTransaction(),
    // sebagai langkah persiapan. Bug: kalau Midtrans API lagi down/timeout
    // saat createTransaction dipanggil, sesi bayar lama yang masih valid
    // sudah kadung di-expire duluan — siswa kehilangan DUA-DUANYA (sesi lama
    // hangus, sesi baru gagal dibuat), padahal sebelum klik dia masih punya
    // sesi bayar yang sah. Sekarang expire-nya jadi bagian dari hasil sukses,
    // bukan persiapan di depan.
    await prisma.$transaction([
      prisma.pembayaran.updateMany({
        where: { tagihanSppId: tagihan.id, status: "pending" },
        data: { status: "expired" },
      }),
      prisma.pembayaran.create({
        data: {
          tagihanSppId: tagihan.id,
          siswaId: tagihan.siswaId,
          orderId: orderId,
          jumlah: tagihan.nominal,
          metode: "midtrans",
          status: "pending",
          rawResponse: { token: transaction.token, redirect_url: transaction.redirect_url, clientKey, isProd },
        },
      }),
    ]);

    return NextResponse.json({ token: transaction.token, clientKey, isProd, reused: false });
  } catch (err: any) {
    console.error("Midtrans error:", err);
    return NextResponse.json({ error: "Gagal membuat transaksi ke Midtrans" }, { status: 500 });
  }
}
