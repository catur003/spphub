"use client";

import { IconZap, IconCheckCircle } from "@/components/admin/icons";
import { JenisTagihanLain, KelasOption, TahunAjaran } from "../types";

type GenState = {
  jenisTagihanLainId: string;
  nominal: string;
  jatuhTempo: string;
  tahunAjaranId: string;
  kelasId: string;
  keterangan: string;
};

type Props = {
  gen: GenState;
  setGen: (updater: (g: GenState) => GenState) => void;
  daftarJenis: JenisTagihanLain[];
  kelasList: KelasOption[];
  tahunAjaranList: TahunAjaran[];
  genError: string;
  genResult: { dibuat: number; dilewati: number } | null;
  genLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

const selectClass =
  "w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";
const labelClass = "mb-1 block text-xs font-semibold text-ink-500";

export default function GenerateForm({
  gen,
  setGen,
  daftarJenis,
  kelasList,
  tahunAjaranList,
  genError,
  genResult,
  genLoading,
  onSubmit,
}: Props) {
  const jenisAktif = daftarJenis.filter((j) => j.aktif);

  return (
    <div className="mb-4 rounded-card border border-border-soft bg-white p-5 shadow-sm2">
      <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-ink-900">
        <IconZap className="h-4 w-4" /> Generate Tagihan Massal
      </h2>
      <p className="mb-3 text-xs text-ink-500">
        Bikin tagihan buat semua siswa aktif (atau satu kelas tertentu) sekaligus. Siswa yang sudah
        punya tagihan aktif (belum lunas) untuk jenis yang sama otomatis dilewati, gak akan dobel.
      </p>

      {genError && (
        <div className="mb-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {genError}
        </div>
      )}
      {genResult && (
        <div className="mb-3 rounded-control border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <IconCheckCircle className="mr-1 inline h-4 w-4" />Berhasil membuat <strong>{genResult.dibuat}</strong> tagihan baru ({genResult.dilewati}{" "}
          siswa dilewati / sudah punya tagihan aktif).
        </div>
      )}

      {jenisAktif.length === 0 ? (
        <div className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Belum ada jenis tagihan aktif. Tambah dulu di bagian "Jenis Tagihan Lainnya" di atas.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 md:grid-cols-12">
          <div className="md:col-span-3">
            <label className={labelClass}>Jenis Tagihan</label>
            <select
              className={selectClass}
              value={gen.jenisTagihanLainId}
              onChange={(e) => {
                const j = jenisAktif.find((x) => x.id === e.target.value);
                setGen((g) => ({
                  ...g,
                  jenisTagihanLainId: e.target.value,
                  nominal: j ? String(j.nominalDefault) : g.nominal,
                }));
              }}
              required
            >
              <option value="">-- Pilih Jenis --</option>
              {jenisAktif.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Nominal (Rp)</label>
            <input
              type="number"
              min={0}
              className={selectClass}
              value={gen.nominal}
              onChange={(e) => setGen((g) => ({ ...g, nominal: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Jatuh Tempo</label>
            <input
              type="date"
              className={selectClass}
              value={gen.jatuhTempo}
              onChange={(e) => setGen((g) => ({ ...g, jatuhTempo: e.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Kelas (Opsional)</label>
            <select
              className={selectClass}
              value={gen.kelasId}
              onChange={(e) => setGen((g) => ({ ...g, kelasId: e.target.value }))}
            >
              <option value="">Semua Siswa Aktif</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.namaKelas}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Tahun Ajaran (Opsional)</label>
            <select
              className={selectClass}
              value={gen.tahunAjaranId}
              onChange={(e) => setGen((g) => ({ ...g, tahunAjaranId: e.target.value }))}
            >
              <option value="">-- Tidak diikat --</option>
              {tahunAjaranList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama}
                  {t.aktif ? " (Aktif)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full rounded-control bg-accent px-3 py-2 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover disabled:opacity-60"
              disabled={genLoading}
            >
              {genLoading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <IconZap className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="md:col-span-12">
            <label className={labelClass}>Keterangan (Opsional)</label>
            <input
              className={selectClass}
              placeholder="Misal: Seragam batik kelas X tahun ajaran baru"
              value={gen.keterangan}
              onChange={(e) => setGen((g) => ({ ...g, keterangan: e.target.value }))}
            />
          </div>
        </form>
      )}
    </div>
  );
}
