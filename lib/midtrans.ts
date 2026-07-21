import midtransClient from "midtrans-client";
import { prisma } from "./prisma";

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
  return {
    clientKey: isProd ? pengaturan.productionClientKey : pengaturan.sandboxClientKey,
    serverKey: isProd ? pengaturan.productionServerKey : pengaturan.sandboxServerKey,
    isProduction: isProd,
  };
}

/** Snap client Midtrans, dibangun dari key aktif di DB. */
export async function getSnapClient() {
  const pengaturan = await getPengaturanPembayaran();
  const { clientKey, serverKey, isProduction } = getActiveKeys(pengaturan);

  if (!serverKey || !clientKey) {
    throw new Error(
      "Payment Settings belum diisi lengkap. Owner perlu isi Client Key & Server Key di halaman Settings."
    );
  }

  const snap = new midtransClient.Snap({
    isProduction,
    serverKey,
    clientKey,
  });

  return { snap, clientKey, isProduction };
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
  const { serverKey } = getActiveKeys(pengaturan);
  if (!serverKey) return false;

  const crypto = await import("crypto");
  const expected = crypto
    .createHash("sha512")
    .update(body.order_id + body.status_code + body.gross_amount + serverKey)
    .digest("hex");

  return expected === body.signature_key;
}
