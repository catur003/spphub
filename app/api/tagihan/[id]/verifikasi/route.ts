import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

/**
 * Pelunasan MANUAL (tunai / transfer ke rekening sekolah) oleh admin.
 *
 * Ini satu-satunya jalur sah buat nandain TagihanSpp jadi "lunas" di luar
 * Midtrans — dan sengaja bikin row Pembayaran juga, bukan cuma update status
 * tagihan. Tanpa row Pembayaran, uang tunai yang masuk gak akan pernah
 * kelihatan di grafik tren dashboard dan halaman /kwitansi/[id] bakal kosong.
 * Pola ini sama persis dengan /api/tagihan-lain/[id]/verifikasi.
 */
const METODE_VALID = ["tunai", "transfer_bank"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { id } = await params;
    // Body opsional — jangan sampai request tanpa body bikin req.json() throw
    // dan berujung 500 padahal maksudnya cuma "lunaskan pakai metode default".
    const body = await req.json().catch(() => ({} as any));

    const metode = body?.metode && METODE_VALID.includes(body.metode) ? body.metode : "tunai";

    const tagihan = await prisma.tagihanSpp.findUnique({ where: { id } });
    if (!tagihan) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }
    if (tagihan.status === "lunas") {
      return NextResponse.json({ error: "Tagihan ini udah lunas" }, { status: 400 });
    }
    if (!tagihan.nominal || tagihan.nominal <= 0) {
      return NextResponse.json(
        {
          error:
            "Nominal tagihan ini masih Rp 0. Perbaiki nominalnya dulu (tombol Sinkronkan Nominal) sebelum ditandai lunas, biar laporan keuangannya gak nyatet pemasukan Rp 0.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.pembayaran.create({
        data: {
          tagihanSppId: id,
          siswaId: tagihan.siswaId,
          orderId: `MANUAL-${id}-${Date.now()}`,
          jumlah: tagihan.nominal,
          metode,
          status: "success",
          paidAt: new Date(),
        },
      }),
      prisma.tagihanSpp.update({
        where: { id },
        data: { status: "lunas" },
      }),
    ]);

    return NextResponse.json({ success: true, metode });
  } catch (error: any) {
    console.error("[POST /api/tagihan/[id]/verifikasi] Error:", error);
    return NextResponse.json(
      { error: "Gagal menandai tagihan lunas: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
