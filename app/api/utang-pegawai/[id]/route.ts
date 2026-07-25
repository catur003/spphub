import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function checkAccess() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return null;
  }
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { nominalTerbayar, bayarSebagian, tandaiLunas } = body;

    const existing = await prisma.utangPegawai.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Data pinjaman tidak ditemukan" }, { status: 404 });

    let newTerbayar = existing.nominalTerbayar;
    let newStatus = existing.status;

    if (tandaiLunas) {
      newTerbayar = existing.nominalPinjaman;
      newStatus = "lunas";
    } else if (bayarSebagian && Number(bayarSebagian) > 0) {
      newTerbayar = Math.min(existing.nominalPinjaman, existing.nominalTerbayar + Number(bayarSebagian));
      if (newTerbayar >= existing.nominalPinjaman) newStatus = "lunas";
    } else if (nominalTerbayar !== undefined) {
      newTerbayar = Math.min(existing.nominalPinjaman, Number(nominalTerbayar));
      if (newTerbayar >= existing.nominalPinjaman) newStatus = "lunas";
    }

    const updated = await prisma.utangPegawai.update({
      where: { id },
      data: {
        nominalTerbayar: newTerbayar,
        status: newStatus,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[PATCH /api/utang-pegawai/[id]] Error:", error);
    return NextResponse.json({ error: "Gagal mengupdate utang pegawai" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.utangPegawai.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/utang-pegawai/[id]] Error:", error);
    return NextResponse.json({ error: "Gagal menghapus utang pegawai" }, { status: 500 });
  }
}
