"use client";

import { useEffect, useState, useCallback } from "react";

type Kelas = { id: string; namaKelas: string; tingkat?: number };
type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo?: string;
  siswa: { namaLengkap: string; nis: string; nisn?: string | null; kelas: Kelas | null };
  pembayaran?: { paidAt: string | null; metode: string }[];
};
type Ringkasan = {
  totalTagihan: number;
  totalNominal: number;
  totalLunas: number;
  nominalLunas: number;
  totalBelumLunas: number;
  nominalBelumLunas: number;
};

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const STATUS_INFO: Record<string, { label: string; bg: string; color: string }> = {
  belum_bayar:          { label: "Belum Bayar",         bg: "#f3f4f6", color: "#374151" },
  menunggu_verifikasi:  { label: "Menunggu Verifikasi",  bg: "#fef9c3", color: "#854d0e" },
  lunas:                { label: "Lunas",                bg: "#dcfce7", color: "#15803d" },
  terlambat:            { label: "Terlambat",            bg: "#fee2e2", color: "#991b1b" },
};

function rupiah(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
}

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

export default function LaporanPage() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [bulan, setBulan] = useState(String(new Date().getMonth() + 1));
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [filterTingkat, setFilterTingkat] = useState("");
  const [kelasId, setKelasId] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [daftar, setDaftar] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/kelas").then(async (res) => {
      if (res.ok) setKelasList(await res.json());
    });
  }, []);

  function queryString() {
    const params = new URLSearchParams();
    if (bulan) params.set("bulan", bulan);
    if (tahun) params.set("tahun", tahun);
    if (filterTingkat) params.set("tingkat", filterTingkat);
    if (kelasId) params.set("kelasId", kelasId);
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params.toString();
  }

  const muatLaporan = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/laporan?${queryString()}`, { signal });
      if (res.ok) {
        const data = await res.json();
        setRingkasan(data.ringkasan);
        setDaftar(data.daftar);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") console.error("[muatLaporan] error:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulan, tahun, filterTingkat, kelasId, status, q, startDate, endDate]);

  useEffect(() => {
    const controller = new AbortController();
    // Debounce so rapid filter changes don't fire many requests
    const timeout = setTimeout(() => muatLaporan(controller.signal), 350);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [muatLaporan]);

  function handlePrint() {
    window.print();
  }

  function exportCSV() {
    if (daftar.length === 0) return;
    const headers = ["Nama Siswa", "NIS", "Kelas", "Periode Bulan", "Tahun", "Nominal (Rp)", "Status"];
    const rows = daftar.map((t) => [
      `"${t.siswa?.namaLengkap || "-"}"`,
      `"${t.siswa?.nis || "-"}"`,
      `"${t.siswa?.kelas?.namaKelas || "-"}"`,
      `"${BULAN_LABEL[t.bulan]}"`,
      t.tahun,
      t.nominal,
      `"${t.status}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_spp_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="w-full p-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Laporan Keuangan & Riwayat SPP</h1>
          <p className="text-sm text-ink-500">Filter riwayat pembayaran, cetak laporan PDF, atau export data Excel CSV</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-full border border-border-soft px-3 py-1.5 text-sm font-semibold text-ink-700 transition hover:bg-surface" onClick={handlePrint}>
            🖨️ Cetak PDF
          </button>
          <button className="rounded-full bg-status-lunas px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700" onClick={exportCSV}>
            📊 Export CSV / Excel
          </button>
        </div>
      </div>

      {/* Header saat print */}
      <div className="hidden print:block print:mb-8 print:border-b-2 print:border-black print:pb-4 print:text-center">
        <h2 className="m-0 text-lg font-bold">Laporan Pembayaran SPP Sekolah</h2>
        <p className="m-0 text-sm">
          Periode: {bulan ? BULAN_LABEL[Number(bulan)] : "Semua Bulan"} {tahun ? tahun : "Semua Tahun"}
        </p>
      </div>

      {/* Filter Lengkap */}
      <div className="mb-6 rounded-card border border-border-soft bg-white p-6 shadow-sm2 print:hidden">
        <div className="grid grid-cols-12 items-end gap-3">
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Cari Nama Siswa / NIS</label>
            <input
              className={selectClass}
              placeholder="Kata kunci pencarian..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Tingkat</label>
            <select
              className={selectClass}
              value={filterTingkat}
              onChange={(e) => {
                setFilterTingkat(e.target.value);
                setKelasId("");
              }}
            >
              <option value="">Semua Tingkat</option>
              {Array.from(new Set(kelasList.map((k) => k.tingkat).filter(Boolean)))
                .sort((a, b) => Number(a) - Number(b))
                .map((t) => (
                  <option key={t} value={t}>Tingkat {t}</option>
                ))}
            </select>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Kelas</label>
            <select className={selectClass} value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
              <option value="">Semua Kelas {filterTingkat ? `(Tingkat ${filterTingkat})` : ""}</option>
              {(filterTingkat ? kelasList.filter((k) => String(k.tingkat) === filterTingkat) : kelasList).map((k) => (
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
              <option value="terlambat">Terlambat</option>
            </select>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Dari Jatuh Tempo</label>
            <input type="date" className={selectClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-ink-700">Sampai Jatuh Tempo</label>
            <input type="date" className={selectClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-1">
            <button
              className="w-full rounded-control bg-accent py-2 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
              onClick={() => muatLaporan()}
              disabled={loading}
            >
              {loading ? "..." : "Filter"}
            </button>
          </div>
        </div>
      </div>

      {/* Ringkasan Laporan */}
      {ringkasan && (
        <div className="mb-6 grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <SummaryCard label="Total Tagihan" value={ringkasan.totalTagihan} sub={rupiah(ringkasan.totalNominal)} />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <SummaryCard
              label="Sudah Lunas" labelClass="!text-status-lunas" valueClass="!text-status-lunas"
              value={ringkasan.totalLunas} sub={rupiah(ringkasan.nominalLunas)} accentBar="#10b981"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-3">
            <SummaryCard
              label="Belum Lunas" labelClass="!text-red-600" valueClass="!text-red-600"
              value={ringkasan.totalBelumLunas} sub={rupiah(ringkasan.nominalBelumLunas)} accentBar="#ef4444"
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
      )}

      {/* Tabel Riwayat Pembayaran Detail */}
      <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left print:border-collapse">
            <thead>
              <tr>
                {["Siswa", "NIS", "Kelas", "Periode Tagihan", "Nominal", "Status"].map((h) => (
                  <th key={h} className="border-b-2 border-border-soft bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500 print:border print:border-black">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daftar.map((t) => {
                const info = STATUS_INFO[t.status] || { label: t.status, bg: "#f3f4f6", color: "#374151" };
                return (
                  <tr key={t.id} className="border-b border-border-soft last:border-0">
                    <td className="px-4 py-3 align-middle text-sm font-semibold text-ink-900 print:border print:border-black">{t.siswa?.namaLengkap || "Siswa Tidak Ditemukan"}</td>
                    <td className="px-4 py-3 align-middle font-mono text-sm text-ink-500 print:border print:border-black">{t.siswa?.nis || "-"}</td>
                    <td className="px-4 py-3 align-middle text-sm print:border print:border-black">{t.siswa?.kelas?.namaKelas || "-"}</td>
                    <td className="px-4 py-3 align-middle print:border print:border-black">
                      <span className="rounded-full border border-border-soft bg-surface px-2 py-1 text-xs text-ink-700">
                        {BULAN_LABEL[t.bulan]} {t.tahun}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm font-bold text-ink-900 print:border print:border-black">Rp {t.nominal.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3 align-middle print:border print:border-black">
                      <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: info.bg, color: info.color }}>
                        {info.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {daftar.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-500 print:hidden">
                    <div className="mb-2 text-3xl">📄</div>
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
