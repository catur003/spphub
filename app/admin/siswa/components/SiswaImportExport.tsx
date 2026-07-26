"use client";

import { HasilImport } from "../types";

type Props = {
  fileImport: File | null;
  setFileImport: (f: File | null) => void;
  importLoading: boolean;
  importError: string;
  hasilImport: HasilImport | null;
  onSubmit: (e: React.FormEvent) => void;
};

export default function SiswaImportExport({
  fileImport,
  setFileImport,
  importLoading,
  importError,
  hasilImport,
  onSubmit,
}: Props) {
  return (
    <div className="mb-4 rounded-card border border-border-soft bg-white p-4 shadow-sm2">
      <h2 className="mb-3 text-base font-bold text-ink-800">📥 Import / Export Excel Siswa</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <a
          className="rounded-full border border-border-soft px-3 py-1.5 text-sm font-semibold text-ink-700 transition hover:bg-surface"
          href="/api/siswa/template"
          target="_blank"
          download
        >
          ⬇ Download Template (.xlsx)
        </a>
        <a
          className="rounded-full border border-border-soft px-3 py-1.5 text-sm font-semibold text-ink-700 transition hover:bg-surface"
          href="/api/siswa/export"
        >
          ⬇ Export Data Siswa (.xlsx)
        </a>
      </div>
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="max-w-[320px] rounded-control border border-border-soft px-2 py-1.5 text-sm text-ink-900 outline-none file:mr-2 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-xs file:font-semibold file:text-accent-hover"
          onChange={(e) => setFileImport(e.target.files?.[0] || null)}
        />
        <button
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover disabled:opacity-60"
          disabled={!fileImport || importLoading}
        >
          {importLoading ? "Mengimpor..." : "Import Siswa"}
        </button>
      </form>
      {importError && (
        <div className="mt-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {importError}
        </div>
      )}
      {hasilImport && (
        <div className="mt-3">
          <div className="mb-2 rounded-control border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            ✓ <strong>{hasilImport.berhasil}</strong> dari <strong>{hasilImport.total}</strong> baris berhasil
            diimport.
          </div>
          {hasilImport.gagal.length > 0 && (
            <div className="max-h-[180px] overflow-y-auto rounded-control border border-border-soft p-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500">
                    <th className="pb-1 pr-2">Baris</th>
                    <th className="pb-1 pr-2">Nama</th>
                    <th className="pb-1">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {hasilImport.gagal.map((g, idx) => (
                    <tr key={idx} className="border-t border-border-soft">
                      <td className="py-1 pr-2">{g.baris}</td>
                      <td className="py-1 pr-2">{g.nama || "-"}</td>
                      <td className="py-1 text-red-600">{g.alasan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
