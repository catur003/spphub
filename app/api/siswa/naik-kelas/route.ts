import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const { kelasAsalId, kelasTujuanId, siswaIds } = body;

    if (!kelasAsalId || !kelasTujuanId) {
      return NextResponse.json(
        { error: "Kelas asal dan kelas tujuan (atau status lulus) wajib dipilih" },
        { status: 400 }
      );
    }

    const whereFilter: any = { kelasId: kelasAsalId, status: "aktif" };
    if (Array.isArray(siswaIds) && siswaIds.length > 0) {
      whereFilter.id = { in: siswaIds };
    }

    let resultCount = 0;

    if (kelasTujuanId === "lulus") {
      const res = await prisma.siswa.updateMany({
        where: whereFilter,
        data: {
          status: "lulus",
        },
      });
      resultCount = res.count;
    } else {
      const kelasTujuan = await prisma.kelas.findUnique({ where: { id: kelasTujuanId } });
      if (!kelasTujuan) {
        return NextResponse.json({ error: "Kelas tujuan tidak ditemukan" }, { status: 400 });
      }

      const res = await prisma.siswa.updateMany({
        where: whereFilter,
        data: {
          kelasId: kelasTujuanId,
        },
      });
      resultCount = res.count;
    }

    return NextResponse.json({
      success: true,
      promotedCount: resultCount,
      message: `Berhasil memindahkan/menaikkan status ${resultCount} siswa secara massal.`,
    });
  } catch (error: any) {
    console.error("[POST /api/siswa/naik-kelas] Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses naik kelas massal: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
