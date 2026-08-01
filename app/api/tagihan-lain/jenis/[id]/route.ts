import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data: { nama?: string; nominalDefault?: number; aktif?: boolean } = {};

    if (body.nama !== undefined) {
      if (!String(body.nama).trim()) {
        return NextResponse.json({ error: "Nama jenis tagihan tidak boleh kosong" }, { status: 400 });
      }
      data.nama = String(body.nama).trim();
    }
    if (body.nominalDefault !== undefined) data.nominalDefault = Number(body.nominalDefault) || 0;
    if (body.aktif !== undefined) data.aktif = Boolean(body.aktif);

    const jenis = await prisma.jenisTagihanLain.update({ where: { id }, data });
    return NextResponse.json(jenis);
  } catch (error: any) {
    console.error("[PATCH /api/tagihan-lain/jenis/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui jenis tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { id } = await params;

    const punyaTagihan = await prisma.tagihanLain.findFirst({
      where: { jenisTagihanLainId: id },
      select: { id: true },
    });

    if (punyaTagihan) {
      return NextResponse.json(
        {
          error:
            "Jenis tagihan ini sudah punya riwayat tagihan. Nonaktifkan saja (jangan dihapus) supaya riwayat lama tetap utuh.",
        },
        { status: 409 }
      );
    }

    await prisma.jenisTagihanLain.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/tagihan-lain/jenis/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus jenis tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
