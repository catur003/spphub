import midtransClient from "midtrans-client";
import { prisma } from "./prisma";
import { decrypt, terenkripsi } from "./crypto";

/**
 * Ambil baris PengaturanPembayaran (cuma 1 baris, single-tenant).
 * Kalau belum ada sama sekali, bikin baris default (sandbox, key kosong).
 */
export async function getPengaturanPembayaran() {
  let pengaturan = await prisma.pengaturanPembayaran.findFirst();
  if (!pengaturan) {
    pengaturan = await prisma.pengaturanPembayaran.create({ data: {} });
  }
  return pengaturan;
}

/** Key yang lagi aktif dipakai, sesuai kolom `environment`. */
export function getActiveKeys(pengaturan: {
  environment: "sandbox" | "production";
  sandboxClientKey: string | null;
  sandboxServerKey: string | null;
  productionClientKey: string | null;
  productionServerKey: string | null;
}) {
  const isProd = pengaturan.environment === "production";
  const serverKeyTersimpan = isProd ? pengaturan.productionServerKey : pengaturan.sandboxServerKey;
  const serverKey = decrypt(serverKeyTersimpan);

  // Bedakan "key memang belum diisi" vs "key ADA di DB tapi gagal didekrip"
  // (ENCRYPTION_KEY hilang/berubah). Dua-duanya bikin serverKey null, tapi
  // pesan ke admin harus beda — yang kedua bukan soal belum setup, tapi env
  // var yang kececer waktu redeploy.
  const serverKeyRusak = terenkripsi(serverKeyTersimpan) && serverKey === null;

  return {
    clientKey: isProd ? pengaturan.productionClientKey : pengaturan.sandboxClientKey,
    serverKey,
    serverKeyRusak,
    isProduction: isProd,
  };
}

/** Pesan error yang jelas buat admin, dipakai Snap & CoreApi client. */
function pesanKeyBermasalah(serverKeyRusak: boolean) {
  return serverKeyRusak
    ? "Server Key Midtrans gagal didekrip — ENCRYPTION_KEY kemungkinan berubah/hilang sejak key ini disimpan. Isi ulang ENCRYPTION_KEY yang benar di environment, atau simpan ulang Server Key di halaman Settings."
    : "Payment Settings belum diisi lengkap. Owner perlu isi Client Key & Server Key di halaman Settings.";
}

/** Snap client Midtrans, dibangun dari key aktif di DB. */
export async function getSnapClient() {
  const pengaturan = await getPengaturanPembayaran();
  const { clientKey, serverKey, serverKeyRusak, isProduction } = getActiveKeys(pengaturan);

  if (!serverKey || !clientKey) {
    throw new Error(pesanKeyBermasalah(serverKeyRusak));
  }

  const snap = new midtransClient.Snap({
    isProduction,
    serverKey,
    clientKey,
  });

  return { snap, clientKey, isProduction };
}

/** Berapa lama sesi bayar (Snap token) kita anggap masih valid sebelum
 *  dianggap kadaluarsa dan generate baru diperbolehkan lagi. Dikirim juga
 *  eksplisit ke Midtrans lewat `custom_expiry` biar konsisten (Midtrans
 *  default-nya 24 jam kalau gak diset, tapi channel tertentu kayak QRIS
 *  punya batas sendiri dari jaringan QRIS nasional, di luar kendali kita). */
export const SESI_BAYAR_EXPIRY_JAM = 24;

/** Core API client Midtrans — dipakai buat cancel transaksi pending lama
 * (misal user klik "Ganti Metode Pembayaran") sebelum bikin transaksi baru. */
export async function getCoreApiClient() {
  const pengaturan = await getPengaturanPembayaran();
  const { clientKey, serverKey, serverKeyRusak, isProduction } = getActiveKeys(pengaturan);

  if (!serverKey || !clientKey) {
    throw new Error(pesanKeyBermasalah(serverKeyRusak));
  }

  const coreApi = new midtransClient.CoreApi({
    isProduction,
    serverKey,
    clientKey,
  });

  return coreApi;
}

/** Cancel transaksi pending di Midtrans (best-effort — kalau transaksinya
 * udah expired/gak ada di sisi Midtrans, itu bukan error fatal buat kita,
 * yang penting transaksi baru tetap bisa dibuat). */
export async function batalkanTransaksiMidtrans(orderId: string) {
  try {
    const coreApi = await getCoreApiClient();
    await coreApi.transaction.cancel(orderId);
  } catch (err) {
    console.warn(`[Midtrans] Gagal cancel transaksi ${orderId} (mungkin udah expired/gak ada):`, err);
  }
}

/**
 * Verifikasi signature key yang dikirim Midtrans di body webhook.
 * Rumus: SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export async function verifySignature(body: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}) {
  const pengaturan = await getPengaturanPembayaran();
  const { serverKey, serverKeyRusak } = getActiveKeys(pengaturan);
  if (!serverKey) {
    // Jangan gagal senyap: tanpa log di sini, gejalanya cuma "semua webhook
    // Midtrans balas 403 dan tagihan gak pernah lunas" tanpa petunjuk apa pun.
    console.error(
      "[Midtrans] Webhook ditolak karena Server Key tidak tersedia. " + pesanKeyBermasalah(serverKeyRusak)
    );
    return false;
  }

  const crypto = await import("crypto");
  const expected = crypto
    .createHash("sha512")
    .update(body.order_id + body.status_code + body.gross_amount + serverKey)
    .digest("hex");

  return expected === body.signature_key;
}
