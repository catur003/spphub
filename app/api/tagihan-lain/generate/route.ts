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

    // RACE CONDITION (lebih serius dari TagihanSpp): model TagihanLain gak
    // punya @@unique constraint di schema sama sekali (beda dari TagihanSpp
    // yang dilindungi @@unique([siswaId, tahunAjaranId, bulan, tahun])).
    // Artinya kalau admin double-submit generate nyaris bersamaan, cek
    // "existing" di atas bisa sama-sama gak nemu apa-apa buat SISWA YANG
    // SAMA di kedua request, dan createMany bakal BENERAN bikin 2 row
    // tagihan duplikat buat siswa itu — bukan cuma gagal 500 kayak di
    // TagihanSpp, tapi korupsi data keuangan sungguhan (double tagih).
    //
    // Fix: bungkus re-check + insert dalam SATU transaction, dan insert
    // satu-per-satu di dalamnya (bukan createMany) supaya begitu satu row
    // ke-commit, request lain yang re-check akan lihat row itu. Ini bukan
    // proteksi 100% sekelas unique constraint DB (MySQL default isolation
    // level REPEATABLE READ masih bisa phantom read antar transaction
    // paralel di kasus ekstrem), makanya idealnya @@unique juga ditambah
    // di schema — tapi itu perlu migration terpisah (di luar scope fix
    // kode ini). Untuk sekarang ini menutup celah di kasus paling umum:
    // double-klik tombol yang requestnya gak benar-benar 100% simultan.
    let dibuat = 0;
    let bentrok = 0;

    await prisma.$transaction(async (tx) => {
      for (const s of siswaBaru) {
        const masihAda = await tx.tagihanLain.findFirst({
          where: {
            jenisTagihanLainId,
            siswaId: s.id,
            status: { in: ["belum_bayar", "menunggu_verifikasi", "terlambat"] },
          },
          select: { id: true },
        });
        if (masihAda) {
          bentrok++;
          continue;
        }

        await tx.tagihanLain.create({
          data: {
            siswaId: s.id,
            jenisTagihanLainId,
            tahunAjaranId: tahunAjaranId || null,
            nominal: nominalTerpakai,
            jatuhTempo: isoJatuhTempo,
            status: "belum_bayar" as const,
            keterangan: keterangan || null,
          },
        });
        dibuat++;
      }
    });

    return NextResponse.json({
      dibuat,
      dilewati: siswaAktif.length - siswaBaru.length + bentrok,
      note:
        bentrok > 0
          ? `${bentrok} siswa dilewati karena tagihan jenis ini baru saja dibuat request lain (kemungkinan tombol Generate diklik dobel).`
          : undefined,
    });
  } catch (error: any) {
    console.error("[POST /api/tagihan-lain/generate] Error:", error);
    return NextResponse.json(
      { error: "Gagal generate tagihan lain massal: " + (error.message || "Terjadi kesalahan server") },
      { status: 500 }
    );
  }
}
