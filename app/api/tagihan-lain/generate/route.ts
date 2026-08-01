import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const { jenisTagihanLainId, nominal, jatuhTempo, tahunAjaranId, kelasId, keterangan } = body;

    if (!jenisTagihanLainId || !jatuhTempo) {
      return NextResponse.json(
        { error: "Jenis tagihan dan jatuh tempo wajib diisi" },
        { status: 400 }
      );
    }

    const jenis = await prisma.jenisTagihanLain.findUnique({ where: { id: jenisTagihanLainId } });
    if (!jenis) {
      return NextResponse.json({ error: "Jenis tagihan yang dipilih tidak ditemukan" }, { status: 400 });
    }

    if (tahunAjaranId) {
      const ta = await prisma.tahunAjaran.findUnique({ where: { id: tahunAjaranId } });
      if (!ta) {
        return NextResponse.json({ error: "Tahun ajaran yang dipilih tidak ditemukan" }, { status: 400 });
      }
    }

    const nominalTerpakai = Number(nominal) || jenis.nominalDefault || 0;

    // Siswa aktif, opsional difilter per kelas (misal seragam cuma buat kelas X tertentu)
    const siswaAktif = await prisma.siswa.findMany({
      where: { status: "aktif", ...(kelasId ? { kelasId } : {}) },
      select: { id: true },
    });

    if (siswaAktif.length === 0) {
      return NextResponse.json(
        { error: "Tidak ditemukan siswa berstatus 'Aktif' untuk dibuatkan tagihan." },
        { status: 400 }
      );
    }

    // Cek siswa yang SUDAH punya tagihan jenis ini yang masih aktif (belum_bayar/menunggu_verifikasi/terlambat)
    // -- supaya generate ulang gak numpuk duplikat tagihan yang sama untuk siswa yang sama.
    const existing = await prisma.tagihanLain.findMany({
      where: {
        jenisTagihanLainId,
        siswaId: { in: siswaAktif.map((s) => s.id) },
        status: { in: ["belum_bayar", "menunggu_verifikasi", "terlambat"] },
      },
      select: { siswaId: true },
    });
    const sudahAdaSet = new Set(existing.map((t) => t.siswaId));

    const siswaBaru = siswaAktif.filter((s) => !sudahAdaSet.has(s.id));

    if (siswaBaru.length === 0) {
      return NextResponse.json({
        dibuat: 0,
        dilewati: siswaAktif.length,
        message: "Semua siswa yang dipilih sudah punya tagihan aktif untuk jenis ini.",
      });
    }

    const tglStr = String(jatuhTempo).split("T")[0];
    const isoJatuhTempo = new Date(`${tglStr}T12:00:00.000Z`);

    await prisma.tagihanLain.createMany({
      data: siswaBaru.map((s) => ({
        siswaId: s.id,
        jenisTagihanLainId,
        tahunAjaranId: tahunAjaranId || null,
        nominal: nominalTerpakai,
        jatuhTempo: isoJatuhTempo,
        status: "belum_bayar" as const,
        keterangan: keterangan || null,
      })),
    });

    return NextResponse.json({
      dibuat: siswaBaru.length,
      dilewati: siswaAktif.length - siswaBaru.length,
    });
  } catch (error: any) {
    console.error("[POST /api/tagihan-lain/generate] Error:", error);
    return NextResponse.json(
      { error: "Gagal generate tagihan lain massal: " + (error.message || "Terjadi kesalahan server") },
      { status: 500 }
    );
  }
}
