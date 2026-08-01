import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

const JENIS_VALID = ["spp", "lainnya"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data: { nama?: string; tanggal?: Date; jenis?: string; tahunAjaranId?: string } = {};

    if (body.nama !== undefined) {
      if (!String(body.nama).trim()) {
        return NextResponse.json({ error: "Nama preset tidak boleh kosong" }, { status: 400 });
      }
      data.nama = String(body.nama).trim();
    }
    if (body.tanggal !== undefined) data.tanggal = new Date(body.tanggal);
    if (body.jenis !== undefined) {
      if (!JENIS_VALID.includes(body.jenis)) {
        return NextResponse.json(
          { error: `jenis tidak valid. Pilihan: ${JENIS_VALID.join(", ")}` },
          { status: 400 }
        );
      }
      data.jenis = body.jenis;
    }
    if (body.tahunAjaranId !== undefined) data.tahunAjaranId = body.tahunAjaranId;

    const preset = await prisma.jatuhTempoPreset.update({
      where: { id },
      data: data as never,
      include: { tahunAjaran: { select: { id: true, nama: true, aktif: true } } },
    });

    return NextResponse.json(preset);
  } catch (error: any) {
    console.error("[PATCH /api/jatuh-tempo/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui preset jatuh tempo: " + (error.message || "Unknown error") },
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
    await prisma.jatuhTempoPreset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/jatuh-tempo/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus preset jatuh tempo: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
