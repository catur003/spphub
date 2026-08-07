import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

/**
 * Pelunasan MANUAL Tagihan Lainnya — pasangan dari
 * app/api/tagihan/[id]/verifikasi (SPP). Sebelumnya file ini gak sinkron
 * sama versi SPP-nya di beberapa hal:
 *   - req.json() dipanggil tanpa .catch(), jadi request tanpa body/body
 *     bukan JSON valid bikin unhandled exception -> 500 generic.
 *   - `metode` diterima mentah dari body TANPA whitelist (versi SPP
 *     membatasi ke "tunai"/"transfer_bank") — bisa keisi string sembarang.
 *   - gak ada guard nominal 0 (versi SPP nolak pelunasan kalau nominal
 *     tagihan masih Rp 0, biar laporan gak nyatet pemasukan Rp 0).
 *   - gak ada try-catch pembungkus sama sekali, beda dari semua endpoint
 *     lain di proyek ini yang konsisten nangkep & log error.
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
    const body = await req.json().catch(() => ({} as any));
    const metode = body?.metode && METODE_VALID.includes(body.metode) ? body.metode : "tunai";

    const tagihan = await prisma.tagihanLain.findUnique({ where: { id } });
    if (!tagihan) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    if (tagihan.status === "lunas") {
      return NextResponse.json({ error: "Tagihan ini udah lunas" }, { status: 400 });
    }
    if (!tagihan.nominal || tagihan.nominal <= 0) {
      return NextResponse.json(
        {
          error:
            "Nominal tagihan ini masih Rp 0. Perbaiki nominalnya dulu sebelum ditandai lunas, biar laporan keuangannya gak nyatet pemasukan Rp 0.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.pembayaranLain.create({
        data: {
          tagihanLainId: id,
          siswaId: tagihan.siswaId,
          orderId: `MANUAL-LAIN-${id}-${Date.now()}`,
          jumlah: tagihan.nominal,
          metode,
          status: "success",
          paidAt: new Date(),
        },
      }),
      prisma.tagihanLain.update({
        where: { id },
        data: { status: "lunas" },
      }),
    ]);

    return NextResponse.json({ success: true, metode });
  } catch (error: any) {
    console.error("[POST /api/tagihan-lain/[id]/verifikasi] Error:", error);
    return NextResponse.json(
      { error: "Gagal menandai tagihan lunas: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
