"use client";

import { Kelas, kelasColor } from "../types";

type Props = {
  editKelas: Kelas | null;
  setEditKelas: (k: Kelas) => void;
  error: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export default function KelasEditModal({
  editKelas,
  setEditKelas,
  error,
  loading,
  onClose,
  onSubmit,
}: Props) {
  if (!editKelas) return null;

  return (
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-lg2"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-gradient-to-r from-accent to-violet-600 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-control text-xs font-bold text-white ${kelasColor(
                editKelas.namaKelas
              )}`}
            >
              {editKelas.namaKelas.slice(0, 2).toUpperCase()}
            </div>
            <h5 className="text-base font-bold text-white">
              Edit Biaya SPP &amp; Kelas {editKelas.namaKelas}
            </h5>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            className="text-xl leading-none text-white/85 hover:text-white"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 p-5">
            {error && (
              <div className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
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
                  className="w-full border-0 px-3 py-2.5 text-lg font-bold text-status-lunas outline-none"
                  value={editKelas.nominalSpp || 0}
                  onChange={(e) =>
                    setEditKelas({ ...editKelas, nominalSpp: Number(e.target.value) })
                  }
                  required
                  min={0}
                  placeholder="Contoh: 350000"
                />
              </div>
              <div className="mt-1 text-xs text-ink-500">
                Nominal ini akan otomatis dipakai saat generate tagihan massal untuk siswa di
                kelas ini.
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-900">Nama Kelas</label>
              <input
                className="w-full rounded-control border border-border-soft px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                value={editKelas.namaKelas}
                onChange={(e) => setEditKelas({ ...editKelas, namaKelas: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-900">
                Tingkat / Jenjang
              </label>
              <input
                type="number"
                className="w-full rounded-control border border-border-soft px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                value={editKelas.tingkat}
                onChange={(e) => setEditKelas({ ...editKelas, tingkat: Number(e.target.value) })}
                required
                min={1}
                max={15}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-900">Wali Kelas</label>
              <input
                className="w-full rounded-control border border-border-soft px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                value={editKelas.waliKelas || ""}
                onChange={(e) => setEditKelas({ ...editKelas, waliKelas: e.target.value })}
                placeholder="Nama Guru Wali Kelas"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">
            <button
              type="button"
              className="rounded-control border border-border-soft px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-control bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Menyimpan..." : "💾 Simpan Biaya SPP & Kelas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
