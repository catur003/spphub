"use client";

import { useEffect, useState, useCallback } from "react";
import { IconPrinter, IconChart, IconFileText } from "@/components/admin/icons";
import { JenisTagihanLain, KelasOption, STATUS_INFO, formatRupiah } from "../types";
import type { TagihanLain } from "../types";

const selectClass = "w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm outline-none focus:border-accent";

function SummaryCard({
  label, value, sub, labelClass = "", valueClass = "", accentBar,
}: { label: string; value: React.ReactNode; sub: string; labelClass?: string; valueClass?: string; accentBar?: string }) {
  return (
    <div
      className="rounded-card border border-border-soft bg-white p-5 text-center shadow-sm2"
      style={accentBar ? { borderBottom: `4px solid ${accentBar}` } : undefined}
    >
      <div className={`mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500 ${labelClass}`}>{label}</div>
      <div className={`flex items-center justify-center gap-1 text-2xl font-extrabold leading-none text-ink-900 ${valueClass}`}>{value}</div>
      <div className={`mt-1 text-sm text-ink-500 ${valueClass}`}>{sub}</div>
    </div>
  );
}

export default function LaporanTagihanLainPage() {
  const [daftarJenis, setDaftarJenis] = useState<JenisTagihanLain[]>([]);
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);

  const [jenisId, setJenisId] = useState("");
  const [kelasId, setKelasId] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [daftar, setDaftar] = useState<TagihanLain[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/tagihan-lain/jenis").then(async (res) => {
      if (res.ok) setDaftarJenis(await res.json());
    });
    fetch("/api/kelas").then(async (res) => {
      if (res.ok) setKelasList(await res.json());
    });
  }, []);

  const muatLaporan = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (jenisId) params.set("jenisTagihanLainId", jenisId);
      if (kelasId) params.set("kelasId", kelasId);
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      const res = await fetch(`/api/tagihan-lain?${params.toString()}`, { signal });
      if (res.ok) {
        let data: TagihanLain[] = await res.json();
        // Filter tanggal jatuh tempo di client — endpoint list belum support range date
        if (startDate) data = data.filter((t) => new Date(t.jatuhTempo) >= new Date(startDate));
        if (endDate) data = data.filter((t) => new Date(t.jatuhTempo) <= new Date(endDate + "T23:59:59.999Z"));
        setDaftar(data);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") console.error("[muatLaporan tagihan-lain] error:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jenisId, kelasId, status, q, startDate, endDate]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => muatLaporan(controller.signal), 350);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [muatLaporan]);

  const ringkasan = daftar.reduce(
    (acc, t) => {
      acc.totalTagihan += 1;
      acc.totalNominal += t.nominal;
      if (t.status === "lunas") {
        acc.totalLunas += 1;
        acc.nominalLunas += t.nominal;
      } else {
        acc.totalBelumLunas += 1;
        acc.nominalBelumLunas += t.nominal;
      }
      return acc;
    },
    { totalTagihan: 0, totalNominal: 0, totalLunas: 0, nominalLunas: 0, totalBelumLunas: 0, nominalBelumLunas: 0 }
  );

  function handlePrint() {
    window.print();
  }

  function exportCSV() {
    if (daftar.length === 0) return;
    const headers = ["Nama Siswa", "NIS", "Kelas", "Jenis Tagihan", "Jatuh Tempo", "Nominal (Rp)", "Status"];
    const rows = daftar.map((t) => [
      `"${t.siswa?.namaLengkap || "-"}"`,
      `"${t.siswa?.nis || "-"}"`,
      `"${t.siswa?.kelas?.namaKelas || "-"}"`,
      `"${t.jenisTagihanLain?.nama || "-"}"`,
      `"${new Date(t.jatuhTempo).toLocaleDateString("id-ID")}"`,
      t.nominal,
      `"${t.status}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_tagihan_lain_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="w-full p-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Laporan Tagihan Lainnya</h1>
          <p className="text-sm text-ink-500">Filter riwayat tagihan lain (seragam, daftar ulang, dll), cetak PDF, atau export CSV</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-full border border-border-soft px-3 py-1.5 text-sm font-semibold text-ink-700 transition hover:bg-surface" onClick={handlePrint}>
            <span className="inline-flex items-center gap-1.5"><IconPrinter className="h-4 w-4" /> Cetak PDF</span>
          </button>
          <button className="rounded-full bg-status-lunas px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700" onClick={exportCSV}>
            <span className="inline-flex items-center gap-1.5"><IconChart className="h-4 w-4" /> Export CSV / Excel</span>
          </button>
        </div>
      </div>

      <div className="hidden print:block print:mb-8 print:border-b-2 print:border-black print:pb-4 print:text-center">
        <h2 className="m-0 text-lg font-bold">Laporan Tagihan Lainnya Sekolah</h2>
        <p className="m-0 text-sm">
          Jenis: {jenisId ? daftarJenis.find((j) => j.id === jenisId)?.nama : "Semua Jenis"}
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6 rounded-card border border-border-soft bg-white p-6 shadow-sm2 print:hidden">
        <div className="grid grid-cols-12 items-end gap-3">
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Cari Nama Siswa / NIS</label>
            <input className={selectClass} placeholder="Kata kunci pencarian..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Jenis Tagihan</label>
            <select className={selectClass} value={jenisId} onChange={(e) => setJenisId(e.target.value)}>
              <option value="">Semua Jenis</option>
              {daftarJenis.map((j) => (
                <option key={j.id} value={j.id}>{j.nama}</option>
              ))}
            </select>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Kelas</label>
            <select className={selectClass} value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.namaKelas}</option>
              ))}
            </select>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Status Bayar</label>
            <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="lunas">Lunas</option>
              <option value="belum_bayar">Belum Bayar</option>
              <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
              <option value="terlambat">Terlambat</option>
            </select>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Dari Jatuh Tempo</label>
            <input type="date" className={selectClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-1">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Sampai</label>
            <input type="date" className={selectClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="mb-6 grid grid-cols-12 gap-3">
        <div className="col-span-12 sm:col-span-6 md:col-span-3">
          <SummaryCard label="Total Tagihan" value={ringkasan.totalTagihan} sub={formatRupiah(ringkasan.totalNominal)} />
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-3">
          <SummaryCard
            label="Sudah Lunas" labelClass="!text-status-lunas" valueClass="!text-status-lunas"
            value={ringkasan.totalLunas} sub={formatRupiah(ringkasan.nominalLunas)} accentBar="#10b981"
          />
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-3">
          <SummaryCard
            label="Belum Lunas" labelClass="!text-red-600" valueClass="!text-red-600"
            value={ringkasan.totalBelumLunas} sub={formatRupiah(ringkasan.nominalBelumLunas)} accentBar="#ef4444"
          />
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-3">
          <div className="rounded-card border border-border-soft bg-gradient-to-br from-surface to-slate-200 p-5 text-center shadow-sm2">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Persentase Lunas</div>
            <div className="flex items-center justify-center gap-1 text-2xl font-extrabold text-ink-900">
              {ringkasan.totalTagihan > 0 ? Math.round((ringkasan.totalLunas / ringkasan.totalTagihan) * 100) : 0}
              <span className="text-base">%</span>
            </div>
            <div className="mt-1 text-sm text-ink-500">Tingkat keberhasilan bayar</div>
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left print:border-collapse">
            <thead>
              <tr>
                {["Siswa", "NIS", "Kelas", "Jenis Tagihan", "Jatuh Tempo", "Nominal", "Status"].map((h) => (
                  <th key={h} className="border-b-2 border-border-soft bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500 print:border print:border-black">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daftar.map((t) => {
                const info = STATUS_INFO[t.status] || { label: t.status, className: "bg-gray-100 text-gray-800" };
                return (
                  <tr key={t.id} className="border-b border-border-soft last:border-0">
                    <td className="px-4 py-3 align-middle text-sm font-semibold text-ink-900 print:border print:border-black">{t.siswa?.namaLengkap || "Siswa Tidak Ditemukan"}</td>
                    <td className="px-4 py-3 align-middle font-mono text-sm text-ink-500 print:border print:border-black">{t.siswa?.nis || "-"}</td>
                    <td className="px-4 py-3 align-middle text-sm print:border print:border-black">{t.siswa?.kelas?.namaKelas || "-"}</td>
                    <td className="px-4 py-3 align-middle print:border print:border-black">
                      <span className="rounded-full border border-border-soft bg-surface px-2 py-1 text-xs text-ink-700">
                        {t.jenisTagihanLain?.nama || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-ink-700 print:border print:border-black">
                      {new Date(t.jatuhTempo).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm font-bold text-ink-900 print:border print:border-black">{formatRupiah(t.nominal)}</td>
                    <td className="px-4 py-3 align-middle print:border print:border-black">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${info.className}`}>{info.label}</span>
                    </td>
                  </tr>
                );
              })}
              {daftar.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-500 print:hidden">
                    <IconFileText className="mx-auto mb-2 h-8 w-8 text-ink-500/50" />
                    Tidak ada data tagihan yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
