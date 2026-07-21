"use client";

import { useEffect, useState } from "react";
import "./siswa.css";

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

/** Muat snap.js dari Midtrans dan resolve setelah siap */
function loadSnapScript(src: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Cek apakah snap sudah ada
    if ((window as any).snap) {
      resolve();
      return;
    }
    // Cek apakah script sudah di-inject sebelumnya (tapi belum selesai load)
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Script sudah ada tapi gagal load")));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat script Midtrans dari: " + src));
    document.head.appendChild(script);
  });
}

export default function SiswaPortalPage() {
  const [daftar, setDaftar] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);
  const [bayarLoading, setBayarLoading] = useState<string | null>(null);
  const [bayarError, setBayarError] = useState<string | null>(null);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);

  async function muatData() {
    setLoading(true);
    try {
      const res = await fetch("/api/tagihan/saya");
      if (res.ok) {
        setDaftar(await res.json());
        setPageError("");
      } else {
        const d = await res.json();
        setPageError(d.error || "Gagal memuat data tagihan.");
      }
    } catch {
      setPageError("Tidak bisa terhubung ke server. Periksa koneksi Anda.");
    }
    setLoading(false);
  }

  useEffect(() => { muatData(); }, []);

  function tampilToast(msg: string, type: "success" | "info" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleBayar(id: string) {
    setBayarLoading(id);
    setBayarError(null);

    try {
      // 1. Minta token dari backend
      const res = await fetch(`/api/tagihan/${id}/bayar`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setBayarError(data.error || "Gagal inisiasi pembayaran.");
        setBayarLoading(null);
        return;
      }

      if (!data.token || !data.clientKey) {
        setBayarError("Token Midtrans tidak valid. Hubungi admin.");
        console.error("Respons API tidak lengkap:", data);
        setBayarLoading(null);
        return;
      }

      // 2. Muat snap.js secara dinamis
      const snapUrl = data.isProd
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";

      try {
        await loadSnapScript(snapUrl, data.clientKey);
      } catch (scriptErr: any) {
        console.error("Gagal load snap.js:", scriptErr);
        setBayarError("Gagal memuat sistem pembayaran. Pastikan koneksi internet aktif dan coba lagi.");
        setBayarLoading(null);
        return;
      }

      // 3. Validasi window.snap tersedia
      if (!(window as any).snap) {
        setBayarError("Sistem pembayaran tidak bisa dimuat. Coba refresh halaman.");
        setBayarLoading(null);
        return;
      }

      // 4. Panggil popup Snap
      (window as any).snap.pay(data.token, {
        onSuccess: () => {
          tampilToast("Pembayaran berhasil! Status akan diperbarui.", "success");
          setBayarLoading(null);
          muatData();
        },
        onPending: () => {
          tampilToast("Menunggu pembayaran diselesaikan.", "info");
          setBayarLoading(null);
          muatData();
        },
        onError: (result: any) => {
          console.error("Midtrans onError:", result);
          tampilToast("Pembayaran gagal. Silakan coba lagi.", "error");
          setBayarLoading(null);
        },
        onClose: () => {
          setBayarLoading(null);
        },
      });
    } catch (err: any) {
      console.error("handleBayar error:", err);
      setBayarError("Terjadi kesalahan tak terduga: " + (err?.message || "unknown"));
      setBayarLoading(null);
    }
  }

  const tagihanBelumLunas = daftar.filter(t => t.status === "belum_bayar" || t.status === "terlambat");
  const nominalTunggakan = tagihanBelumLunas.reduce((acc, curr) => acc + curr.nominal, 0);

  return (
    <>
      {toast && (
        <div className={`toast-portal toast-portal--${toast.type}`}>
          {toast.type === "success" ? "✓" : toast.type === "info" ? "ℹ" : "✕"} {toast.msg}
        </div>
      )}

      <div className="top-navbar">
        <h1 className="h5 mb-0 fw-bold">🎓 Portal Siswa</h1>
        <button className="btn btn-sm btn-light rounded-pill px-3 fw-semibold"
          onClick={() => window.location.href = "/"}>
          Kembali
        </button>
      </div>

      <div className="portal-header">
        <div className="container" style={{ maxWidth: 900 }}>
          <h2 className="h3 fw-bold mb-1" style={{ color: "#0f172a" }}>Halo, Siswa! 👋</h2>
          <p className="text-muted mb-4">Berikut adalah ringkasan pembayaran SPP Anda.</p>

          <div className="row g-4">
            <div className="col-md-6">
              <div className="stat-box">
                <div className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>💳</div>
                <div>
                  <div className="text-muted small fw-semibold">Total Tunggakan</div>
                  <div className="h3 mb-0 fw-bold" style={{ color: "#0f172a" }}>
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
                  <div className="h3 mb-0 fw-bold" style={{ color: "#0f172a" }}>
                    {tagihanBelumLunas.length} <span className="h6 text-muted">Bulan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container pb-5" style={{ maxWidth: 900 }}>
        <h3 className="h5 fw-bold mb-3" style={{ color: "#0f172a" }}>Riwayat & Tagihan Saya</h3>

        {/* Error bayar — visible banner */}
        {bayarError && (
          <div className="alert d-flex align-items-start gap-2 mb-3"
            style={{ background: "#fff1f2", border: "1.5px solid #fecaca", borderRadius: 12, color: "#991b1b" }}>
            <span style={{ fontSize: "1.1rem" }}>⚠️</span>
            <div>
              <strong>Pembayaran Gagal:</strong> {bayarError}
            </div>
            <button className="btn-close btn-close-sm ms-auto"
              style={{ fontSize: "0.7rem" }}
              onClick={() => setBayarError(null)} />
          </div>
        )}

        {loading ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border text-primary mb-3" />
            <p>Memuat data tagihan...</p>
          </div>
        ) : pageError ? (
          <div className="alert alert-danger">{pageError}</div>
        ) : daftar.length === 0 ? (
          <div className="text-center py-5 text-muted bg-white rounded-4 border">
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
            <h5>Tidak ada tagihan!</h5>
            <p>Tidak ada tagihan SPP untuk Anda saat ini.</p>
          </div>
        ) : (
          daftar.map((t) => {
            const info = STATUS_INFO[t.status] || { label: t.status, bg: "#f3f4f6", color: "#374151" };
            const isBayarLoading = bayarLoading === t.id;
            return (
              <div className="tagihan-card" key={t.id}>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h4 className="h6 fw-bold mb-0" style={{ color: "#0f172a" }}>
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
                  <div className="fw-bold fs-5" style={{ color: "#0f172a" }}>
                    Rp {t.nominal.toLocaleString("id-ID")}
                  </div>

                  {t.status === "lunas" ? (
                    <button className="btn btn-success btn-sm rounded-pill px-3 fw-semibold" disabled>
                      ✓ Lunas
                    </button>
                  ) : t.status === "menunggu_verifikasi" ? (
                    <button className="btn btn-warning btn-sm rounded-pill px-3 fw-semibold" disabled>
                      ⏳ Diproses
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary px-4 rounded-pill fw-semibold shadow-sm"
                      onClick={() => handleBayar(t.id)}
                      disabled={!!bayarLoading}
                      style={{ minWidth: 140 }}
                    >
                      {isBayarLoading ? (
                        <><span className="spinner-border spinner-border-sm me-1" /> Memuat...</>
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
