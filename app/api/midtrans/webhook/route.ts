import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignature } from "@/lib/midtrans";

// Status Midtrans yang dianggap "berhasil bayar"
const STATUS_SUKSES = ["capture", "settlement"];
// Status Midtrans yang dianggap gagal/batal SEBELUM sempat sukses
const STATUS_GAGAL = ["deny", "cancel", "failure"];
// Status Midtrans yang berarti duit BALIK setelah transaksi sempat sukses.
// Enum StatusPembayaran di schema BELUM punya nilai "refunded" sendiri
// (itu perlu migration terpisah, di luar scope fix ini) — dipetakan ke
// "failed" sebagai nilai terdekat yang tersedia, supaya minimal tagihan
// gak nyangkut tercatat "lunas" selamanya walau duitnya sudah dikembalikan.
// Payload webhook mentah tetap kesimpan penuh di rawResponse buat audit.
const STATUS_REFUND = ["refund", "partial_refund", "chargeback"];

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
    transaction_status: transactionStatus,
    fraud_status: fraudStatus,
    transaction_id: midtransTransactionId,
  } = body;

  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    return NextResponse.json({ error: "Payload tidak lengkap" }, { status: 400 });
  }

  const valid = await verifySignature({
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
  });

  if (!valid) {
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 403 });
  }

  // orderId dikasih prefix beda pas dibuat ("SPP-..." vs "LAIN-...") supaya
  // webhook tau harus update tabel Pembayaran (SPP) atau PembayaranLain
  // (Tagihan Lainnya — seragam, daftar ulang, dll) tanpa nyentuh kode SPP
  // yang udah stabil.
  const isTagihanLain = orderId.startsWith("LAIN-");

  let statusBaru: "pending" | "success" | "failed" | "expired" = "pending";

  if (STATUS_SUKSES.includes(transactionStatus)) {
    // Untuk kartu kredit, capture cuma sukses kalau fraud_status accept
    if (transactionStatus === "capture" && fraudStatus && fraudStatus !== "accept") {
      statusBaru = "pending";
    } else {
      statusBaru = "success";
    }
  } else if (STATUS_GAGAL.includes(transactionStatus)) {
    statusBaru = "failed";
  } else if (STATUS_REFUND.includes(transactionStatus)) {
    statusBaru = "failed";
  } else if (transactionStatus === "expire") {
    statusBaru = "expired";
  } else if (transactionStatus === "pending") {
    statusBaru = "pending";
  }

  if (isTagihanLain) {
    const pembayaranLain = await prisma.pembayaranLain.findUnique({ where: { orderId } });
    if (!pembayaranLain) {
      return NextResponse.json({ received: true, note: "order_id tidak dikenal" });
    }

    const iniRefundSetelahSukses =
      STATUS_REFUND.includes(transactionStatus) && pembayaranLain.status === "success";

    // Idempoten seperti sebelumnya (skip kalau udah final) — TAPI refund yang
    // datang setelah transaksi sempat "success" tetap harus diproses, bukan
    // ikut keblokir guard ini. Tanpa pengecualian ini, transaksi yang sudah
    // "success" gak akan pernah ke-update lagi walau Midtrans ngirim webhook
    // refund/chargeback setelahnya — tagihan nyangkut "lunas" selamanya
    // padahal duitnya udah balik ke pembeli.
    if (
      (pembayaranLain.status === "success" || pembayaranLain.status === "failed") &&
      !iniRefundSetelahSukses
    ) {
      return NextResponse.json({ received: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pembayaranLain.update({
        where: { orderId },
        data: {
          status: statusBaru,
          midtransTransactionId: midtransTransactionId || null,
          // PENTING: jangan timpa rawResponse mentah-mentah — di situ kita
          // nyimpen token Snap buat di-reuse kalau user klik "Bayar Sekarang"
          // lagi (lihat /bayar route). Payload webhook gak punya field
          // token, jadi kalau ditimpa langsung, reuse-nya jadi selalu gagal
          // begitu Midtrans kirim notifikasi pertama (biasanya pas metode
          // bayar baru dipilih, sebelum transaksi kelar).
          rawResponse: { ...(pembayaranLain.rawResponse as any), midtransNotifikasi: body },
          paidAt: statusBaru === "success" ? new Date() : null,
        },
      });

      if (statusBaru === "success") {
        await tx.tagihanLain.update({
          where: { id: pembayaranLain.tagihanLainId },
          data: { status: "lunas" },
        });
      } else if (iniRefundSetelahSukses) {
        // Transaksi tadinya sukses & tagihan udah ke-set "lunas" — sekarang
        // duitnya balik, jadi tagihan HARUS dikembalikan ke "belum_bayar",
        // bukan dibiarkan nyangkut "lunas" di laporan/dashboard.
        await tx.tagihanLain.update({
          where: { id: pembayaranLain.tagihanLainId },
          data: { status: "belum_bayar" },
        });
      }
    });

    return NextResponse.json({ received: true });
  }

  const pembayaran = await prisma.pembayaran.findUnique({ where: { orderId } });
  if (!pembayaran) {
    // Order ID nggak dikenal — tetap balas 200 biar Midtrans nggak retry terus,
    // tapi jangan diproses.
    return NextResponse.json({ received: true, note: "order_id tidak dikenal" });
  }

  // Idempoten: kalau udah diproses jadi success/failed sebelumnya, jangan
  // diulang — KECUALI ini refund/chargeback yang datang setelah transaksi
  // sempat "success" (lihat penjelasan lengkap di blok TagihanLain di atas).
  const iniRefundSetelahSukses =
    STATUS_REFUND.includes(transactionStatus) && pembayaran.status === "success";

  if ((pembayaran.status === "success" || pembayaran.status === "failed") && !iniRefundSetelahSukses) {
    return NextResponse.json({ received: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.pembayaran.update({
      where: { orderId },
      data: {
        status: statusBaru,
        midtransTransactionId: midtransTransactionId || null,
        // Sama seperti PembayaranLain di atas: merge, jangan timpa —
        // rawResponse nyimpen token Snap yang dipakai buat reuse sesi bayar.
        rawResponse: { ...(pembayaran.rawResponse as any), midtransNotifikasi: body },
        paidAt: statusBaru === "success" ? new Date() : null,
      },
    });

    if (statusBaru === "success") {
      await tx.tagihanSpp.update({
        where: { id: pembayaran.tagihanSppId },
        data: { status: "lunas" },
      });
    } else if (iniRefundSetelahSukses) {
      // Transaksi tadinya sukses & tagihan udah "lunas" — sekarang duitnya
      // balik, tagihan HARUS dikembalikan ke "belum_bayar".
      await tx.tagihanSpp.update({
        where: { id: pembayaran.tagihanSppId },
        data: { status: "belum_bayar" },
      });
    }
  });

  return NextResponse.json({ received: true });
}
