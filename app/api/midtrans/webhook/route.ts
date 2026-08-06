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

  // Status yang artinya duit BALIK ke siswa setelah transaksi sempat sukses.
  // Tabel Pembayaran cuma punya pending/success/failed/expired, jadi gak ada
  // state yang pas buat ini — dan pengecekan idempoten di bawah bakal
  // nge-skip-nya diam-diam karena statusnya udah "success". Minimal harus
  // ke-log dengan jelas biar bendahara tau ada tagihan yang statusnya "lunas"
  // padahal uangnya udah dikembalikan.
  const STATUS_PERLU_TINJAUAN = ["refund", "partial_refund", "chargeback", "partial_chargeback"];

  if (STATUS_PERLU_TINJAUAN.includes(transactionStatus)) {
    console.error(
      `[Midtrans Webhook] PERLU TINJAUAN MANUAL — order ${orderId} berstatus "${transactionStatus}". ` +
        `Tagihan terkait kemungkinan masih tertandai LUNAS padahal dananya dikembalikan. ` +
        `Cek dashboard Midtrans dan sesuaikan status tagihannya manual.`
    );
    return NextResponse.json({ received: true, note: "status perlu tinjauan manual" });
  }

  let statusBaru: "pending" | "success" | "failed" | "expired";

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
  } else {
    // JANGAN default ke "pending". Dulu status yang gak dikenal (mis.
    // "authorize", atau status baru yang ditambah Midtrans di kemudian hari)
    // diam-diam nurunin pembayaran jadi pending dan nge-null-in paidAt.
    // Lebih aman: gak usah diubah sama sekali, cukup dicatat di log.
    console.warn(
      `[Midtrans Webhook] transaction_status tidak dikenal: "${transactionStatus}" (order ${orderId}). Diabaikan.`
    );
    return NextResponse.json({ received: true, note: "status tidak dikenal, diabaikan" });
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
    }
  });

  return NextResponse.json({ received: true });
}
