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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAccess();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (body.aktif) {
    await prisma.tahunAjaran.updateMany({ data: { aktif: false } });
  }

  const tahunAjaran = await prisma.tahunAjaran.update({
    where: { id },
    data: { nama: body.nama, aktif: !!body.aktif },
  });
  return NextResponse.json(tahunAjaran);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAccess();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const dipakai = await prisma.tagihanSpp.count({ where: { tahunAjaranId: id } });
  if (dipakai > 0) {
    return NextResponse.json(
      { error: "Tahun ajaran masih dipakai tagihan, tidak bisa dihapus" },
      { status: 400 }
    );
  }

  await prisma.tahunAjaran.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
