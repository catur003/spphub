import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, requireApiOwner } from "@/lib/api-auth";

export async function GET() {
  const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

  let profil = await prisma.profilSekolah.findFirst();
  if (!profil) {
    profil = await prisma.profilSekolah.create({
      data: { nama: "Nama Sekolah", nominalSppDefault: 0 },
    });
  }
  return NextResponse.json(profil);
}

export async function PUT(req: NextRequest) {
  const { error } = await requireApiOwner();
  if (error) return error;

  const body = await req.json();
  const { nama, alamat, logoUrl, nominalSppDefault, noHpBendahara, fonnteToken } = body;

  if (!nama) {
    return NextResponse.json({ error: "Nama sekolah wajib diisi" }, { status: 400 });
  }

  let profil = await prisma.profilSekolah.findFirst();
  const data = {
    nama: String(nama).trim(),
    alamat: alamat ? String(alamat).trim() : null,
    logoUrl: logoUrl ? String(logoUrl).trim() : null,
    nominalSppDefault: Number(nominalSppDefault) || 0,
    noHpBendahara: noHpBendahara ? String(noHpBendahara).trim() : null,
    fonnteToken: fonnteToken ? String(fonnteToken).trim() : null,
  };

  profil = profil
    ? await prisma.profilSekolah.update({ where: { id: profil.id }, data })
    : await prisma.profilSekolah.create({ data });

  return NextResponse.json(profil);
}
