import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignature } from "@/lib/midtrans";

// Status Midtrans yang dianggap "berhasil bayar"
const STATUS_SUKSES = ["capture", "settlement"];
// Status Midtrans yang dianggap gagal/batal
const STATUS_GAGAL = ["deny", "cancel", "failure"];

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
    if (pembayaranLain.status === "success" || pembayaranLain.status === "failed") {
      return NextResponse.json({ received: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pembayaranLain.update({
        where: { orderId },
        data: {
          status: statusBaru,
          midtransTransactionId: midtransTransactionId || null,
          rawResponse: body,
          paidAt: statusBaru === "success" ? new Date() : null,
        },
      });

      if (statusBaru === "success") {
        await tx.tagihanLain.update({
          where: { id: pembayaranLain.tagihanLainId },
          data: { status: "lunas" },
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

  // Idempoten: kalau udah diproses jadi success/failed sebelumnya, jangan diulang
  if (pembayaran.status === "success" || pembayaran.status === "failed") {
    return NextResponse.json({ received: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.pembayaran.update({
      where: { orderId },
      data: {
        status: statusBaru,
        midtransTransactionId: midtransTransactionId || null,
        rawResponse: body,
        paidAt: statusBaru === "success" ? new Date() : null,
      },
    });

    if (statusBaru === "success") {
      await tx.tagihanSpp.update({
        where: { id: pembayaran.tagihanSppId },
        data: { status: "lunas" },
      });
    }
  });

  return NextResponse.json({ received: true });
}
