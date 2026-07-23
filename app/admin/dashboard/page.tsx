"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

type Transaksi = {
  id: string;
  nominal: number;
  bulan: number;
  tahun: number;
  updatedAt: string;
  siswa: { namaLengkap: string; kelas: { namaKelas: string } | null };
};

type Notifikasi = {
  id: string;
  judul: string;
  isi: string;
  createdAt: string;
};

type DashboardData = {
  totalSiswa: number;
  siswaBaruBulanIni: number;
  pendapatanBulanIni: number;
  tunggakanBulanIni: number;
  jumlahTagihanBelumDibuat: number;
  transaksiTerbaru: Transaksi[];
  pieChartData: { name: string; value: number; color: string }[];
  barChartData: { name: string; total: number }[];
  notifikasiPenting: Notifikasi[];
  bulan: number;
  tahun: number;
};

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const CACHE_KEY = "dashboard_cache";
const CACHE_TTL_MS = 60_000; // 60 seconds

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show cached data immediately (stale-while-revalidate pattern)
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { payload, ts } = JSON.parse(cached);
        const age = Date.now() - ts;
        if (payload && age < CACHE_TTL_MS * 5) { // Serve cache up to 5 minutes old
          setData(payload);
          setLoading(false);
        }
      }
    } catch {}

    // Always fetch fresh data in background
    fetch("/api/dashboard")
      .then((res) => res.ok ? res.json() : null)
      .then((resData) => {
        if (resData && !resData.error) {
          setData(resData);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ payload: resData, ts: Date.now() }));
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Auto-refresh every 60s while page is visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetch("/api/dashboard")
          .then((res) => res.ok ? res.json() : null)
          .then((resData) => {
            if (resData && !resData.error) {
              setData(resData);
              try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ payload: resData, ts: Date.now() }));
              } catch {}
            }
          })
          .catch(() => {});
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="container-fluid p-4 text-center text-muted py-5">
        <div className="spinner-border text-primary mb-3" />
        <p className="fw-semibold">Memuat data dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <style>{`
        .dash-card {
          background: white; border-radius: 16px; padding: 1.25rem 1.5rem;
          border: 1px solid var(--border-soft);
          box-shadow: 0 4px 16px rgba(0,0,0,0.02);
          display: flex; flex-direction: column; gap: 0.4rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .dash-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
        .dash-card__icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem; margin-bottom: 0.25rem;
        }
        .dash-card__title { font-size: 0.82rem; font-weight: 600; color: var(--ink-500); }
        .dash-card__value { font-size: 1.7rem; font-weight: 800; color: var(--ink-900); line-height: 1.1; }

        .tx-list { list-style: none; padding: 0; margin: 0; }
        .tx-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.9rem 0; border-bottom: 1px solid var(--border-soft);
        }
        .tx-item:last-child { border-bottom: none; }
        .tx-icon {
          width: 38px; height: 38px; border-radius: 50%;
          background: #eef2ff; color: #4f46e5;
          display: flex; align-items: center; justify-content: center; font-size: 1.05rem;
        }

        .notif-card {
          background: #f8fafc; border-radius: 12px; padding: 1rem; border-left: 4px solid #4f46e5;
          margin-bottom: 0.75rem; transition: background 0.15s;
        }
        .notif-card:hover { background: #f1f5f9; }
      `}</style>

      <div className="container-fluid p-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap mb-4">
          <div>
            <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--ink-900)" }}>👋 Dashboard Admin</h1>
            <p className="text-muted mb-0" style={{ fontSize: "0.88rem" }}>
              Ringkasan Operasional SPP Bulan <strong>{BULAN_LABEL[data.bulan]} {data.tahun}</strong>
            </p>
          </div>
          {data.jumlahTagihanBelumDibuat > 0 && (
            <Link href="/admin/tagihan" className="btn btn-warning btn-sm fw-bold px-3 py-2 shadow-sm rounded-pill">
              ⚡ {data.jumlahTagihanBelumDibuat} Siswa Belum Punya Tagihan →
            </Link>
          )}
        </div>

        {/* 4 Stat Cards Utama */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="dash-card">
              <div className="dash-card__icon" style={{ background: "#e0e7ff", color: "#4338ca" }}>👨‍🎓</div>
              <div className="dash-card__title">Total Siswa Aktif</div>
              <div className="dash-card__value">
                {data.totalSiswa} <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#6b7280" }}>Siswa</span>
              </div>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="dash-card">
              <div className="dash-card__icon" style={{ background: "#dcfce7", color: "#15803d" }}>💰</div>
              <div className="dash-card__title">Pemasukan Bulan Ini</div>
              <div className="dash-card__value" style={{ fontSize: "1.45rem", color: "#15803d" }}>
                {data.pendapatanBulanIni.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="dash-card" style={{ borderColor: data.jumlahTagihanBelumDibuat > 0 ? "#fde68a" : "var(--border-soft)" }}>
              <div className="dash-card__icon" style={{ background: "#fef3c7", color: "#92400e" }}>📋</div>
              <div className="dash-card__title">Tagihan Belum Dibuat</div>
              <div className="dash-card__value" style={{ color: "#92400e" }}>
                {data.jumlahTagihanBelumDibuat} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#92400e" }}>Siswa</span>
              </div>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="dash-card">
              <div className="dash-card__icon" style={{ background: "#f0fdf4", color: "#166534" }}>🌱</div>
              <div className="dash-card__title">Siswa Baru Bulan Ini</div>
              <div className="dash-card__value">
                {data.siswaBaruBulanIni} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#6b7280" }}>Siswa</span>
              </div>
            </div>
          </div>
        </div>

        {/* GRAFIK ANALITIK & WIDGET NOTIFIKASI */}
        <div className="row g-4 mb-4">
          <div className="col-lg-8">
            <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: 16 }}>
              <div className="card-header bg-white" style={{ borderBottom: "1px solid var(--border-soft)", padding: "1.1rem 1.4rem" }}>
                <h5 className="mb-0 fw-bold" style={{ fontSize: "0.95rem" }}>📈 Tren Pemasukan SPP (6 Bulan Terakhir)</h5>
              </div>
              <div className="card-body p-4" style={{ minHeight: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                    <YAxis
                      axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }}
                      tickFormatter={(v) => `Rp${(v / 1000000).toFixed(1)}M`}
                    />
                    <RechartsTooltip
                      formatter={(val: any) => [
                        typeof val === "number" ? val.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }) : val,
                        "Total Pemasukan",
                      ]}
                    />
                    <Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: 16 }}>
              <div className="card-header bg-white" style={{ borderBottom: "1px solid var(--border-soft)", padding: "1.1rem 1.4rem" }}>
                <h5 className="mb-0 fw-bold" style={{ fontSize: "0.95rem" }}>📊 Status Pembayaran SPP Bulan Ini</h5>
              </div>
              <div className="card-body p-4 d-flex flex-column align-items-center justify-content-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.pieChartData} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                      {data.pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* TRANSAKSI TERAKHIR & NOTIFIKASI PENTING */}
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
              <div className="card-header bg-white d-flex justify-content-between align-items-center" style={{ borderBottom: "1px solid var(--border-soft)", padding: "1.1rem 1.4rem" }}>
                <h5 className="mb-0 fw-bold" style={{ fontSize: "0.95rem" }}>🕒 Transaksi Pembayaran Terakhir</h5>
                <Link href="/admin/laporan" className="text-primary fw-semibold small text-decoration-none">
                  Lihat Semua →
                </Link>
              </div>
              <div className="card-body p-4">
                <ul className="tx-list">
                  {data.transaksiTerbaru.map((t) => (
                    <li key={t.id} className="tx-item">
                      <div className="d-flex align-items-center gap-3">
                        <div className="tx-icon">✓</div>
                        <div>
                          <div className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>{t.siswa.namaLengkap}</div>
                          <div className="text-muted small">
                            {t.siswa.kelas?.namaKelas || "-"} • {BULAN_LABEL[t.bulan]} {t.tahun}
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-success" style={{ fontSize: "0.9rem" }}>
                          +Rp {t.nominal.toLocaleString("id-ID")}
                        </div>
                        <div className="text-muted" style={{ fontSize: "0.74rem" }}>
                          {new Date(t.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </div>
                      </div>
                    </li>
                  ))}
                  {data.transaksiTerbaru.length === 0 && (
                    <li className="text-center text-muted py-4">Belum ada transaksi pembayaran lunas baru-baru ini.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
              <div className="card-header bg-white d-flex justify-content-between align-items-center" style={{ borderBottom: "1px solid var(--border-soft)", padding: "1.1rem 1.4rem" }}>
                <h5 className="mb-0 fw-bold" style={{ fontSize: "0.95rem" }}>📣 Notifikasi & Pengumuman Penting</h5>
                <Link href="/admin/pengumuman" className="text-primary fw-semibold small text-decoration-none">
                  + Buat Pengumuman
                </Link>
              </div>
              <div className="card-body p-4">
                {data.notifikasiPenting.map((n) => (
                  <div key={n.id} className="notif-card">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "0.9rem" }}>{n.judul}</h6>
                      <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                        {new Date(n.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <p className="text-muted mb-0" style={{ fontSize: "0.82rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {n.isi}
                    </p>
                  </div>
                ))}
                {data.notifikasiPenting.length === 0 && (
                  <div className="text-center text-muted py-4">
                    <div style={{ fontSize: "2rem" }}>📣</div>
                    Belum ada notifikasi atau pengumuman aktif.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
