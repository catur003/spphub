import { prisma } from "./prisma";

/**
 * Cari semua TagihanSpp yang belum lunas & nominalnya masih Rp 0, lalu
 * sinkronkan ke nominal SPP kelas siswa itu (atau nominal default sekolah
 * kalau kelasnya tidak punya nominal sendiri).
 *
 * Sebelumnya logic ini di-copy 2x (di /api/tagihan/generate dan
 * /api/tagihan/sync-nominal) dan jalan sequential satu-satu ke DB (N+1).
 * Sekarang 1 fungsi, dan update-nya dikirim paralel per grup nominal yang sama.
 */
export async function syncNominalKosong(defaultNominal: number): Promise<number> {
  const tagihanNol = await prisma.tagihanSpp.findMany({
    where: { status: { in: ["belum_bayar", "terlambat"] }, nominal: 0 },
    include: { siswa: { include: { kelas: true } } },
  });

  if (tagihanNol.length === 0) return 0;

  // Kelompokkan id tagihan berdasarkan nominal tujuan, biar bisa updateMany
  // per grup alih-alih 1 query per baris.
  const grupPerNominal = new Map<number, string[]>();

  for (const t of tagihanNol) {
    const nominalKelas =
      t.siswa?.kelas?.nominalSpp && Number(t.siswa.kelas.nominalSpp) > 0
        ? Number(t.siswa.kelas.nominalSpp)
        : defaultNominal;

    if (nominalKelas <= 0) continue;

    const idsUntukNominalIni = grupPerNominal.get(nominalKelas) || [];
    idsUntukNominalIni.push(t.id);
    grupPerNominal.set(nominalKelas, idsUntukNominalIni);
  }

  const hasil = await Promise.all(
    Array.from(grupPerNominal.entries()).map(([nominal, ids]) =>
      prisma.tagihanSpp.updateMany({
        where: { id: { in: ids } },
        data: { nominal },
      })
    )
  );

  return hasil.reduce((total, r) => total + r.count, 0);
}
