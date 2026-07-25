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
  saldoKas?: number;
  labaRugi?: number;
  sppBelumDibayarTotal?: number;
  sppBelumDibayarCount?: number;
  utangPegawaiTotal?: number;
  utangPegawaiCount?: number;
  totalSiswa?: number;
  siswaBaruBulanIni?: number;
  pendapatanBulanIni?: number;
  tunggakanBulanIni?: number;
  jumlahTagihanBelumDibuat?: number;
  transaksiTerbaru?: Transaksi[];
  pieChartData?: { name: string; value: number; color: string }[];
  barChartData?: { name: string; total: number }[];
  notifikasiPenting?: Notifikasi[];
  bulan?: number;
  tahun?: number;
};

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const CACHE_KEY = "dashboard_cache";
const CACHE_TTL_MS = 60_000;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { payload, ts } = JSON.parse(cached);
        if (payload && Date.now() - ts < CACHE_TTL_MS * 5) {
          setData(payload);
          setLoading(false);
        }
      }
    } catch {}

    fetch("/api/dashboard")
      .then((res) => (res.ok ? res.json() : null))
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

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetch("/api/dashboard")
          .then((res) => (res.ok ? res.json() : null))
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
      <div className="container-fluid p-4">
        <div className="p-5 text-center text-muted">
          <div className="spinner-border text-primary me-2" />
          <span>Memuat executive dashboard...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const saldoKas = Number(data.saldoKas ?? data.pendapatanBulanIni ?? 0);
  const labaRugi = Number(data.labaRugi ?? ((data.pendapatanBulanIni || 0) - (data.tunggakanBulanIni || 0)));
  const sppBelumTotal = Number(data.sppBelumDibayarTotal ?? data.tunggakanBulanIni ?? 0);
  const sppBelumCount = Number(data.sppBelumDibayarCount ?? 0);
  const utangPegawaiTotal = Number(data.utangPegawaiTotal ?? 0);
  const utangPegawaiCount = Number(data.utangPegawaiCount ?? 0);

  const barChartData = Array.isArray(data.barChartData) ? data.barChartData : [];
  const pieChartData = Array.isArray(data.pieChartData) ? data.pieChartData : [];
  const transaksiTerbaru = Array.isArray(data.transaksiTerbaru) ? data.transaksiTerbaru : [];
  const notifikasiPenting = Array.isArray(data.notifikasiPenting) ? data.notifikasiPenting : [];
  const jumlahTagihanBelumDibuat = Number(data.jumlahTagihanBelumDibuat ?? 0);
  const bulan = data.bulan || new Date().getMonth() + 1;
  const tahun = data.tahun || new Date().getFullYear();

  return (
    <>
      <style>{`
        .executive-card {
          border: none; border-radius: 16px; color: white; padding: 1.25rem 1.4rem;
          position: relative; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer;
        }
        .executive-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.18); }
        .executive-card__val { font-size: 1.65rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
        .executive-card__title { font-size: 0.88rem; font-weight: 600; opacity: 0.92; margin-top: 0.35rem; }
        .executive-card__footer {
          margin-top: 1.1rem; padding-top: 0.6rem; border-top: 1px solid rgba(255,255,255,0.22);
          font-size: 0.78rem; font-weight: 500; opacity: 0.95; display: flex; align-items: center; gap: 6px;
        }
        .executive-card__icon-wrap {
          position: absolute; top: 1.1rem; right: 1.1rem; width: 42px; height: 42px;
          border-radius: 50%; background: rgba(255,255,255,0.25); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
        }

        .card-blue   { background: linear-gradient(135deg, #1d72e8, #0d52bf); }
        .card-green  { background: linear-gradient(135deg, #2e7d32, #1b5e20); }
        .card-orange { background: linear-gradient(135deg, #e65100, #f57c00); }
        .card-red    { background: linear-gradient(135deg, #d32f2f, #c62828); }

        .dashboard-section-title { font-size: 1.05rem; font-weight: 700; color: var(--ink-900); }
      `}</style>

      <div className="container-fluid p-4">
        {/* Header Title */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Executive Financial Dashboard</h1>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
              Ringkasan Realtime Arus Kas, Tagihan, dan Keuangan Sekolah
            </p>
          </div>
          <div className="d-flex gap-2">
            <Link href="/admin/keuangan/pendapatan" className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold">
              💵 Catat Pendapatan
            </Link>
            <Link href="/admin/keuangan/pengeluaran" className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold">
              💸 Catat Pengeluaran
            </Link>
          </div>
        </div>

        {/* Banner Notifikasi Tagihan Belum Dibuat */}
        {jumlahTagihanBelumDibuat > 0 && (
          <div className="alert alert-warning border-0 shadow-sm d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4" style={{ borderRadius: 14, background: "#fff8e6" }}>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: "1.2rem" }}>⚡</span>
              <div>
                <strong style={{ color: "#854d0e" }}>Tagihan Periode Ini:</strong> Ada <strong>{jumlahTagihanBelumDibuat} siswa aktif</strong> yang belum dibuatkan tagihan SPP bulan {BULAN_LABEL[bulan]} {tahun}.
              </div>
            </div>
            <Link href="/admin/tagihan" className="btn btn-sm btn-warning fw-bold px-3 py-1 text-dark" style={{ borderRadius: 10, fontSize: "0.8rem" }}>
              👉 Generate Massal
            </Link>
          </div>
        )}

        {/* 4 Executive Stat Cards Matching Reference Photo */}
        <div className="row g-3 mb-4">
          {/* Card 1: Saldo Kas */}
          <div className="col-12 col-sm-6 col-xl-3">
            <Link href="/admin/keuangan/laporan" className="text-decoration-none">
              <div className="executive-card card-blue">
                <div className="executive-card__icon-wrap">👛</div>
                <div className="executive-card__val">
                  {saldoKas.toLocaleString("id-ID")}
                </div>
                <div className="executive-card__title">Saldo Kas Utama</div>
                <div className="executive-card__footer">
                  <span>📅 Per {todayStr}</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Card 2: Laba / Rugi Net */}
          <div className="col-12 col-sm-6 col-xl-3">
            <Link href="/admin/keuangan/laporan" className="text-decoration-none">
              <div className="executive-card card-green">
                <div className="executive-card__icon-wrap">🛍️</div>
                <div className="executive-card__val">
                  {labaRugi.toLocaleString("id-ID")}
                </div>
                <div className="executive-card__title">Laba/Rugi Net</div>
                <div className="executive-card__footer">
                  <span>📅 Per {todayStr}</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Card 3: SPP Belum Dibayar */}
          <div className="col-12 col-sm-6 col-xl-3">
            <Link href="/admin/tagihan?status=belum_bayar" className="text-decoration-none">
              <div className="executive-card card-orange">
                <div className="executive-card__icon-wrap">📄</div>
                <div className="executive-card__val">
                  {sppBelumTotal.toLocaleString("id-ID")}
                </div>
                <div className="executive-card__title">SPP Belum Dibayar</div>
                <div className="executive-card__footer">
                  <span>👤 {sppBelumCount} siswa belum bayar</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Card 4: Utang Pegawai */}
          <div className="col-12 col-sm-6 col-xl-3">
            <Link href="/admin/keuangan/utang-pegawai" className="text-decoration-none">
              <div className="executive-card card-red">
                <div className="executive-card__icon-wrap">💵</div>
                <div className="executive-card__val">
                  {utangPegawaiTotal.toLocaleString("id-ID")}
                </div>
                <div className="executive-card__title">Utang Pegawai (Kasbon)</div>
                <div className="executive-card__footer">
                  <span>👤 {utangPegawaiCount} pegawai aktif</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Charts & Graphs Row */}
        <div className="row g-3 mb-4">
          {/* Bar Chart: Tren Pemasukan 6 Bulan */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: 18 }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <div className="dashboard-section-title">📊 Tren Pemasukan SPP (6 Bulan Terakhir)</div>
                  <div className="text-muted small">Total penerimaan kas SPP yang terverifikasi</div>
                </div>
              </div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                    <RechartsTooltip
                      formatter={(val: number) => [`Rp ${val.toLocaleString('id-ID')}`, 'Total Pemasukan']}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                    />
                    <Bar dataKey="total" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#818cf8" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Pie Chart: Distribusi Status Pembayaran */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: 18 }}>
              <div className="dashboard-section-title mb-1">🍩 Rasio Status SPP</div>
              <div className="text-muted small mb-3">Bulan {BULAN_LABEL[bulan]} {tahun}</div>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4}>
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    <RechartsTooltip formatter={(val: number) => [`${val} Siswa`, 'Jumlah']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Transaksi Terbaru & Pengumuman */}
        <div className="row g-3">
          {/* Transaksi Lunas Terbaru */}
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm p-4" style={{ borderRadius: 18 }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="dashboard-section-title">⚡ Pembayaran Lunas Terbaru</div>
                <Link href="/admin/tagihan?status=lunas" className="small text-primary text-decoration-none fw-bold">
                  Lihat Semua →
                </Link>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.86rem" }}>
                  <thead className="table-light">
                    <tr>
                      <th>Siswa</th>
                      <th>Periode</th>
                      <th>Nominal</th>
                      <th>Tanggal Lunas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transaksiTerbaru.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="fw-bold text-dark">{t.siswa?.namaLengkap || "Siswa"}</div>
                          <div className="text-muted small">{t.siswa?.kelas?.namaKelas || "-"}</div>
                        </td>
                        <td>{BULAN_LABEL[t.bulan]} {t.tahun}</td>
                        <td className="fw-bold text-success">Rp {(t.nominal || 0).toLocaleString("id-ID")}</td>
                        <td className="text-muted small">
                          {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"}
                        </td>
                      </tr>
                    ))}
                    {transaksiTerbaru.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">Belum ada transaksi lunas.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pengumuman Terbaru */}
          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm p-4" style={{ borderRadius: 18 }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="dashboard-section-title">📢 Pengumuman Sekolah</div>
                <Link href="/admin/pengumuman" className="small text-primary text-decoration-none fw-bold">
                  Kelola →
                </Link>
              </div>
              <div className="d-flex flex-column gap-2">
                {notifikasiPenting.map((n) => (
                  <div key={n.id} className="p-3 rounded-3 border bg-light">
                    <div className="fw-bold text-dark mb-1" style={{ fontSize: "0.9rem" }}>{n.judul}</div>
                    <div className="text-muted small" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {n.isi}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.72rem", marginTop: 4 }}>
                      🕒 {new Date(n.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                ))}
                {notifikasiPenting.length === 0 && (
                  <div className="text-center text-muted py-4 small">Belum ada pengumuman terbit.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
