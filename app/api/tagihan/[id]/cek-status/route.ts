import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const STATUS_SUKSES = ["capture", "settlement"];
const STATUS_GAGAL = ["deny", "cancel", "failure"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const tagihan = await prisma.tagihanSpp.findUnique({
    where: { id },
    include: {
      siswa: { include: { akun: true } },
      pembayaran: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!tagihan) {
    return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  }

  // Otorisasi: Siswa hanya bisa cek tagihan miliknya sendiri, admin/petugas bisa cek siapapun
  const isSiswa = session.user.role === "siswa";
  if (isSiswa && tagihan.siswa.akun?.id !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Jika sudah lunas di DB lokal, langsung kembalikan lunas
  if (tagihan.status === "lunas") {
    return NextResponse.json({ status: "lunas", updated: false });
  }

  const pembayaranTerakhir = tagihan.pembayaran[0];
  if (!pembayaranTerakhir || !pembayaranTerakhir.orderId) {
    return NextResponse.json({ status: tagihan.status, updated: false, note: "Belum ada transaksi pembayaran" });
  }

  // Ambil pengaturan Midtrans
  const settings = await prisma.pengaturanPembayaran.findFirst();
  if (!settings) {
    return NextResponse.json({ error: "Pengaturan pembayaran belum dikonfigurasi" }, { status: 500 });
  }

  const isProd = settings.environment === "production";
  const serverKey = isProd ? settings.productionServerKey : settings.sandboxServerKey;

  if (!serverKey) {
    return NextResponse.json({ error: "Server key Midtrans belum diset" }, { status: 500 });
  }

  const midtransUrl = isProd
    ? `https://api.midtrans.com/v2/${pembayaranTerakhir.orderId}/status`
    : `https://api.sandbox.midtrans.com/v2/${pembayaranTerakhir.orderId}/status`;

  const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");

  try {
    const res = await fetch(midtransUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    });

    const body = await res.json();

    if (!res.ok || body.status_code === "404") {
      return NextResponse.json({
        status: tagihan.status,
        updated: false,
        note: body.status_message || "Order belum terdaftar di Midtrans",
      });
    }

    const transactionStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;

    let statusBaru: "pending" | "success" | "failed" | "expired" = "pending";

    if (STATUS_SUKSES.includes(transactionStatus)) {
      if (transactionStatus === "capture" && fraudStatus && fraudStatus !== "accept") {
        statusBaru = "pending";
      } else {
        statusBaru = "success";
      }
    } else if (STATUS_GAGAL.includes(transactionStatus)) {
      statusBaru = "failed";
    } else if (transactionStatus === "expire") {
      statusBaru = "expired";
    }

    let isUpdated = false;

    if (statusBaru === "success") {
      await prisma.$transaction([
        prisma.pembayaran.update({
          where: { id: pembayaranTerakhir.id },
          data: {
            status: "success",
            midtransTransactionId: body.transaction_id || null,
            rawResponse: body,
            paidAt: new Date(),
          },
        }),
        prisma.tagihanSpp.update({
          where: { id: tagihan.id },
          data: { status: "lunas" },
        }),
      ]);
      isUpdated = true;
    } else if (statusBaru === "failed" || statusBaru === "expired") {
      await prisma.pembayaran.update({
        where: { id: pembayaranTerakhir.id },
        data: {
          status: statusBaru,
          rawResponse: body,
        },
      });
      isUpdated = true;
    }

    return NextResponse.json({
      status: statusBaru === "success" ? "lunas" : statusBaru,
      updated: isUpdated,
      transactionStatus,
      raw: body,
    });
  } catch (err: any) {
    console.error("Cek status Midtrans error:", err);
    return NextResponse.json({ error: "Gagal mengecek status ke Midtrans" }, { status: 500 });
  }
}
