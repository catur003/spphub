"use client";

import { IconSearch, IconX } from "@/components/admin/icons";
import { JenisTagihanLain, KelasOption, STATUS_INFO } from "../types";

type PresetOption = { id: string; nama: string };

type Props = {
  filterQ: string;
  setFilterQ: (v: string) => void;
  filterJenisId: string;
  setFilterJenisId: (v: string) => void;
  filterKelasId: string;
  setFilterKelasId: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterPresetId: string;
  setFilterPresetId: (v: string) => void;
  filterPresetList: PresetOption[];
  daftarJenis: JenisTagihanLain[];
  kelasList: KelasOption[];
  totalCount: number;
  isFilterActive: boolean;
  onReset: () => void;
  includeNonAktif: boolean;
  setIncludeNonAktif: (v: boolean) => void;
};

const selectClass =
  "w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";

export default function FilterToolbar({
  filterQ,
  setFilterQ,
  filterJenisId,
  setFilterJenisId,
  filterKelasId,
  setFilterKelasId,
  filterStatus,
  setFilterStatus,
  filterPresetId,
  setFilterPresetId,
  filterPresetList,
  daftarJenis,
  kelasList,
  totalCount,
  isFilterActive,
  onReset,
  includeNonAktif,
  setIncludeNonAktif,
}: Props) {
  return (
    <div className="mb-4 rounded-card border border-border-soft bg-white p-4 shadow-sm2">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-sm font-bold text-ink-900">
          <IconSearch width={15} height={15} /> Filter Data Tagihan
        </span>
        <span className="text-sm text-ink-500">
          Total: <strong>{totalCount}</strong> tagihan
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-12 md:items-center">
        <div className="col-span-2 md:col-span-3">
          <input
            className={selectClass}
            placeholder="Cari nama siswa / NIS..."
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
          />
        </div>

        <div className="md:col-span-3">
          <select className={selectClass} value={filterJenisId} onChange={(e) => setFilterJenisId(e.target.value)}>
            <option value="">Semua Jenis</option>
            {daftarJenis.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <select className={selectClass} value={filterKelasId} onChange={(e) => setFilterKelasId(e.target.value)}>
            <option value="">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namaKelas}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <select className={selectClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            {Object.entries(STATUS_INFO).map(([val, info]) => (
              <option key={val} value={val}>
                {info.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 md:col-span-3">
          <select className={selectClass} value={filterPresetId} onChange={(e) => setFilterPresetId(e.target.value)}>
            <option value="">Semua Jatuh Tempo</option>
            {filterPresetList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-2 flex w-fit items-center gap-1.5 text-xs text-ink-500">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-border-soft text-accent focus:ring-accent"
          checked={includeNonAktif}
          onChange={(e) => setIncludeNonAktif(e.target.checked)}
        />
        Tampilkan siswa Nonaktif/Lulus/Pindah (untuk cari &amp; hapus tagihan lunas mereka)
      </label>

      {isFilterActive && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-2">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="mr-1 font-semibold text-ink-500">Filter Aktif:</span>
            {filterJenisId && (
              <span className="rounded-full bg-accent px-2 py-1 text-white">
                {daftarJenis.find((j) => j.id === filterJenisId)?.nama}
              </span>
            )}
            {filterKelasId && (
              <span className="rounded-full bg-accent-soft px-2 py-1 text-accent-hover">
                {kelasList.find((k) => k.id === filterKelasId)?.namaKelas}
              </span>
            )}
            {filterStatus && (
              <span className="rounded-full bg-ink-500/15 px-2 py-1 text-ink-700">
                {STATUS_INFO[filterStatus]?.label}
              </span>
            )}
            {filterQ && (
              <span className="rounded-full bg-ink-900 px-2 py-1 text-white">Cari: "{filterQ}"</span>
            )}
            {(filterPresetId && filterPresetList.find((p) => p.id === filterPresetId)) && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                Jatuh Tempo: {filterPresetList.find((p) => p.id === filterPresetId)?.nama}
              </span>
            )}
          </div>
          <button
            className="ml-auto inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
            onClick={onReset}
          >
            <IconX className="h-3 w-3" /> Reset Filter
          </button>
        </div>
      )}
    </div>
  );
}
