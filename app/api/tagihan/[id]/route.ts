import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

const STATUS_VALID = ["belum_bayar", "menunggu_verifikasi", "lunas", "terlambat"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (!body.status) {
      return NextResponse.json({ error: "status wajib diisi" }, { status: 400 });
    }

    if (!STATUS_VALID.includes(body.status)) {
      return NextResponse.json(
        { error: `status tidak valid. Pilihan: ${STATUS_VALID.join(", ")}` },
        { status: 400 }
      );
    }

    const tagihan = await prisma.tagihanSpp.update({
      where: { id },
      data: { status: body.status },
    });

    return NextResponse.json(tagihan);
  } catch (error: any) {
    console.error("[PATCH /api/tagihan/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: errAkses } = await requireApiRole(["owner", "petugas"]);
    if (errAkses) return errAkses;

    const { id } = await params;

    // Sama seperti hapus siswa: Pembayaran ikut ke-cascade-delete kalau
    // tagihan ini dihapus. Tolak kalau sudah ada pembayaran yang sukses.
    const punyaPembayaranSukses = await prisma.pembayaran.findFirst({
      where: { tagihanSppId: id, status: "success" },
      select: { id: true },
    });

    if (punyaPembayaranSukses) {
      return NextResponse.json(
        {
          error:
            "Tagihan ini sudah punya pembayaran sukses. Menghapusnya akan menghapus permanen riwayat pembayaran itu juga. Kalau memang salah input, ubah statusnya saja, jangan dihapus.",
        },
        { status: 409 }
      );
    }

    await prisma.tagihanSpp.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/tagihan/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
