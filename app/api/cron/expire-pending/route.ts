import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESI_BAYAR_EXPIRY_JAM } from "@/lib/midtrans";

/**
 * BUG WORKFLOW (sedang): pembayaran Midtrans yang dibiarkan menggantung
 * (siswa buka Snap lalu tutup tanpa bayar) SEHARUSNYA jadi "expired" lewat
 * webhook Midtrans (event `expire`) atau lewat GET /api/tagihan/[id]/cek-status
 * kalau siswa/admin buka lagi halamannya. Tapi kalau:
 *   - webhook gagal terkirim (downtime Midtrans, network, dst), ATAU
 *   - siswa/admin gak pernah buka lagi halaman itu buat trigger cek-status,
 * row Pembayaran itu tetap berstatus "pending" SELAMANYA — gak ada proses
 * background yang nyapu status basi ini. Efeknya: laporan/dashboard yang
 * ngitung "transaksi pending" numpuk data basi yang gak representatif,
 * dan siswa juga gak bisa mulai transaksi baru yang bersih (endpoint /bayar
 * reuse pending lama sampai SESI_BAYAR_EXPIRY_JAM lewat).
 *
 * Endpoint ini nyapu pending yang sudah lewat SESI_BAYAR_EXPIRY_JAM jadi
 * "expired" di DB lokal kita — TANPA nyentuh transaksi Midtrans-nya sendiri
 * (kalau Midtrans akhirnya kirim webhook telat buat order yang sudah kita
 * tandai expired duluan, webhook handler tetap idempoten & aman diabaikan
 * karena status bukan lagi "pending").
 *
 * Cara pakai: panggil endpoint ini secara terjadwal (Railway Cron / cron-job.org
 * / GitHub Actions schedule / dst), misal tiap 1 jam, dengan header
 * `Authorization: Bearer <CRON_SECRET>`. WAJIB set env var CRON_SECRET di
 * deploy — tanpa itu endpoint ini menolak semua request (fail closed, bukan
 * fail open) supaya gak ada orang luar yang bisa spam-trigger ini.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/expire-pending] CRON_SECRET belum diset di environment — endpoint ditolak.");
    return NextResponse.json(
      { error: "CRON_SECRET belum dikonfigurasi di server. Endpoint ini nonaktif sampai env var itu diisi." },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batasWaktu = new Date(Date.now() - SESI_BAYAR_EXPIRY_JAM * 60 * 60 * 1000);

  const [sppExpired, lainExpired] = await Promise.all([
    prisma.pembayaran.updateMany({
      where: { status: "pending", createdAt: { lt: batasWaktu } },
      data: { status: "expired" },
    }),
    prisma.pembayaranLain.updateMany({
      where: { status: "pending", createdAt: { lt: batasWaktu } },
      data: { status: "expired" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    sppDiExpirekan: sppExpired.count,
    lainDiExpirekan: lainExpired.count,
  });
}
