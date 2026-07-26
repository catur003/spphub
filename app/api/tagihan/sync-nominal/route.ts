import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { syncNominalKosong } from "@/lib/tagihan-nominal";

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const profil = await prisma.profilSekolah.findFirst();
    const defaultNominal = profil?.nominalSppDefault || 0;

    const updatedCount = await syncNominalKosong(defaultNominal);

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
