"use client";

import { useMemo } from "react";
import { Kelas } from "../types";
import { IconRefresh, IconCheckCircle, IconWarning } from "@/components/admin/icons";

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
  const kelasAsalObj = kelasList.find((k) => k.id === naikKelasAsal) || null;
  const tingkatAsal = kelasAsalObj?.tingkat;

  // INI BEDANYA "Naik Kelas" vs "Pindah Kelas" (yang bikin bingung
  // sebelumnya): kelas tujuan gak lagi bisa dipilih bebas ke jurusan mana
  // pun. Di sini cuma ditawarin kelas yang TINGKAT-nya persis
  // tingkatAsal + 1 — itu baru namanya "naik kelas". Kalau admin memang
  // butuh mindahin siswa ke jurusan lain di tingkat yang SAMA (pindah
  // jurusan, bukan naik tingkat), itu tindakan beda dan sebaiknya dilakukan
  // per-siswa lewat Edit Siswa, bukan lewat tool massal ini.
  const kandidatTujuan = useMemo(() => {
    if (tingkatAsal === undefined) return [];
    return kelasList.filter((k) => k.tingkat === tingkatAsal + 1);
  }, [kelasList, tingkatAsal]);

  const asalAdalahTingkatTertinggi =
    tingkatAsal !== undefined && kandidatTujuan.length === 0;

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-[20px] bg-white shadow-lg2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] px-6 py-4">
          <h5 className="mb-0 inline-flex items-center gap-1.5 text-base font-bold text-white">
            <IconRefresh className="h-4 w-4" /> Naik Kelas Massal (Kenaikan Tingkat)
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
            Naikkan seluruh siswa aktif di satu kelas ke <strong>tingkat berikutnya</strong> sekaligus (mis. semua
            siswa Kelas 10 IPA 1 → Kelas 11 IPA 1), atau tandai <strong>Lulus/Alumni</strong> kalau kelasnya sudah
            tingkat akhir. Ini bukan buat mindahin siswa ke jurusan lain di tingkat yang sama — untuk itu, edit data
            siswa satu-satu di menu Data Siswa.
          </p>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-ink-700">Kelas Asal (Tingkat Sekarang)</label>
            <select
              className="w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
              value={naikKelasAsal}
              onChange={(e) => {
                setNaikKelasAsal(e.target.value);
                setNaikKelasTujuan(""); // kelas tujuan tergantung kelas asal, reset tiap ganti
              }}
            >
              <option value="">-- Pilih Kelas Asal --</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.namaKelas} (Tingkat {k.tingkat ?? "?"})
                </option>
              ))}
            </select>
          </div>
          <div className="mb-1">
            <label className="mb-1 block text-xs font-semibold text-ink-700">
              Naik Ke Kelas Tujuan (Tingkat {tingkatAsal !== undefined ? tingkatAsal + 1 : "berikutnya"})
            </label>
            <select
              className="w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm font-bold text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft disabled:bg-surface disabled:text-ink-500"
              value={naikKelasTujuan}
              onChange={(e) => setNaikKelasTujuan(e.target.value)}
              disabled={!naikKelasAsal}
            >
              <option value="">-- Pilih Kelas Tujuan --</option>
              {kandidatTujuan.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.namaKelas} (Tingkat {k.tingkat})
                </option>
              ))}
              <option value="lulus">Tandai LULUS / ALUMNI (Kelulusan)</option>
            </select>
            {asalAdalahTingkatTertinggi && (
              <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-600">
                <IconWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Gak ada kelas di tingkat berikutnya (kelas ini tampaknya tingkat tertinggi) — pilihan yang masuk akal
                di sini cuma Lulus/Alumni.
              </p>
            )}
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
                <IconCheckCircle className="h-4 w-4" /> Naikkan Kelas Massal
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
