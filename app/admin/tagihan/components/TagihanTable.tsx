"use client";

import { IconWhatsapp, IconFileText, IconCheck, IconRefresh, IconSearch, IconWarning, IconTrash } from "@/components/admin/icons";
import { Tagihan, SortField, BULAN_LABEL, STATUS_INFO, getAvatarColor, getInisial, formatTanggalPanjang } from "../types";

type Props = {
  loadingData: boolean;
  fetchError: string | null;
  paginatedDaftar: Tagihan[];
  sortField: SortField;
  sortAsc: boolean;
  toggleSort: (f: SortField) => void;
  onSiswaClick: (s: Tagihan["siswa"]) => void;
  sendingWaId: string | null;
  verifyingId: string | null;
  onKirimWa: (id: string) => void;
  onVerifikasi: (id: string) => void;
  onCekStatus: (id: string) => void;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: (ids: string[]) => void;
  onHapusMassal: () => void;
  bulkDeleting: boolean;
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
  width,
  sortField,
  sortAsc,
  onClick,
}: {
  label: string;
  field: SortField;
  width: string;
  sortField: SortField;
  sortAsc: boolean;
  onClick: (f: SortField) => void;
}) {
  return (
    <th
      className="cursor-pointer select-none border-b-2 border-border-soft bg-surface px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-ink-500 transition hover:text-accent-hover"
      style={{ width }}
      onClick={() => onClick(field)}
    >
      {label} {sortField === field ? (sortAsc ? "▲" : "▼") : ""}
    </th>
  );
}

export default function TagihanTable({
  loadingData,
  fetchError,
  paginatedDaftar,
  sortField,
  sortAsc,
  toggleSort,
  onSiswaClick,
  sendingWaId,
  verifyingId,
  onKirimWa,
  onVerifikasi,
  onCekStatus,
  selectedIds,
  toggleSelect,
  toggleSelectAll,
  onHapusMassal,
  bulkDeleting,
  sortedCount,
  currentPage,
  totalPages,
  pageSize,
  setPageSize,
  setCurrentPage,
}: Props) {
  const pageIds = paginatedDaftar.map((t) => t.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  return (
    <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm2">
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft bg-red-50 px-5 py-3">
          <span className="text-sm font-semibold text-red-800">
            {selectedCount} tagihan dipilih
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm2 transition hover:bg-red-700 disabled:opacity-60"
            onClick={onHapusMassal}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <IconTrash width={14} height={14} />
            )}
            {bulkDeleting ? "Menghapus..." : `Hapus ${selectedCount} Terpilih`}
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="border-b-2 border-border-soft bg-surface px-4 py-3.5 text-left" style={{ width: "3%" }}>
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={() => toggleSelectAll(pageIds)}
                  aria-label="Pilih semua di halaman ini"
                />
              </th>
              <SortHeader label="Identitas Siswa" field="siswa" width="27%" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <SortHeader label="Kelas" field="kelas" width="14%" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <SortHeader label="Periode Tagihan" field="periode" width="17%" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <SortHeader label="Nominal SPP" field="nominal" width="14%" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <SortHeader label="Status" field="status" width="11%" sortField={sortField} sortAsc={sortAsc} onClick={toggleSort} />
              <th className="border-b-2 border-border-soft bg-surface px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-ink-500" style={{ width: "10%" }}>
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {loadingData ? (
              <tr>
                <td colSpan={7} className="border-b border-slate-100 bg-white py-10 text-center">
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-soft border-t-accent align-middle" />
                  <span className="text-ink-500">Memuat data tagihan...</span>
                </td>
              </tr>
            ) : fetchError ? (
              <tr>
                <td colSpan={7} className="border-b border-slate-100 bg-white py-8 text-center">
                  <div className="inline-block rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <IconWarning className="mr-1 inline h-4 w-4" />{fetchError}
                  </div>
                </td>
              </tr>
            ) : paginatedDaftar.length === 0 ? (
              <tr>
                <td colSpan={7} className="border-b border-slate-100 bg-white py-10 text-center text-ink-500">
                  <IconFileText className="mx-auto mb-2 h-10 w-10 text-ink-500/50" />
                  Belum ada data tagihan untuk filter ini.
                </td>
              </tr>
            ) : (
              paginatedDaftar.map((t) => {
                const namaSiswa = t.siswa?.namaLengkap || "Siswa Tidak Ditemukan";
                const nisSiswa = t.siswa?.nis || "-";
                const namaKelas = t.siswa?.kelas?.namaKelas || "-";
                const info = STATUS_INFO[t.status] || { label: t.status, className: "bg-slate-100 text-slate-700" };

                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-violet-50/60 [&>td]:hover:bg-violet-50/60 ${selectedIds.has(t.id) ? "bg-red-50/40 [&>td]:bg-red-50/40" : ""}`}
                  >
                    <td className="border-b border-slate-100 bg-white px-4 py-4 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        aria-label={`Pilih tagihan ${namaSiswa}`}
                      />
                    </td>
                    <td className="border-b border-slate-100 bg-white px-5 py-4 align-middle text-sm">
                      <div
                        className="flex cursor-pointer items-center gap-3 transition hover:translate-x-0.5"
                        onClick={() => t.siswa && onSiswaClick(t.siswa)}
                        title="Klik untuk lihat detail profil siswa"
                      >
                        <div
                          className={`flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center overflow-hidden rounded-control text-xs font-bold text-white ${getAvatarColor(namaSiswa)}`}
                        >
                          {t.siswa?.fotoUrl ? (
                            <img src={t.siswa.fotoUrl} alt="Foto" className="h-full w-full object-cover" />
                          ) : (
                            getInisial(namaSiswa)
                          )}
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1 font-bold text-accent-hover">
                            {namaSiswa}
                            <IconSearch width={13} height={13} className="ml-1 text-ink-500" />
                          </div>
                          <div className="font-mono text-xs text-ink-500">NIS: {nisSiswa}</div>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 bg-white px-5 py-4 align-middle text-sm">
                      <span className="rounded-control border border-border-soft bg-surface px-2 py-1 text-ink-900">
                        {namaKelas}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 bg-white px-5 py-4 align-middle text-sm">
                      <div className="font-semibold text-ink-900">
                        {BULAN_LABEL[t.bulan]} {t.tahun}
                      </div>
                      <div className="text-xs text-ink-500">
                        Tempo: {formatTanggalPanjang(t.jatuhTempo)}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 bg-white px-5 py-4 align-middle text-sm">
                      <div className={`font-bold ${t.nominal === 0 ? "text-red-600" : "text-ink-900"}`}>
                        Rp {t.nominal.toLocaleString("id-ID")}
                        {t.nominal === 0 && (
                          <span className="ml-1 rounded-control bg-red-100 px-2 py-0 text-[0.68rem] text-red-700">
                            <span className="inline-flex items-center gap-1"><IconWarning className="h-3 w-3" /> Rp 0</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 bg-white px-5 py-4 align-middle text-sm">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${info.className}`}>
                        {info.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 bg-white px-5 py-4 text-right align-middle text-sm">
                      <div className="flex flex-nowrap items-center justify-end gap-1">
                        <button
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-green-300 px-2 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-50 disabled:opacity-60"
                          disabled={sendingWaId === t.id}
                          onClick={() => onKirimWa(t.id)}
                          title="Kirim Pengingat WA Wali Siswa"
                        >
                          {sendingWaId === t.id ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-200 border-t-green-700" />
                          ) : (
                            <>
                              <IconWhatsapp width={13} height={13} /> Kirim WA
                            </>
                          )}
                        </button>
                        {t.status === "lunas" ? (
                          <a
                            href={`/kwitansi/${t.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-accent px-3 py-1 text-xs font-semibold text-accent hover:bg-accent-soft"
                          >
                            <IconFileText width={13} height={13} /> Kwitansi
                          </a>
                        ) : (
                          <>
                            <button
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-green-600 px-2 py-1 text-xs font-semibold text-white shadow-sm2 transition hover:bg-green-700 disabled:opacity-60"
                              disabled={verifyingId === t.id}
                              onClick={() => onVerifikasi(t.id)}
                            >
                              {verifyingId === t.id ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              ) : (
                                <>
                                  <IconCheck width={14} height={14} /> Tandai Lunas
                                </>
                              )}
                            </button>
                            <button
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-border-soft text-ink-700 hover:bg-surface"
                              title="Cek Status Midtrans"
                              onClick={() => onCekStatus(t.id)}
                            >
                              <IconRefresh width={13} height={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sortedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-soft bg-white px-5 py-3">
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
