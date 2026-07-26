"use client";

import { Kelas } from "../types";

type Props = {
  kelasBelumSet: Kelas[];
  namaKelas: string;
  setNamaKelas: (v: string) => void;
  tingkat: string;
  setTingkat: (v: string) => void;
  waliKelas: string;
  setWaliKelas: (v: string) => void;
  nominalSpp: string;
  setNominalSpp: (v: string) => void;
  error: string;
  editKelas: unknown;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export default function KelasFormTambah({
  kelasBelumSet,
  namaKelas,
  setNamaKelas,
  tingkat,
  setTingkat,
  waliKelas,
  setWaliKelas,
  nominalSpp,
  setNominalSpp,
  error,
  editKelas,
  loading,
  onSubmit,
}: Props) {
  return (
    <>
      {kelasBelumSet.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-card border border-amber-300 bg-amber-50 px-4 py-3">
          <div>
            <strong className="text-ink-900">⚠️ Peringatan SPP:</strong>{" "}
            <span className="text-ink-700">
              Terdapat <strong>{kelasBelumSet.length} kelas</strong> (
              {kelasBelumSet.slice(0, 3).map((k) => k.namaKelas).join(", ")}) yang biaya SPP-nya
              belum diatur (masih Rp 0).
            </span>
            <div className="text-sm text-ink-500">
              Klik tombol <strong>Edit</strong> di sebelah kanan baris kelas untuk mengatur tarif
              SPP agar tagihan massal akurat.
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm2">
        <div className="rounded-t-card bg-gradient-to-r from-accent to-violet-600 px-4 py-3.5">
          <h2 className="m-0 text-sm font-bold text-white">✚ Tambah Kelas Baru</h2>
        </div>
        <div className="p-4">
          {error && !editKelas && (
            <div className="mb-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-900">Nama Kelas</label>
              <input
                className="w-full rounded-control border border-border-soft px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                value={namaKelas}
                onChange={(e) => setNamaKelas(e.target.value)}
                required
                placeholder="Contoh: 10 IPA 1, 7A"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-900">
                Tingkat / Jenjang
              </label>
              <input
                type="number"
                className="w-full rounded-control border border-border-soft px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                value={tingkat}
                onChange={(e) => setTingkat(e.target.value)}
                placeholder="Contoh: 7, 8, 9, 10, 11, 12"
                required
                min={1}
                max={15}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-900">
                Wali Kelas (Opsional)
              </label>
              <input
                className="w-full rounded-control border border-border-soft px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                value={waliKelas}
                onChange={(e) => setWaliKelas(e.target.value)}
                placeholder="Nama Guru Wali Kelas"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-900">
                Biaya SPP per Bulan (Rp)
              </label>
              <div className="flex overflow-hidden rounded-control border border-border-soft focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
                <span className="flex items-center bg-surface px-3 text-sm font-semibold text-ink-500">
                  Rp
                </span>
                <input
                  type="number"
                  className="w-full border-0 px-3 py-2 text-sm text-ink-900 outline-none"
                  value={nominalSpp}
                  onChange={(e) => setNominalSpp(e.target.value)}
                  placeholder="Contoh: 350000"
                  required
                  min={0}
                />
              </div>
            </div>
            <button
              className="w-full rounded-control bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Menyimpan...
                </span>
              ) : (
                "Tambah Kelas"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
