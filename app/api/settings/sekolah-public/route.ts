import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const profil = await prisma.profilSekolah.findFirst({
      select: {
        nama: true,
        alamat: true,
        logoUrl: true,
        noHpBendahara: true,
      },
    });

    return NextResponse.json(
      profil || {
        nama: "SPP Sekolah Digital",
        alamat: null,
        logoUrl: null,
        noHpBendahara: null,
      }
    );
  } catch (error: any) {
    console.error("[GET /api/settings/sekolah-public] Error:", error);
    return NextResponse.json(
      { nama: "SPP Sekolah Digital", alamat: null, logoUrl: null, noHpBendahara: null },
      { status: 200 }
    );
  }
}
