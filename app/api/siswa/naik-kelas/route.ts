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

    const kelasAsal = await prisma.kelas.findUnique({ where: { id: kelasAsalId } });
    if (!kelasAsal) {
      return NextResponse.json({ error: "Kelas asal tidak ditemukan" }, { status: 400 });
    }

    // "Naik Kelas" secara konsep HARUS naik satu tingkat (mis. tingkat 10 ->
    // 11), bukan pindah ke jurusan sembarang di tingkat yang sama/lain —
    // itu namanya "pindah kelas", beda operasi. UI (NaikKelasModal) udah
    // ngebatesin pilihan kelas tujuan cuma yang tingkat+1, tapi divalidasi
    // lagi di sini biar gak cuma ngandelin batasan client-side.
    if (kelasTujuanId !== "lulus") {
      const kelasTujuanCek = await prisma.kelas.findUnique({ where: { id: kelasTujuanId } });
      if (!kelasTujuanCek) {
        return NextResponse.json({ error: "Kelas tujuan tidak ditemukan" }, { status: 400 });
      }
      if (
        kelasAsal.tingkat != null &&
        kelasTujuanCek.tingkat != null &&
        kelasTujuanCek.tingkat !== kelasAsal.tingkat + 1
      ) {
        return NextResponse.json(
          {
            error: `Kelas tujuan (Tingkat ${kelasTujuanCek.tingkat}) harus tepat satu tingkat di atas kelas asal (Tingkat ${kelasAsal.tingkat}). Kalau maksudnya mindahin siswa ke jurusan lain di tingkat yang sama, gunakan Edit Siswa satu-satu, bukan Naik Kelas Massal.`,
          },
          { status: 400 }
        );
      }
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
      message: `Berhasil menaikkan ${resultCount} siswa secara massal.`,
    });
  } catch (error: any) {
    console.error("[POST /api/siswa/naik-kelas] Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses naik kelas massal: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
