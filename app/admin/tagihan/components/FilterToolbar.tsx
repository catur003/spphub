"use client";

import { IconSearch, IconX } from "@/components/admin/icons";
import { KelasOption, BULAN_LABEL, STATUS_INFO } from "../types";

type Props = {
  filterQ: string;
  setFilterQ: (v: string) => void;
  filterTingkat: string;
  setFilterTingkat: (v: string) => void;
  filterKelasId: string;
  setFilterKelasId: (v: string) => void;
  filterBulan: string;
  setFilterBulan: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  tingkatOptions: (number | undefined)[];
  filteredKelasList: KelasOption[];
  kelasList: KelasOption[];
  totalCount: number;
  isFilterActive: boolean;
  onReset: () => void;
};

const selectClass =
  "w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";

export default function FilterToolbar({
  filterQ,
  setFilterQ,
  filterTingkat,
  setFilterTingkat,
  filterKelasId,
  setFilterKelasId,
  filterBulan,
  setFilterBulan,
  filterStatus,
  setFilterStatus,
  tingkatOptions,
  filteredKelasList,
  kelasList,
  totalCount,
  isFilterActive,
  onReset,
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

        <div className="md:col-span-2">
          <select
            className={selectClass}
            value={filterTingkat}
            onChange={(e) => {
              setFilterTingkat(e.target.value);
              setFilterKelasId("");
            }}
          >
            <option value="">Semua Kelas</option>
            {tingkatOptions.map((t) => (
              <option key={t} value={t}>
                Kelas {t}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            className={selectClass}
            value={filterKelasId}
            onChange={(e) => setFilterKelasId(e.target.value)}
          >
            <option value="">Semua Jurusan {filterTingkat ? `(Kelas ${filterTingkat})` : ""}</option>
            {filteredKelasList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namaKelas} {k.nominalSpp ? `(Rp ${(k.nominalSpp / 1000).toFixed(0)}k)` : "(Rp 0 - belum diatur)"}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <select className={selectClass} value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}>
            <option value="">Semua Bulan</option>
            {BULAN_LABEL.slice(1).map((lbl, i) => (
              <option key={i + 1} value={i + 1}>
                {lbl}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <select className={selectClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            {Object.entries(STATUS_INFO).map(([val, info]) => (
              <option key={val} value={val}>
                {info.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isFilterActive && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-2">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="mr-1 font-semibold text-ink-500">Filter Aktif:</span>
            {filterTingkat && (
              <span className="rounded-full bg-accent-soft px-2 py-1 text-accent-hover">
                Kelas {filterTingkat}
              </span>
            )}
            {filterKelasId && (
              <span className="rounded-full bg-accent px-2 py-1 text-white">
                Jurusan {kelasList.find((k) => k.id === filterKelasId)?.namaKelas}
              </span>
            )}
            {filterBulan && (
              <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-800">
                Bulan {BULAN_LABEL[Number(filterBulan)]}
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
