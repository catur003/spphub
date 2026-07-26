import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET() {
  const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

  const tahunAjaran = await prisma.tahunAjaran.findMany({ orderBy: { nama: "desc" } });
  return NextResponse.json(tahunAjaran);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

  const body = await req.json();
  if (!body.nama) {
    return NextResponse.json({ error: "nama wajib diisi" }, { status: 400 });
  }

  // Cuma boleh ada 1 tahun ajaran aktif — matiin yang lain kalau ini di-set aktif
  if (body.aktif) {
    await prisma.tahunAjaran.updateMany({ data: { aktif: false } });
  }

  const tahunAjaran = await prisma.tahunAjaran.create({
    data: { nama: body.nama, aktif: !!body.aktif },
  });
  return NextResponse.json(tahunAjaran, { status: 201 });
}
