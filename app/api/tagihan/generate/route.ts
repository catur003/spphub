import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

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

    // Dulu ada panggilan `await syncNominalKosong(defaultNominal)` di sini —
    // dihapus karena berbahaya: `defaultNominal` itu nominal yang DIKETIK
    // admin buat generate BULAN INI (bisa beda tiap kali generate, mis. ada
    // kenaikan SPP tahun ajaran baru), tapi syncNominalKosong() nyapu SEMUA
    // tagihan Rp 0 di SELURUH periode/bulan lain — bukan cuma yang lagi
    // digenerate. Efeknya: generate tagihan Maret dengan nominal custom
    // bisa diam-diam nimpa tagihan Rp 0 di bulan Januari yang sengaja
    // dibiarkan 0 (mis. nunggu admin isi keringanan/beasiswa) jadi ikutan
    // ke-set nominal Maret itu. Sinkronisasi nominal kosong sudah ada
    // tombol & endpoint terpisah yang eksplisit (POST /api/tagihan/sync-nominal,
    // dipanggil dari admin/tagihan/page.tsx), yang benar pakai
    // profilSekolah.nominalSppDefault sebagai fallback global — itu tempat
    // yang tepat buat aksi ini, bukan efek samping tersembunyi di generate.

    // 3. Cek tagihan yang sudah pernah dibuat untuk periode bulan & tahun ini (Melindungi status Lunas dll)
    const existing = await prisma.tagihanSpp.findMany({
      where: { bulan: Number(bulan), tahun: Number(tahun) },
      select: { siswaId: true },
    });
    const sudahAdaSet = new Set(existing.map((t) => t.siswaId));

    // Siswa yang BELUM punya tagihan sama sekali di bulan & tahun ini
    const siswaBaru = siswaAktif.filter((s) => !sudahAdaSet.has(s.id));

    if (siswaBaru.length === 0) {
      return NextResponse.json({
        dibuat: 0,
        dilewati: siswaAktif.length,
        message: "Semua siswa aktif sudah memiliki tagihan untuk periode bulan ini (termasuk tagihan LUNAS).",
      });
    }

    // Standardize ISO Date for Jatuh Tempo - Seragam & Ter-sinkronisasi untuk seluruh kelas
    const tglStr = String(jatuhTempo).split("T")[0];
    const isoJatuhTempo = new Date(`${tglStr}T12:00:00.000Z`);

    const dataTagihan = siswaBaru.map((s) => {
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
    });

    // 4. Batch Create Tagihan.
    //
    // RACE CONDITION: antara SELECT "existing" di atas dan INSERT ini ada
    // jeda waktu. Kalau admin double-klik tombol Generate (submit dobel
    // hampir bersamaan — realistis kalau request pertama lambat), request
    // KEDUA bisa lolos filter siswaBaru dengan siswaId yang SAMA seperti
    // yang baru saja diinsert request pertama. MySQL nolak insert itu lewat
    // constraint @@unique([siswaId, tahunAjaranId, bulan, tahun]) di schema
    // (jadi data TETAP konsisten, gak ada duplikat tagihan) — tapi Prisma
    // MySQL gak dukung `skipDuplicates` di createMany, jadi tanpa fallback
    // ini SELURUH batch bakal gagal 500 walau cuma 1 siswa yang bentrok.
    //
    // Fix: coba createMany dulu (jalur cepat, umumnya berhasil karena race
    // ini jarang kejadian). Kalau kena P2002 (unique constraint), baru
    // fallback ke insert satu-satu yang masing-masing nangkep P2002-nya
    // sendiri, biar siswa yang gak bentrok tetap kebuat tagihannya.
    try {
      await prisma.tagihanSpp.createMany({ data: dataTagihan });

      return NextResponse.json({
        dibuat: dataTagihan.length,
        dilewati: siswaAktif.length - dataTagihan.length,
      });
    } catch (err: any) {
      if (err?.code !== "P2002") throw err;

      let dibuat = 0;
      let bentrok = 0;
      for (const item of dataTagihan) {
        try {
          await prisma.tagihanSpp.create({ data: item });
          dibuat++;
        } catch (errBaris: any) {
          if (errBaris?.code === "P2002") {
            bentrok++;
            continue;
          }
          throw errBaris;
        }
      }

      return NextResponse.json({
        dibuat,
        dilewati: siswaAktif.length - dataTagihan.length + bentrok,
        note:
          bentrok > 0
            ? `${bentrok} siswa dilewati karena tagihan periode ini baru saja dibuat request lain (kemungkinan tombol Generate diklik dobel).`
            : undefined,
      });
    }
  } catch (error: any) {
    console.error("[POST /api/tagihan/generate] Error:", error);
    return NextResponse.json(
      { error: "Gagal generate tagihan massal: " + (error.message || "Terjadi kesalahan server") },
      { status: 500 }
    );
  }
}
