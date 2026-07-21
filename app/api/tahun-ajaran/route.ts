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

export async function GET() {
  const session = await checkAccess();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tahunAjaran = await prisma.tahunAjaran.findMany({ orderBy: { nama: "desc" } });
  return NextResponse.json(tahunAjaran);
}

export async function POST(req: NextRequest) {
  const session = await checkAccess();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
