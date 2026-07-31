"use client";

import { Siswa, SortField, STATUS_LABEL, STATUS_BADGE, getAvatarColor, getInisial } from "../types";

type Props = {
  paginatedDaftar: Siswa[];
  sortField: SortField;
  sortAsc: boolean;
  toggleSort: (f: SortField) => void;
  onDetail: (id: string) => void;
  onEdit: (s: Siswa) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  // pagination
  sortedCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setPageSize: (n: number) => void;
  setCurrentPage: (updater: number | ((p: number) => number)) => void;
};

function SortHeader({
  label,
  field,
  sortField,
  sortAsc,
  onClick,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortAsc: boolean;
  onClick: (f: SortField) => void;
}) {
  return (
    <th
      className="cursor-pointer select-none border-b-2 border-border-soft bg-surface px-3.5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 transition hover:text-accent-hover"
      onClick={() => onClick(field)}
    >
      {label} {sortField === field ? (sortAsc ? "▲" : "▼") : ""}
    </th>
  );
}

export default function SiswaTable({
  paginatedDaftar,
  sortField,
  sortAsc,
  toggleSort,
  onDetail,
  onEdit,
  onDelete,
  deletingId,
  sortedCount,
  currentPage,
  totalPages,
  pageSize,
  setPageSize,
  setCurrentPage,
}: Props) {
  return (
    <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0">
          <thead>
            <tr>
              <SortHeader label="Identitas Siswa" field="nama" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <SortHeader label="NIS" field="nis" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <SortHeader label="Kelas" field="kelas" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <SortHeader label="Status" field="status" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <th className="whitespace-nowrap border-b-2 border-border-soft bg-surface px-3.5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedDaftar.length === 0 ? (
              <tr>
                <td colSpan={5} className="border-b border-slate-100 bg-white py-8 text-center text-ink-500">
                  Belum ada data siswa.
                </td>
              </tr>
            ) : (
              paginatedDaftar.map((s) => (
                <tr key={s.id} className="hover:bg-violet-50/60 [&>td]:hover:bg-violet-50/60">
                  <td
                    className="cursor-pointer border-b border-slate-100 bg-white px-3.5 py-3 align-middle text-sm"
                    onClick={() => onDetail(s.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-[10px] text-xs font-bold text-white ${getAvatarColor(
                          s.namaLengkap
                        )}`}
                      >
                        {s.fotoUrl ? (
                          <img src={s.fotoUrl} alt="Foto" className="h-full w-full object-cover" />
                        ) : (
                          getInisial(s.namaLengkap)
                        )}
                      </div>
                      <div>
                        <div className="text-[0.88rem] font-bold text-ink-900">{s.namaLengkap}</div>
                        <div className="text-xs text-ink-500">
                          {s.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"} {s.namaWali ? `• Wali: ${s.namaWali}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-slate-100 bg-white px-3.5 py-3 align-middle text-sm">
                    <span className="font-mono text-[0.83rem]">{s.nis}</span>
                  </td>
                  <td className="border-b border-slate-100 bg-white px-3.5 py-3 align-middle text-sm">
                    {s.kelas?.namaKelas || <span className="text-ink-500">—</span>}
                  </td>
                  <td className="border-b border-slate-100 bg-white px-3.5 py-3 align-middle text-sm">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STATUS_BADGE[s.status] || "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                      {STATUS_LABEL[s.status] || s.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 bg-white px-3.5 py-3 text-right align-middle text-sm">
                    <div className="flex flex-nowrap items-center justify-end gap-1">
                      <button
                        className="whitespace-nowrap rounded-full border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                        onClick={() => onDetail(s.id)}
                      >
                        👁️ Profil
                      </button>
                      <button
                        className="whitespace-nowrap rounded-full border border-accent px-2 py-1 text-xs font-semibold text-accent transition hover:bg-accent-soft"
                        onClick={() => onEdit(s)}
                      >
                        Edit
                      </button>
                      <button
                        className="whitespace-nowrap rounded-full border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        disabled={deletingId === s.id}
                        onClick={() => onDelete(s.id)}
                      >
                        {deletingId === s.id ? "..." : "Hapus"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sortedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-soft bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <span>Tampilkan</span>
            <select
              className="w-[70px] rounded-control border border-border-soft px-2 py-1 text-sm text-ink-900"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[10, 15, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>
              dari <strong>{sortedCount}</strong> data (Halaman <strong>{currentPage}</strong> dari{" "}
              <strong>{totalPages}</strong>)
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="rounded-control border border-border-soft bg-white px-3 py-1 text-xs font-semibold text-ink-700 transition hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              title="Halaman Pertama"
            >
              « First
            </button>
            <button
              className="rounded-control border border-border-soft bg-white px-3 py-1 text-xs font-semibold text-ink-700 transition hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ‹ Prev
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = currentPage;
              if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              if (pageNum < 1 || pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  className={`rounded-control border px-3 py-1 text-xs font-semibold transition ${
                    currentPage === pageNum
                      ? "border-accent bg-accent text-white"
                      : "border-border-soft bg-white text-ink-700 hover:border-accent hover:bg-accent-soft hover:text-accent"
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              className="rounded-control border border-border-soft bg-white px-3 py-1 text-xs font-semibold text-ink-700 transition hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next ›
            </button>
            <button
              className="rounded-control border border-border-soft bg-white px-3 py-1 text-xs font-semibold text-ink-700 transition hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Halaman Terakhir"
            >
              Last »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
