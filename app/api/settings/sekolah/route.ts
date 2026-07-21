import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function checkAccess() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) return null;
  return session;
}

export async function GET() {
  const session = await checkAccess();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let profil = await prisma.profilSekolah.findFirst();
  if (!profil) {
    profil = await prisma.profilSekolah.create({
      data: { nama: "Nama Sekolah", nominalSppDefault: 0 },
    });
  }
  return NextResponse.json(profil);
}

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "owner") {
    return NextResponse.json({ error: "Hanya Owner yang boleh ubah Profil Sekolah" }, { status: 403 });
  }

  const body = await req.json();
  const { nama, alamat, logoUrl, nominalSppDefault } = body;

  if (!nama) {
    return NextResponse.json({ error: "nama sekolah wajib diisi" }, { status: 400 });
  }

  let profil = await prisma.profilSekolah.findFirst();
  const data = {
    nama,
    alamat: alamat || null,
    logoUrl: logoUrl || null,
    nominalSppDefault: Number(nominalSppDefault) || 0,
  };

  profil = profil
    ? await prisma.profilSekolah.update({ where: { id: profil.id }, data })
    : await prisma.profilSekolah.create({ data });

  return NextResponse.json(profil);
}
