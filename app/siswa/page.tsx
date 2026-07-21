"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import "./siswa.css";

type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo: string;
};

type Pengumuman = {
  id: string;
  judul: string;
  isi: string;
  createdAt: string;
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

/** Tunggu window.snap tersedia (max 10 detik) */
function waitForSnap(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).snap) { resolve(); return; }
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if ((window as any).snap) { clearInterval(iv); resolve(); }
      else if (tries > 100) { clearInterval(iv); reject(new Error("Snap timeout")); }
    }, 100);
  });
}

type MidtransConfig = { clientKey: string; isProd: boolean } | null;

export default function SiswaPortalPage() {
  const [daftar, setDaftar] = useState<Tagihan[]>([]);
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [bayarLoading, setBayarLoading] = useState<string | null>(null);
  const [bayarError, setBayarError] = useState<string | null>(null);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);
  const [midtrans, setMidtrans] = useState<MidtransConfig>(null);

  // Load midtrans config saat pertama mount
  useEffect(() => {
    fetch("/api/settings/midtrans-public")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMidtrans(data); });
  }, []);

  async function muatData() {
    setLoading(true);
    try {
      const [resTagihan, resPengumuman] = await Promise.all([
        fetch("/api/tagihan/saya"),
        fetch("/api/pengumuman?limit=3")
      ]);
      
      if (resPengumuman.ok) {
        setPengumuman(await resPengumuman.json());
      }

      if (resTagihan.ok) {
        setDaftar(await resTagihan.json());
        setPageError("");
      } else {
        const d = await resTagihan.json();
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

      // 2. Tunggu snap.js siap (sudah dimuat via <Script> component di render)
      try {
        await waitForSnap();
      } catch {
        setBayarError("Sistem pembayaran tidak bisa dimuat (timeout). Coba refresh halaman.");
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
      {/* Midtrans Snap — dimuat oleh Next.js Script, bukan injeksi manual */}
      {midtrans && (
        <Script
          src={midtrans.isProd
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js"}
          data-client-key={midtrans.clientKey}
          strategy="afterInteractive"
        />
      )}

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

          {pengumuman.length > 0 && (
            <div className="mb-4">
              {pengumuman.map(p => (
                <div key={p.id} className="alert alert-info border-0 shadow-sm mb-3" style={{ borderRadius: "12px", background: "linear-gradient(to right, #eff6ff, #dbeafe)" }}>
                  <div className="d-flex gap-3">
                    <div style={{ fontSize: "1.5rem" }}>📢</div>
                    <div>
                      <div className="fw-bold text-primary mb-1">{p.judul}</div>
                      <div className="text-dark small mb-1" style={{ whiteSpace: "pre-wrap" }}>{p.isi}</div>
                      <div className="text-muted" style={{ fontSize: "0.7rem" }}>{new Date(p.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                    <div className="d-flex align-items-center gap-2">
                      <button className="btn btn-success btn-sm rounded-pill px-3 fw-semibold" disabled>
                        ✓ Lunas
                      </button>
                      <a href={`/kwitansi/${t.id}`} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-semibold">
                        Kwitansi
                      </a>
                    </div>
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
