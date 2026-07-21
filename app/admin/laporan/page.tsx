"use client";

import { useEffect, useState } from "react";

type Kelas = { id: string; namaKelas: string };
type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  siswa: { namaLengkap: string; nis: string; kelas: Kelas | null };
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

export default function LaporanPage() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [bulan, setBulan] = useState(String(new Date().getMonth() + 1));
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [kelasId, setKelasId] = useState("");

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
    if (kelasId) params.set("kelasId", kelasId);
    return params.toString();
  }

  async function muatLaporan() {
    setLoading(true);
    const res = await fetch(`/api/laporan?${queryString()}`);
    if (res.ok) {
      const data = await res.json();
      setRingkasan(data.ringkasan);
      setDaftar(data.daftar);
    }
    setLoading(false);
  }

  useEffect(() => {
    muatLaporan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style>{`
        /* ——— Print Styles ——— */
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-header { display: block !important; margin-bottom: 2rem; text-align: center; border-bottom: 2px solid #000; padding-bottom: 1rem; }
          .card { border: none !important; box-shadow: none !important; }
          .table { width: 100% !important; border-collapse: collapse !important; }
          .table th, .table td { border: 1px solid #000 !important; padding: 8px !important; }
          .badge { border: 1px solid #000; color: #000 !important; background: transparent !important; }
        }
        
        .print-header { display: none; } /* Hanya muncul saat di print */

        .filter-card {
          background: white; border-radius: 16px; padding: 1.5rem;
          border: 1px solid var(--border-soft); margin-bottom: 1.5rem;
        }

        .summary-card {
          background: white; border-radius: 16px; padding: 1.5rem;
          border: 1px solid var(--border-soft); text-align: center;
        }
        .summary-card__label { font-size: 0.8rem; font-weight: 600; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
        .summary-card__value { font-size: 1.8rem; font-weight: 800; color: var(--ink-900); line-height: 1; }
        .summary-card__sub { font-size: 0.85rem; color: var(--ink-500); margin-top: 0.25rem; }

        .laporan-table th {
          font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--ink-500); font-weight: 600; background: var(--surface);
          padding: 0.65rem 0.9rem; border-bottom: 2px solid var(--border-soft);
        }
        .laporan-table td { padding: 0.75rem 0.9rem; vertical-align: middle; font-size: 0.88rem; }
        
        .status-chip {
          display: inline-flex; align-items: center; padding: 4px 12px;
          border-radius: 20px; font-size: 0.75rem; font-weight: 600;
        }
      `}</style>

      <div className="container-fluid p-4 print-area">
        <div className="d-flex justify-content-between align-items-center mb-4 no-print">
          <div>
            <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Laporan Keuangan</h1>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>Pantau pendapatan dan tunggakan SPP</p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={handlePrint} style={{ borderRadius: 10 }}>
              🖨️ Cetak PDF
            </button>
            <a className="btn btn-primary" href={`/api/laporan/export?${queryString()}`} style={{ borderRadius: 10 }}>
              📊 Export Excel
            </a>
          </div>
        </div>

        {/* Header untuk saat nge-print */}
        <div className="print-header">
          <h2 style={{ margin: 0 }}>Laporan Pembayaran SPP</h2>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Periode: {bulan ? BULAN_LABEL[Number(bulan)] : "Semua Bulan"} {tahun ? tahun : "Semua Tahun"}
          </p>
        </div>

        {/* Filter */}
        <div className="filter-card no-print">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Bulan</label>
              <select className="form-select form-select-sm" value={bulan} onChange={(e) => setBulan(e.target.value)}>
                <option value="">Semua Bulan</option>
                {BULAN_LABEL.slice(1).map((b, i) => (
                  <option key={i + 1} value={i + 1}>{b}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Tahun</label>
              <input className="form-control form-control-sm" placeholder="cth 2026" value={tahun} onChange={(e) => setTahun(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Filter Kelas</label>
              <select className="form-select form-select-sm" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
                <option value="">Semua Kelas</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>{k.namaKelas}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-dark btn-sm w-100 fw-semibold" onClick={muatLaporan} disabled={loading} style={{ height: "31px" }}>
                {loading ? "Memuat..." : "Terapkan Filter"}
              </button>
            </div>
          </div>
        </div>

        {ringkasan && (
          <div className="row g-4 mb-4">
            <div className="col-md-3">
              <div className="summary-card">
                <div className="summary-card__label">Total Tagihan</div>
                <div className="summary-card__value">{ringkasan.totalTagihan}</div>
                <div className="summary-card__sub">{rupiah(ringkasan.totalNominal)}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="summary-card" style={{ borderBottom: "4px solid #10b981" }}>
                <div className="summary-card__label text-success">Sudah Lunas</div>
                <div className="summary-card__value text-success">{ringkasan.totalLunas}</div>
                <div className="summary-card__sub text-success">{rupiah(ringkasan.nominalLunas)}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="summary-card" style={{ borderBottom: "4px solid #ef4444" }}>
                <div className="summary-card__label text-danger">Belum Lunas</div>
                <div className="summary-card__value text-danger">{ringkasan.totalBelumLunas}</div>
                <div className="summary-card__sub text-danger">{rupiah(ringkasan.nominalBelumLunas)}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="summary-card" style={{ background: "linear-gradient(135deg, #f8fafc, #e2e8f0)" }}>
                <div className="summary-card__label">Persentase Lunas</div>
                <div className="summary-card__value d-flex align-items-center justify-content-center gap-1">
                  {ringkasan.totalTagihan > 0 ? Math.round((ringkasan.totalLunas / ringkasan.totalTagihan) * 100) : 0}
                  <span style={{ fontSize: "1rem" }}>%</span>
                </div>
                <div className="summary-card__sub">Tingkat keberhasilan bayar</div>
              </div>
            </div>
          </div>
        )}

        <div className="card p-0 overflow-hidden" style={{ borderRadius: 16, border: "1px solid var(--border-soft)" }}>
          <div className="table-responsive">
            <table className="table laporan-table mb-0">
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th>NIS</th>
                  <th>Kelas</th>
                  <th>Periode</th>
                  <th>Nominal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((t) => {
                  const info = STATUS_INFO[t.status] || { label: t.status, bg: "#f3f4f6", color: "#374151" };
                  return (
                    <tr key={t.id}>
                      <td className="fw-semibold" style={{ color: "var(--ink-900)" }}>{t.siswa.namaLengkap}</td>
                      <td style={{ fontFamily: "monospace", color: "var(--ink-500)" }}>{t.siswa.nis}</td>
                      <td>{t.siswa.kelas?.namaKelas || "-"}</td>
                      <td>
                        <span className="badge bg-light text-dark">{BULAN_LABEL[t.bulan]} {t.tahun}</span>
                      </td>
                      <td className="fw-semibold">Rp {t.nominal.toLocaleString("id-ID")}</td>
                      <td>
                        <span className="status-chip" style={{ background: info.bg, color: info.color }}>
                          {info.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {daftar.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-5 no-print">
                      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📄</div>
                      Tidak ada data tagihan yang sesuai dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
