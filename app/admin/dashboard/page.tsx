"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Transaksi = {
  id: string;
  nominal: number;
  bulan: number;
  tahun: number;
  updatedAt: string;
  siswa: { namaLengkap: string; kelas: { namaKelas: string } | null };
};

type DashboardData = {
  totalSiswa: number;
  pendapatanBulanIni: number;
  tunggakanBulanIni: number;
  transaksiTerbaru: Transaksi[];
  bulan: number;
  tahun: number;
};

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container-fluid p-4 text-center text-muted py-5">
        <div className="spinner-border text-primary mb-3" />
        <p>Memuat dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <style>{`
        .dash-card {
          background: white; border-radius: 16px; padding: 1.5rem;
          border: 1px solid var(--border-soft);
          box-shadow: 0 4px 16px rgba(0,0,0,0.02);
          display: flex; flex-direction: column; gap: 0.5rem;
          transition: transform 0.2s;
        }
        .dash-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
        .dash-card__icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; margin-bottom: 0.5rem;
        }
        .dash-card__title { font-size: 0.85rem; font-weight: 600; color: var(--ink-500); }
        .dash-card__value { font-size: 1.8rem; font-weight: 800; color: var(--ink-900); line-height: 1.1; }

        .tx-list { list-style: none; padding: 0; margin: 0; }
        .tx-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem 0; border-bottom: 1px solid var(--border-soft);
        }
        .tx-item:last-child { border-bottom: none; }
        .tx-icon {
          width: 40px; height: 40px; border-radius: 50%;
          background: #eef2ff; color: #4f46e5;
          display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
        }
      `}</style>

      <div className="container-fluid p-4">
        <div className="mb-4">
          <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--ink-900)" }}>👋 Halo, Admin!</h1>
          <p className="text-muted" style={{ fontSize: "0.9rem" }}>
            Ringkasan untuk bulan <strong>{BULAN_LABEL[data.bulan]} {data.tahun}</strong>
          </p>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="dash-card">
              <div className="dash-card__icon" style={{ background: "#e0e7ff", color: "#4338ca" }}>👨‍🎓</div>
              <div className="dash-card__title">Total Siswa Aktif</div>
              <div className="dash-card__value">{data.totalSiswa} <span style={{ fontSize:"1rem", fontWeight:500, color:"#6b7280" }}>Siswa</span></div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="dash-card">
              <div className="dash-card__icon" style={{ background: "#dcfce7", color: "#15803d" }}>💰</div>
              <div className="dash-card__title">Pendapatan Terkumpul Bulan Ini</div>
              <div className="dash-card__value" style={{ fontSize: "1.6rem" }}>
                {data.pendapatanBulanIni.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="dash-card" style={{ borderColor: "#fecaca" }}>
              <div className="dash-card__icon" style={{ background: "#fee2e2", color: "#b91c1c" }}>⏳</div>
              <div className="dash-card__title">Potensi Tunggakan Bulan Ini</div>
              <div className="dash-card__value" style={{ fontSize: "1.6rem", color: "#b91c1c" }}>
                {data.tunggakanBulanIni.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-md-8">
            <div className="card h-100" style={{ borderRadius: 16, border: "1px solid var(--border-soft)" }}>
              <div className="card-header bg-white" style={{ borderBottom: "1px solid var(--border-soft)", padding: "1.25rem 1.5rem" }}>
                <h5 className="mb-0 fw-bold" style={{ fontSize: "1rem" }}>Aktivitas Pembayaran Terakhir</h5>
              </div>
              <div className="card-body p-0 px-4">
                {data.transaksiTerbaru.length === 0 ? (
                  <div className="text-center py-5 text-muted">Belum ada pembayaran yang lunas akhir-akhir ini.</div>
                ) : (
                  <ul className="tx-list">
                    {data.transaksiTerbaru.map(tx => (
                      <li key={tx.id} className="tx-item">
                        <div className="d-flex align-items-center gap-3">
                          <div className="tx-icon">✓</div>
                          <div>
                            <div className="fw-bold" style={{ color: "var(--ink-900)", fontSize: "0.9rem" }}>
                              {tx.siswa.namaLengkap} <span className="badge bg-light text-dark ms-1">{tx.siswa.kelas?.namaKelas || "-"}</span>
                            </div>
                            <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                              Membayar SPP Bulan {BULAN_LABEL[tx.bulan]} {tx.tahun}
                            </div>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold text-success" style={{ fontSize: "0.9rem" }}>
                            +{tx.nominal.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
                          </div>
                          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {new Date(tx.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="card-footer bg-white text-center py-3" style={{ borderTop: "1px solid var(--border-soft)" }}>
                <Link href="/admin/laporan" className="btn btn-sm btn-outline-primary rounded-pill px-4">
                  Lihat Semua Laporan
                </Link>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card" style={{ borderRadius: 16, border: "1px solid var(--border-soft)", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white" }}>
              <div className="card-body p-4 text-center">
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚀</div>
                <h5 className="fw-bold mb-3">Akses Cepat</h5>
                <div className="d-flex flex-column gap-2">
                  <Link href="/admin/tagihan" className="btn btn-light rounded-pill fw-semibold shadow-sm">
                    Generate Tagihan SPP
                  </Link>
                  <Link href="/admin/siswa" className="btn btn-outline-light rounded-pill fw-semibold">
                    Tambah Siswa Baru
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
