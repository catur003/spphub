"use client";

import { useEffect, useState } from "react";

type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo: string;
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

export default function SiswaPortalPage() {
  const [daftar, setDaftar] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);
  const [bayarLoading, setBayarLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function muatData() {
    setLoading(true);
    const res = await fetch("/api/tagihan/saya");
    if (res.ok) {
      setDaftar(await res.json());
    } else {
      setError("Gagal memuat data tagihan. Pastikan akun sudah terhubung dengan data siswa.");
    }
    setLoading(false);
  }

  useEffect(() => {
    muatData();
  }, []);

  async function handleBayar(id: string) {
    setBayarLoading(id);
    try {
      const res = await fetch(`/api/tagihan/${id}/bayar`, { method: "POST" });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Gagal inisiasi pembayaran");
        setBayarLoading(null);
        return;
      }

      const scriptUrl = data.isProd 
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";

      // Fungsi untuk memanggil snap popup
      const panggilSnap = () => {
        (window as any).snap.pay(data.token, {
          onSuccess: function (result: any) {
            console.log("Success:", result);
            alert("Pembayaran berhasil! Menunggu sistem memperbarui status...");
            setBayarLoading(null);
            muatData();
          },
          onPending: function (result: any) {
            console.log("Pending:", result);
            alert("Menunggu pembayaran Anda diselesaikan.");
            setBayarLoading(null);
            muatData();
          },
          onError: function (result: any) {
            console.error("Error:", result);
            alert("Pembayaran gagal atau dibatalkan.");
            setBayarLoading(null);
            muatData();
          },
          onClose: function () {
            // Popup ditutup oleh user
            setBayarLoading(null);
          }
        });
      };

      // Injeksi script jika belum ada
      if (!(window as any).snap) {
        const script = document.createElement("script");
        script.src = scriptUrl;
        script.setAttribute("data-client-key", data.clientKey);
        script.onload = () => {
          panggilSnap();
        };
        script.onerror = () => {
          alert("Gagal memuat sistem pembayaran. Coba lagi nanti.");
          setBayarLoading(null);
        };
        document.body.appendChild(script);
      } else {
        panggilSnap();
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
      setBayarLoading(null);
    }
  }

  const totalTagihan = daftar.length;
  const tagihanBelumLunas = daftar.filter(t => t.status === "belum_bayar" || t.status === "terlambat");
  const nominalTunggakan = tagihanBelumLunas.reduce((acc, curr) => acc + curr.nominal, 0);

  return (
    <>

      <style>{`
        body { background-color: #f8fafc; }
        
        .top-navbar {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white; padding: 1rem 2rem;
          display: flex; justify-content: space-between; align-items: center;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
        }
        
        .portal-header {
          background: white; border-bottom: 1px solid var(--border-soft);
          padding: 2rem; margin-bottom: 2rem;
        }

        .stat-box {
          background: white; padding: 1.5rem; border-radius: 16px;
          border: 1px solid var(--border-soft);
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          display: flex; align-items: center; gap: 1rem;
        }
        
        .stat-icon {
          width: 50px; height: 50px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; flex-shrink: 0;
        }

        .tagihan-card {
          background: white; border-radius: 16px; border: 1px solid var(--border-soft);
          padding: 1.5rem; margin-bottom: 1rem;
          display: flex; justify-content: space-between; align-items: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .tagihan-card:hover {
          transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.04);
        }

        .status-badge {
          display: inline-flex; align-items: center; padding: 4px 12px;
          border-radius: 20px; font-size: 0.75rem; font-weight: 600;
        }

        @media (max-width: 768px) {
          .tagihan-card { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .tagihan-action { width: 100%; text-align: right; }
        }
      `}</style>

      <div className="top-navbar">
        <h1 className="h5 mb-0 fw-bold">🎓 Portal Siswa</h1>
        <div>
          <button className="btn btn-sm btn-light rounded-pill px-3 fw-semibold"
            onClick={() => window.location.href = "/"}>
            Kembali
          </button>
        </div>
      </div>

      <div className="portal-header">
        <div className="container" style={{ maxWidth: 900 }}>
          <h2 className="h3 fw-bold mb-1" style={{ color: "var(--ink-900)" }}>Halo, Siswa!</h2>
          <p className="text-muted mb-4">Berikut adalah ringkasan pembayaran SPP Anda.</p>

          <div className="row g-4">
            <div className="col-md-6">
              <div className="stat-box">
                <div className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>💳</div>
                <div>
                  <div className="text-muted small fw-semibold">Total Tunggakan</div>
                  <div className="h3 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>
                    {nominalTunggakan.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="stat-box">
                <div className="stat-icon" style={{ background: "#eef2ff", color: "#4f46e5" }}>📋</div>
                <div>
                  <div className="text-muted small fw-semibold">Tagihan Belum Dibayar</div>
                  <div className="h3 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>
                    {tagihanBelumLunas.length} <span className="h6 text-muted">Bulan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container pb-5" style={{ maxWidth: 900 }}>
        <h3 className="h5 fw-bold mb-4" style={{ color: "var(--ink-900)" }}>Riwayat & Tagihan Saya</h3>

        {loading ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border text-primary mb-3" />
            <p>Memuat data tagihan...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : daftar.length === 0 ? (
          <div className="text-center py-5 text-muted bg-white rounded-4 border">
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
            <h5>Belum ada tagihan!</h5>
            <p>Sepertinya tidak ada tagihan SPP untuk Anda saat ini.</p>
          </div>
        ) : (
          daftar.map((t) => {
            const info = STATUS_INFO[t.status] || { label: t.status, bg: "#f3f4f6", color: "#374151" };
            return (
              <div className="tagihan-card" key={t.id}>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h4 className="h6 fw-bold mb-0" style={{ color: "var(--ink-900)" }}>
                      SPP Bulan {BULAN_LABEL[t.bulan]} {t.tahun}
                    </h4>
                    <span className="status-badge" style={{ background: info.bg, color: info.color }}>
                      {info.label}
                    </span>
                  </div>
                  <div className="text-muted small">
                    Jatuh tempo: {new Date(t.jatuhTempo).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
                
                <div className="tagihan-action d-flex align-items-center gap-3">
                  <div className="fw-bold fs-5" style={{ color: "var(--ink-900)" }}>
                    Rp {t.nominal.toLocaleString("id-ID")}
                  </div>
                  
                  {t.status === "lunas" || t.status === "menunggu_verifikasi" ? (
                    <button className="btn btn-light px-4 rounded-pill fw-semibold" disabled>
                      {t.status === "lunas" ? "Sudah Dibayar" : "Diproses"}
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary px-4 rounded-pill fw-semibold shadow-sm"
                      onClick={() => handleBayar(t.id)}
                      disabled={bayarLoading === t.id}
                    >
                      {bayarLoading === t.id ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : "Bayar Sekarang"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
