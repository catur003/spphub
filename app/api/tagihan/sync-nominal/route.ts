import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profil = await prisma.profilSekolah.findFirst();
    const defaultNominal = profil?.nominalSppDefault || 0;

    // Cari semua tagihan belum bayar / terlambat yang nominalnya 0
    const tagihanNol = await prisma.tagihanSpp.findMany({
      where: {
        status: { in: ["belum_bayar", "terlambat"] },
        nominal: 0,
      },
      include: {
        siswa: {
          include: { kelas: true },
        },
      },
    });

    let updatedCount = 0;

    for (const t of tagihanNol) {
      const nominalKelas =
        t.siswa?.kelas?.nominalSpp && Number(t.siswa.kelas.nominalSpp) > 0
          ? Number(t.siswa.kelas.nominalSpp)
          : defaultNominal;

      if (nominalKelas > 0) {
        await prisma.tagihanSpp.update({
          where: { id: t.id },
          data: { nominal: nominalKelas },
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Berhasil menyinkronkan ${updatedCount} tagihan SPP Rp 0 menjadi nominal SPP kelas/sekolah yang valid.`,
    });
  } catch (error: any) {
    console.error("[POST /api/tagihan/sync-nominal] Error:", error);
    return NextResponse.json(
      { error: "Gagal menyinkronkan nominal SPP: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
