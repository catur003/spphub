"use client";

import { useEffect, useMemo, useState } from "react";
import { Kelas } from "../types";
import { IconRefresh, IconCheckCircle, IconWarning } from "@/components/admin/icons";

type SiswaRingkas = { id: string; namaLengkap: string; nis: string };

type Props = {
  show: boolean;
  kelasList: Kelas[];
  naikKelasAsal: string;
  setNaikKelasAsal: (v: string) => void;
  naikKelasTujuan: string;
  setNaikKelasTujuan: (v: string) => void;
  loadingNaikKelas: boolean;
  onClose: () => void;
  /** siswaIds: undefined = semua siswa aktif di kelas asal (perilaku lama). */
  onEksekusi: (siswaIds?: string[]) => void;
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

  // Daftar siswa aktif di kelas asal — dipakai buat checkbox pilih-siswa.
  // Di-fetch ulang tiap kali kelas asal ganti. Defaultnya SEMUA tercentang,
  // biar perilaku "naikkan semua siswa di kelas ini" tetap jadi default
  // yang sama seperti sebelum fitur pilih-siswa ini ada.
  const [daftarSiswa, setDaftarSiswa] = useState<SiswaRingkas[]>([]);
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set());
  const [loadingSiswa, setLoadingSiswa] = useState(false);

  useEffect(() => {
    if (!naikKelasAsal) {
      setDaftarSiswa([]);
      setTerpilih(new Set());
      return;
    }
    let batal = false;
    setLoadingSiswa(true);
    fetch(`/api/siswa?kelasId=${naikKelasAsal}&status=aktif`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SiswaRingkas[]) => {
        if (batal) return;
        setDaftarSiswa(data);
        setTerpilih(new Set(data.map((s) => s.id))); // default: semua tercentang
      })
      .catch(() => {
        if (!batal) setDaftarSiswa([]);
      })
      .finally(() => {
        if (!batal) setLoadingSiswa(false);
      });
    return () => {
      batal = true;
    };
  }, [naikKelasAsal]);

  function toggleSiswa(id: string) {
    setTerpilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSemua() {
    setTerpilih((prev) => (prev.size === daftarSiswa.length ? new Set() : new Set(daftarSiswa.map((s) => s.id))));
  }

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

  function handleEksekusiClick() {
    // Kalau semua siswa yang ke-load tercentang, kirim tanpa siswaIds sama
    // sekali (biar backend jalanin "semua siswa aktif di kelas asal" apa
    // adanya, gak tergantung timing fetch daftarSiswa di modal ini).
    const semuaTercentang = daftarSiswa.length > 0 && terpilih.size === daftarSiswa.length;
    onEksekusi(semuaTercentang ? undefined : Array.from(terpilih));
  }

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
                  {k.tingkat ?? "?"} — {k.namaKelas}
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
                  {k.tingkat} — {k.namaKelas}
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

          {naikKelasAsal && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold text-ink-700">
                  Siswa yang Dinaikkan ({terpilih.size}/{daftarSiswa.length})
                </label>
                {daftarSiswa.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-accent hover:underline"
                    onClick={toggleSemua}
                  >
                    {terpilih.size === daftarSiswa.length ? "Batalkan semua" : "Pilih semua"}
                  </button>
                )}
              </div>
              <p className="mb-2 text-xs text-ink-500">
                Defaultnya semua siswa aktif di kelas ini tercentang. Hilangkan centang siswa yang{" "}
                <strong>tidak</strong> ikut dinaikkan (mis. tinggal kelas) — sisanya tetap di{" "}
                {kelasAsalObj?.namaKelas || "kelas ini"}.
              </p>
              <div className="max-h-40 overflow-y-auto rounded-control border border-border-soft">
                {loadingSiswa ? (
                  <p className="p-3 text-center text-xs text-ink-500">Memuat daftar siswa...</p>
                ) : daftarSiswa.length === 0 ? (
                  <p className="p-3 text-center text-xs text-ink-500">Tidak ada siswa aktif di kelas ini.</p>
                ) : (
                  daftarSiswa.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 border-b border-border-soft px-3 py-1.5 text-sm last:border-b-0 hover:bg-surface"
                    >
                      <input
                        type="checkbox"
                        checked={terpilih.has(s.id)}
                        onChange={() => toggleSiswa(s.id)}
                        className="h-4 w-4 rounded border-border-soft text-accent focus:ring-accent"
                      />
                      <span className="text-ink-900">{s.namaLengkap}</span>
                      <span className="text-xs text-ink-400">({s.nis})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
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
            disabled={loadingNaikKelas || !naikKelasAsal || !naikKelasTujuan || terpilih.size === 0}
            onClick={handleEksekusiClick}
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
