"use client";

import { Kelas, KelasSortField, kelasColor, formatRupiah } from "../types";
import { IconWarning, IconUsers, IconEdit, IconSchool } from "@/components/admin/icons";

type Props = {
  daftar: Kelas[];
  deletingId: string | null;
  sortField: KelasSortField;
  sortAsc: boolean;
  toggleSort: (f: KelasSortField) => void;
  onDetail: (id: string) => void;
  onEdit: (k: Kelas) => void;
  onDelete: (id: string) => void;
};

function SortHeader({
  label,
  field,
  sortField,
  sortAsc,
  onClick,
}: {
  label: string;
  field: KelasSortField;
  sortField: KelasSortField;
  sortAsc: boolean;
  onClick: (f: KelasSortField) => void;
}) {
  return (
    <th
      onClick={() => onClick(field)}
      className="cursor-pointer select-none border-b-2 border-border-soft bg-surface px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 transition hover:bg-accent-soft/40"
    >
      {label} {sortField === field ? (sortAsc ? "▲" : "▼") : ""}
    </th>
  );
}

export default function KelasTable({ daftar, deletingId, sortField, sortAsc, toggleSort, onDetail, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              <SortHeader label="Kelas / Jurusan" field="nama" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <SortHeader label="Wali Kelas" field="wali" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <SortHeader label="Biaya SPP / Bulan" field="spp" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <SortHeader label="Jumlah Siswa" field="jumlahSiswa" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <th className="whitespace-nowrap border-b-2 border-border-soft bg-surface px-3.5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((k) => (
              <tr key={k.id} className="transition hover:bg-accent-soft/60">
                <td className="border-b border-border-soft px-3.5 py-2.5 align-middle text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-control text-xs font-bold text-white ${kelasColor(
                        k.namaKelas
                      )}`}
                    >
                      {k.namaKelas.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="font-bold text-ink-900">
                      {k.tingkat} — {k.namaKelas}
                    </div>
                  </div>
                </td>
                <td className="border-b border-border-soft px-3.5 py-2.5 align-middle text-sm">
                  <div className="text-[0.85rem] font-semibold text-ink-900">
                    {k.waliKelas || <span className="italic text-ink-500">Belum diatur</span>}
                  </div>
                </td>
                <td className="border-b border-border-soft px-3.5 py-2.5 align-middle text-sm">
                  {!k.nominalSpp || k.nominalSpp === 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-control border border-amber-300 bg-amber-50 px-2 py-1 text-[0.78rem] text-amber-700">
                      <IconWarning className="h-3.5 w-3.5" /> Rp 0 (Belum Diatur)
                    </span>
                  ) : (
                    <div className="font-bold text-status-lunas">{formatRupiah(k.nominalSpp)}</div>
                  )}
                </td>
                <td className="border-b border-border-soft px-3.5 py-2.5 align-middle text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.78rem] font-semibold text-accent-hover">
                    <IconUsers className="h-3.5 w-3.5" /> {k._count.siswa} siswa
                  </span>
                </td>
                <td className="whitespace-nowrap border-b border-border-soft px-3.5 py-2.5 text-right align-middle text-sm">
                  <div className="flex flex-nowrap items-center justify-end gap-1">
                    <button
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-600 transition hover:bg-sky-50"
                      onClick={() => onDetail(k.id)}
                    >
                      <IconUsers className="h-3.5 w-3.5" /> Detail &amp; Rekap
                    </button>
                    <button
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-accent px-2 py-1 text-xs font-semibold text-accent transition hover:bg-accent-soft"
                      onClick={() => onEdit(k)}
                    >
                      {!k.nominalSpp || k.nominalSpp === 0 ? (
                        <>
                          <IconEdit className="h-3.5 w-3.5" /> Set SPP
                        </>
                      ) : (
                        "Edit"
                      )}
                    </button>
                    <button
                      className="whitespace-nowrap rounded-full border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      disabled={deletingId === k.id}
                      onClick={() => onDelete(k.id)}
                    >
                      {deletingId === k.id ? "..." : "Hapus"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {daftar.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3.5 py-10 text-center text-ink-500">
                  <IconSchool className="mx-auto mb-2 h-8 w-8 text-ink-500/60" />
                  Belum ada data jurusan. Silakan tambah jurusan baru di samping.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
