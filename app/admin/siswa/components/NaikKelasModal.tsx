"use client";

import { Kelas } from "../types";
import { IconRefresh, IconCheckCircle } from "@/components/admin/icons";

type Props = {
  show: boolean;
  kelasList: Kelas[];
  naikKelasAsal: string;
  setNaikKelasAsal: (v: string) => void;
  naikKelasTujuan: string;
  setNaikKelasTujuan: (v: string) => void;
  loadingNaikKelas: boolean;
  onClose: () => void;
  onEksekusi: () => void;
};

export default function NaikKelasModal({
  show,
  kelasList,
  naikKelasAsal,
  setNaikKelasAsal,
  naikKelasTujuan,
  setNaikKelasTujuan,
  loadingNaikKelas,
  onClose,
  onEksekusi,
}: Props) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-[20px] bg-white shadow-lg2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] px-6 py-4">
          <h5 className="mb-0 inline-flex items-center gap-1.5 text-base font-bold text-white">
            <IconRefresh className="h-4 w-4" /> Naik Kelas Massal
          </h5>
          <button
            type="button"
            aria-label="Tutup"
            className="text-xl leading-none text-white/80 hover:text-white"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="p-5">
          <p className="mb-3 text-sm text-ink-500">
            Fitur ini memindahkan seluruh siswa aktif dari satu kelas ke kelas baru (atau mengubah status menjadi
            Lulus/Alumni) secara otomatis dalam 1 klik.
          </p>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-ink-700">Pilih Kelas Asal (Siswa Aktif)</label>
            <select
              className="w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
              value={naikKelasAsal}
              onChange={(e) => setNaikKelasAsal(e.target.value)}
            >
              <option value="">-- Pilih Kelas Asal --</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  Jurusan {k.namaKelas} (Kelas {k.tingkat})
                </option>
              ))}
            </select>
          </div>
          <div className="mb-1">
            <label className="mb-1 block text-xs font-semibold text-ink-700">
              Pilih Kelas Tujuan Baru (Atau Status Lulus)
            </label>
            <select
              className="w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm font-bold text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
              value={naikKelasTujuan}
              onChange={(e) => setNaikKelasTujuan(e.target.value)}
            >
              <option value="">-- Pilih Kelas Tujuan --</option>
              <option value="lulus">Tandai LULUS / ALUMNI (Kelulusan)</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  Pindah ke Jurusan {k.namaKelas} (Kelas {k.tingkat})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 rounded-b-[20px] bg-surface p-4">
          <button
            type="button"
            className="rounded-full border border-border-soft px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-white"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            type="button"
            className="rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-bold text-white shadow-sm2 disabled:opacity-60"
            disabled={loadingNaikKelas || !naikKelasAsal || !naikKelasTujuan}
            onClick={onEksekusi}
          >
            {loadingNaikKelas ? (
              "Memproses..."
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <IconCheckCircle className="h-4 w-4" /> Eksekusi Pindah Massal
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
