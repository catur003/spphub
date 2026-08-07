"use client";

import { Kelas } from "../types";

type Props = {
  q: string;
  setQ: (v: string) => void;
  filterTingkat: string;
  setFilterTingkat: (v: string) => void;
  filterKelasId: string;
  setFilterKelasId: (v: string) => void;
  kelasList: Kelas[];
};

const inputClass =
  "w-full rounded-control border border-border-soft px-3 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";

export default function SiswaFilterBar({
  q,
  setQ,
  filterTingkat,
  setFilterTingkat,
  filterKelasId,
  setFilterKelasId,
  kelasList,
}: Props) {
  const tingkatOptions = Array.from(new Set(kelasList.map((k) => k.tingkat).filter(Boolean))).sort(
    (a, b) => Number(a) - Number(b)
  );
  const kelasOptions = filterTingkat ? kelasList.filter((k) => String(k.tingkat) === filterTingkat) : kelasList;

  return (
    <div className="mb-3 rounded-card border border-border-soft bg-white p-3 shadow-sm2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
        <div className="md:col-span-5">
          <input
            className={inputClass}
            placeholder="Cari nama siswa / NIS / NISN..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="md:col-span-3">
          <select
            className={inputClass}
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
        <div className="md:col-span-4">
          <select className={inputClass} value={filterKelasId} onChange={(e) => setFilterKelasId(e.target.value)}>
            <option value="">Semua Jurusan {filterTingkat ? `(Kelas ${filterTingkat})` : ""}</option>
            {kelasOptions.map((k) => (
              <option key={k.id} value={k.id}>
                {k.tingkat ?? "?"} — {k.namaKelas}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
