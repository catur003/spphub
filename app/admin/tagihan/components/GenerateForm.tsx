"use client";

import Link from "next/link";
import { IconSync } from "@/components/admin/icons";
import { TahunAjaran, KelasOption, BULAN_LABEL, TAHUN_OPTIONS } from "../types";

type GenState = {
  tahunAjaranId: string;
  bulan: string;
  tahun: string;
  nominal: string;
  jatuhTempo: string;
};

type Props = {
  gen: GenState;
  setGen: (updater: (g: GenState) => GenState) => void;
  tahunAjaranList: TahunAjaran[];
  kelasBelumSet: KelasOption[];
  genError: string;
  genResult: { dibuat: number; dilewati: number } | null;
  genLoading: boolean;
  syncingNominal: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSyncNominal: () => void;
};

const selectClass =
  "w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";
const labelClass = "mb-1 block text-xs font-semibold text-ink-500";

export default function GenerateForm({
  gen,
  setGen,
  tahunAjaranList,
  kelasBelumSet,
  genError,
  genResult,
  genLoading,
  syncingNominal,
  onSubmit,
  onSyncNominal,
}: Props) {
  return (
    <div className="mb-4 rounded-card border border-border-soft bg-white p-5 shadow-sm2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 flex items-center gap-2 text-base font-bold text-ink-900">
          <span>⚡</span> Generate Tagihan Massal Otomatis
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-400 px-3 py-1 text-xs font-bold text-amber-600 transition hover:bg-amber-50 disabled:opacity-60"
            onClick={onSyncNominal}
            disabled={syncingNominal}
            title="Update tagihan belum bayar Rp 0 menjadi nominal SPP kelas/sekolah yang valid"
          >
            {syncingNominal ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
            ) : (
              <IconSync width={14} height={14} />
            )}
            Sync Nominal SPP
          </button>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent-hover">
            💡 Sync otomatis nominal per kelas
          </span>
        </div>
      </div>
      <p className="mb-3 text-xs text-ink-500">
        Nominal tagihan setiap siswa akan diambil otomatis dari Biaya SPP Kelas siswa yang diatur
        pada menu <strong>Data Kelas</strong>. Tagihan yang sudah LUNAS terlindungi dan tidak akan
        pernah terduplikasi.
      </p>

      {kelasBelumSet.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-control border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          <div>
            <strong>⚠️ Peringatan:</strong> Ada <strong>{kelasBelumSet.length} kelas</strong> (
            {kelasBelumSet.slice(0, 3).map((k) => k.namaKelas).join(", ")}) yang biaya SPP-nya
            belum diatur (masih Rp 0).
          </div>
          <Link
            href="/admin/kelas"
            className="whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-ink-900 hover:bg-amber-500"
          >
            👉 Atur Biaya SPP per Kelas
          </Link>
        </div>
      )}

      {genError && (
        <div className="mb-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {genError}
        </div>
      )}
      {genResult && (
        <div className="mb-3 rounded-control border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          🎉 Berhasil membuat <strong>{genResult.dibuat}</strong> tagihan baru ({genResult.dilewati}{" "}
          siswa dilewati / sudah mempunyai tagihan).
        </div>
      )}
      <form onSubmit={onSubmit} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 md:grid-cols-12">
        <div className="md:col-span-3">
          <label className={labelClass}>Bulan Tagihan</label>
          <select
            className={selectClass}
            value={gen.bulan}
            onChange={(e) => setGen((g) => ({ ...g, bulan: e.target.value }))}
          >
            {BULAN_LABEL.slice(1).map((lbl, i) => (
              <option key={i + 1} value={i + 1}>
                {lbl}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Tahun</label>
          <select
            className={selectClass}
            value={gen.tahun}
            onChange={(e) => setGen((g) => ({ ...g, tahun: e.target.value }))}
          >
            {TAHUN_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className={labelClass}>Tahun Ajaran</label>
          <select
            className={selectClass}
            value={gen.tahunAjaranId}
            onChange={(e) => setGen((g) => ({ ...g, tahunAjaranId: e.target.value }))}
            required
          >
            <option value="">-- Pilih Tahun Ajaran --</option>
            {tahunAjaranList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nama}
                {t.aktif ? " (Aktif)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Jatuh Tempo (Seragam)</label>
          <input
            type="date"
            className={selectClass}
            value={gen.jatuhTempo}
            onChange={(e) => setGen((g) => ({ ...g, jatuhTempo: e.target.value }))}
            required
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-control bg-accent px-3 py-2 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover disabled:opacity-60"
            disabled={genLoading}
          >
            {genLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Memproses...
              </span>
            ) : (
              "⚡ Generate Massal"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
