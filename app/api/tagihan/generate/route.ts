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

    const body = await req.json().catch(() => ({}));
    const { bulan, tahun, nominal, tahunAjaranId, jatuhTempo } = body;

    if (!bulan || !tahun || !tahunAjaranId || !jatuhTempo) {
      return NextResponse.json(
        { error: "Bulan, tahun, tahun ajaran, dan jatuh tempo wajib diisi" },
        { status: 400 }
      );
    }

    // Verify tahunAjaran
    const ta = await prisma.tahunAjaran.findUnique({ where: { id: tahunAjaranId } });
    if (!ta) {
      return NextResponse.json({ error: "Tahun ajaran yang dipilih tidak ditemukan" }, { status: 400 });
    }

    // 1. Fetch profil sekolah untuk nominal SPP default fallback
    const profil = await prisma.profilSekolah.findFirst();
    const defaultNominal = Number(nominal) || profil?.nominalSppDefault || 0;

    // 2. Fetch siswa aktif beserta data kelas (Billing Rules)
    const siswaAktif = await prisma.siswa.findMany({
      where: { status: "aktif" },
      include: { kelas: true },
    });

    if (siswaAktif.length === 0) {
      return NextResponse.json(
        { error: "Tidak ditemukan siswa berstatus 'Aktif' di database untuk dibuatkan tagihan." },
        { status: 400 }
      );
    }

    // 3. Cek tagihan yang sudah pernah terbuat untuk periode ini
    const existing = await prisma.tagihanSpp.findMany({
      where: { tahunAjaranId, bulan: Number(bulan), tahun: Number(tahun) },
      select: { siswaId: true },
    });
    const sudahAdaSet = new Set(existing.map((t) => t.siswaId));

    const siswaBaru = siswaAktif.filter((s) => !sudahAdaSet.has(s.id));

    if (siswaBaru.length === 0) {
      return NextResponse.json({
        dibuat: 0,
        dilewati: siswaAktif.length,
        message: "Semua siswa aktif sudah memiliki tagihan untuk periode bulan ini.",
      });
    }

    // Standardize ISO Date for Jatuh Tempo to avoid UTC/WIB offset drift
    const tglStr = String(jatuhTempo).split("T")[0];
    const isoJatuhTempo = new Date(`${tglStr}T12:00:00.000Z`);

    // 4. Batch Create Tagihan
    await prisma.tagihanSpp.createMany({
      data: siswaBaru.map((s) => {
        const nominalKelas =
          s.kelas?.nominalSpp && Number(s.kelas.nominalSpp) > 0
            ? Number(s.kelas.nominalSpp)
            : defaultNominal;

        return {
          siswaId: s.id,
          tahunAjaranId,
          bulan: Number(bulan),
          tahun: Number(tahun),
          nominal: nominalKelas,
          jatuhTempo: isoJatuhTempo,
          status: "belum_bayar" as const,
        };
      }),
    });

    return NextResponse.json({
      dibuat: siswaBaru.length,
      dilewati: siswaAktif.length - siswaBaru.length,
    });
  } catch (error: any) {
    console.error("[POST /api/tagihan/generate] Error:", error);
    return NextResponse.json(
      { error: "Gagal generate tagihan massal: " + (error.message || "Terjadi kesalahan server") },
      { status: 500 }
    );
  }
}
