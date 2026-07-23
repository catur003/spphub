"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import "./siswa.css";

type SiswaProfile = {
  id: string;
  nis: string;
  nisn: string | null;
  namaLengkap: string;
  jenisKelamin: "L" | "P";
  namaWali: string | null;
  kontakWali: string | null;
  fotoUrl: string | null;
  status: string;
  kelas: { namaKelas: string } | null;
  akun: { email: string; name: string } | null;
};

type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo: string;
  tahunAjaran?: { nama: string };
  pembayaran?: { id: string; paidAt: string | null; metode: string; orderId: string }[];
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

const STATUS_INFO: Record<string, { label: string; bg: string; color: string; badgeClass: string }> = {
  belum_bayar:          { label: "Belum Bayar",         bg: "#fee2e2", color: "#991b1b", badgeClass: "pulse-warning" },
  menunggu_verifikasi:  { label: "Menunggu Verifikasi",  bg: "#fef9c3", color: "#854d0e", badgeClass: "pulse-info" },
  lunas:                { label: "Lunas",                bg: "#dcfce7", color: "#15803d", badgeClass: "pulse-success" },
  terlambat:            { label: "Terlambat",            bg: "#fee2e2", color: "#991b1b", badgeClass: "pulse-danger" },
};

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
  const router = useRouter();
  const [siswa, setSiswa] = useState<SiswaProfile | null>(null);
  const [daftar, setDaftar] = useState<Tagihan[]>([]);
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<"tagihan" | "riwayat" | "profil">("tagihan");

  const [searchRiwayat, setSearchRiwayat] = useState("");
  const [bayarLoading, setBayarLoading] = useState<string | null>(null);
  const [cekStatusLoading, setCekStatusLoading] = useState<string | null>(null);
  const [bayarError, setBayarError] = useState<string | null>(null);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);
  const [midtrans, setMidtrans] = useState<MidtransConfig>(null);
  const [noHpBendahara, setNoHpBendahara] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/midtrans-public")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMidtrans(data); });

    fetch("/api/settings/sekolah-public")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.noHpBendahara) setNoHpBendahara(data.noHpBendahara); });
  }, []);

  async function muatData() {
    setLoading(true);
    try {
      const [resSiswa, resTagihan] = await Promise.all([
        fetch("/api/siswa/saya"),
        fetch("/api/tagihan/saya"),
      ]);

      if (resSiswa.ok) {
        setSiswa(await resSiswa.json());
      } else {
        const d = await resSiswa.json().catch(() => ({}));
        setPageError(d.error || "Gagal memuat data profil siswa.");
      }

      if (resTagihan.ok) {
        const data = await resTagihan.json();
        setDaftar(Array.isArray(data) ? data : []);
        setPageError("");
      } else {
        const d = await resTagihan.json().catch(() => ({}));
        setPageError(d.error || "Gagal memuat data tagihan.");
      }
    } catch {
      setPageError("Tidak bisa terhubung ke server. Periksa koneksi Anda.");
    }

    try {
      const resPengumuman = await fetch("/api/pengumuman?limit=3");
      if (resPengumuman.ok) {
        const data = await resPengumuman.json();
        setPengumuman(Array.isArray(data) ? data : []);
      }
    } catch {
      // Ignore if announcements fail
    }

    setLoading(false);
  }

  useEffect(() => { muatData(); }, []);

  function tampilToast(msg: string, type: "success" | "info" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    tampilToast(`${label} "${text}" berhasil disalin!`, "info");
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authClient.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      window.location.href = "/login";
    }
  }

  async function handleCekStatus(id: string) {
    setCekStatusLoading(id);
    try {
      const res = await fetch(`/api/tagihan/${id}/cek-status`);
      const data = await res.json();
      
      if (!res.ok) {
        tampilToast(data.error || "Gagal mengecek status pembayaran.", "error");
      } else if (data.status === "lunas") {
        tampilToast("Pembayaran dikonfirmasi LUNAS! Terima kasih.", "success");
        muatData();
      } else if (data.updated) {
        tampilToast(`Status diperbarui: ${data.status}`, "info");
        muatData();
      } else {
        tampilToast("Pembayaran belum terdeteksi. Silakan coba beberapa saat lagi.", "info");
      }
    } catch (err) {
      console.error(err);
      tampilToast("Kesalahan jaringan saat mengecek status.", "error");
    } finally {
      setCekStatusLoading(null);
    }
  }

  async function handleBayar(id: string) {
    setBayarLoading(id);
    setBayarError(null);

    try {
      const res = await fetch(`/api/tagihan/${id}/bayar`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setBayarError(data.error || "Gagal inisiasi pembayaran.");
        setBayarLoading(null);
        return;
      }

      if (!data.token) {
        setBayarError("Token Midtrans tidak valid. Hubungi admin.");
        setBayarLoading(null);
        return;
      }

      try {
        await waitForSnap();
      } catch {
        setBayarError("Sistem pembayaran timeout. Coba refresh halaman.");
        setBayarLoading(null);
        return;
      }

      if (!(window as any).snap) {
        setBayarError("Sistem pembayaran tidak bisa dimuat. Refresh halaman.");
        setBayarLoading(null);
        return;
      }

      (window as any).snap.pay(data.token, {
        onSuccess: () => {
          tampilToast("Pembayaran berhasil diselesaikan! Menyinkronkan status...", "success");
          setBayarLoading(null);
          handleCekStatus(id);
        },
        onPending: () => {
          tampilToast("Menunggu pembayaran. Selesaikan transaksi lalu klik 'Cek Status'.", "info");
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
      setBayarError("Terjadi kesalahan: " + (err?.message || "unknown"));
      setBayarLoading(null);
    }
  }

  const tagihanBelumLunas = daftar.filter(t => t.status === "belum_bayar" || t.status === "terlambat" || t.status === "menunggu_verifikasi");
  const tagihanLunas = daftar.filter(t => t.status === "lunas");
  
  const nominalTunggakan = tagihanBelumLunas.reduce((acc, curr) => acc + curr.nominal, 0);
  const nominalLunas = tagihanLunas.reduce((acc, curr) => acc + curr.nominal, 0);

  // Progres SPP %
  const totalBulanCount = daftar.length || 1;
  const lunasCount = tagihanLunas.length;
  const persenLunas = Math.round((lunasCount / totalBulanCount) * 100);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const tagihanBulanIni = daftar.find(t => t.bulan === currentMonth && t.tahun === currentYear);

  const initials = siswa?.namaLengkap
    ? siswa.namaLengkap.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "S";

  // Filtered Riwayat Lunas
  const filteredRiwayat = tagihanLunas.filter(t => {
    if (!searchRiwayat) return true;
    const bulanNama = BULAN_LABEL[t.bulan].toLowerCase();
    const tahunStr = String(t.tahun);
    const q = searchRiwayat.toLowerCase();
    return bulanNama.includes(q) || tahunStr.includes(q);
  });

  // Link WhatsApp Bendahara
  const hpClean = noHpBendahara ? noHpBendahara.replace(/\D/g, "").replace(/^0/, "62") : "";
  const waUrl = hpClean
    ? `https://wa.me/${hpClean}?text=${encodeURIComponent(
        `Halo Admin/Bendahara Sekolah, saya ${siswa?.namaLengkap || "Siswa"} (NIS: ${siswa?.nis || "-"}, Kelas: ${siswa?.kelas?.namaKelas || "-"}) ingin menanyakan mengenai informasi tagihan SPP.`
      )}`
    : `https://wa.me/?text=${encodeURIComponent(
        `Halo Admin/Bendahara Sekolah, saya ${siswa?.namaLengkap || "Siswa"} (NIS: ${siswa?.nis || "-"}, Kelas: ${siswa?.kelas?.namaKelas || "-"}) ingin menanyakan mengenai informasi tagihan SPP.`
      )}`;

  return (
    <>
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

      {/* Top Navbar */}
      <div className="top-navbar">
        <div className="d-flex align-items-center gap-2 text-truncate me-2">
          <span className="navbar-logo-icon">🎓</span>
          <div className="text-truncate">
            <h1 className="h6 mb-0 fw-bold text-white text-truncate brand-title">SPP Sekolah Digital</h1>
            <span className="brand-badge">Portal Siswa</span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-light rounded-pill px-3 fw-bold d-none d-md-inline-flex align-items-center gap-1 text-dark btn-wa-nav"
            title="Hubungi Bendahara via WhatsApp"
          >
            💬 Hubungi Bendahara
          </a>
          <button
            className="btn btn-sm btn-logout-custom rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <><span className="spinner-border spinner-border-sm me-1" /> Keluar...</>
            ) : (
              <><span>Keluar</span> 🚪</>
            )}
          </button>
        </div>
      </div>

      {/* Student Hero Header */}
      <div className="student-hero">
        <div className="container" style={{ maxWidth: 980 }}>
          <div className="d-flex align-items-center gap-3 gap-md-4 flex-column flex-sm-row text-center text-sm-start">
            <div className="avatar-box flex-shrink-0 animate-bounce-slow">
              {siswa?.fotoUrl ? (
                <img src={siswa.fotoUrl} alt="Foto Profil" className="avatar-img" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="flex-grow-1 w-100">
              <div className="d-flex align-items-center justify-content-center justify-content-sm-start gap-2 flex-wrap mb-1">
                <h2 className="h4 fw-bold mb-0 text-dark student-name">
                  {siswa?.namaLengkap || "Siswa"}
                </h2>
                <span className="badge bg-indigo-subtle text-indigo px-3 py-1 rounded-pill fw-bold badge-kelas">
                  Kelas {siswa?.kelas?.namaKelas || "-"}
                </span>
                <span className="badge bg-success-subtle text-success px-3 py-1 rounded-pill fw-bold badge-status-aktif">
                  ● Aktif
                </span>
              </div>

              <div className="d-flex align-items-center justify-content-center justify-content-sm-start gap-2 flex-wrap mt-2">
                <span className="text-muted small">
                  NIS: <strong className="text-dark">{siswa?.nis || "-"}</strong>
                </span>
                {siswa?.nis && (
                  <button className="copy-badge-btn" onClick={() => copyToClipboard(siswa.nis, "NIS")}>
                    📋 Salin NIS
                  </button>
                )}
                {siswa?.nisn && (
                  <>
                    <span className="text-muted small d-none d-sm-inline">|</span>
                    <span className="text-muted small">NISN: <strong className="text-dark">{siswa.nisn}</strong></span>
                    <button className="copy-badge-btn" onClick={() => copyToClipboard(siswa.nisn!, "NISN")}>
                      📋 Salin NISN
                    </button>
                  </>
                )}
              </div>

              {siswa?.namaWali && (
                <p className="text-muted mb-0 mt-2 style-italic" style={{ fontSize: "0.82rem" }}>
                  👨‍👩‍👧 Wali: <strong>{siswa.namaWali}</strong> {siswa.kontakWali ? `(${siswa.kontakWali})` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Container Dashboard Content */}
      <div className="container pb-5" style={{ maxWidth: 980 }}>
        
        {/* Progres SPP Component */}
        <div className="progress-card animate-fade-in delay-1">
          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
            <div>
              <span className="fw-bold text-dark" style={{ fontSize: "0.92rem" }}>📊 Capaian SPP Sekolah</span>
              <span className="text-muted small ms-2 d-none d-sm-inline">({lunasCount} dari {totalBulanCount} bulan terbayar)</span>
            </div>
            <span className="badge bg-success rounded-pill px-3 py-1 fw-bold shadow-sm">{persenLunas}% Lunas</span>
          </div>
          <div className="progress" style={{ height: 10, borderRadius: 20, backgroundColor: "#e2e8f0" }}>
            <div
              className="progress-bar-fill"
              style={{ width: `${persenLunas}%` }}
              role="progressbar"
              aria-valuenow={persenLunas}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Ringkasan Stats Cards */}
        <div className="row g-3 mb-4 animate-fade-in delay-2">
          <div className="col-12 col-sm-6 col-md-4">
            <div className="stat-card-custom">
              <div className="stat-icon-bg" style={{ background: "#fee2e2", color: "#dc2626" }}>💳</div>
              <div>
                <div className="text-muted small fw-semibold">Total Tunggakan</div>
                <div className="h5 mb-0 fw-bold" style={{ color: "#dc2626" }}>
                  {nominalTunggakan.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
                </div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{tagihanBelumLunas.length} bulan belum lunas</div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <div className="stat-card-custom">
              <div className="stat-icon-bg" style={{ background: "#dcfce7", color: "#16a34a" }}>✅</div>
              <div>
                <div className="text-muted small fw-semibold">SPP Terbayar</div>
                <div className="h5 mb-0 fw-bold" style={{ color: "#16a34a" }}>
                  {nominalLunas.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
                </div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{tagihanLunas.length} bulan lunas</div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-12 col-md-4">
            <div className="stat-card-custom">
              <div className="stat-icon-bg" style={{ background: "#e0e7ff", color: "#4338ca" }}>📅</div>
              <div>
                <div className="text-muted small fw-semibold">Status SPP Bulan Ini</div>
                <div className="h6 mb-0 fw-bold mt-1">
                  {tagihanBulanIni ? (
                    <span className={`status-badge ${STATUS_INFO[tagihanBulanIni.status]?.badgeClass || ""}`} style={{
                      background: STATUS_INFO[tagihanBulanIni.status]?.bg,
                      color: STATUS_INFO[tagihanBulanIni.status]?.color
                    }}>
                      {STATUS_INFO[tagihanBulanIni.status]?.label}
                    </span>
                  ) : (
                    <span className="text-muted small">Belum terbit</span>
                  )}
                </div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{BULAN_LABEL[currentMonth]} {currentYear}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pengumuman Alerts */}
        {pengumuman.length > 0 && (
          <div className="mb-4 animate-fade-in delay-3">
            {pengumuman.map(p => (
              <div key={p.id} className="alert border-0 shadow-sm mb-3 p-3 pengumuman-card">
                <div className="d-flex gap-3 align-items-start">
                  <div style={{ fontSize: "1.6rem" }} className="animate-pulse">📢</div>
                  <div className="flex-grow-1">
                    <div className="fw-bold text-primary mb-1">{p.judul}</div>
                    <div className="text-dark small mb-1" style={{ whiteSpace: "pre-wrap" }}>{p.isi}</div>
                    <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                      Diterbitkan: {new Date(p.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Banner Error Pembayaran */}
        {bayarError && (
          <div className="alert d-flex align-items-start gap-2 mb-4 animate-shake"
            style={{ background: "#fff1f2", border: "1.5px solid #fecaca", borderRadius: 16, color: "#991b1b" }}>
            <span style={{ fontSize: "1.2rem" }}>⚠️</span>
            <div>
              <strong>Pembayaran Gagal:</strong> {bayarError}
            </div>
            <button className="btn-close btn-close-sm ms-auto" onClick={() => setBayarError(null)} />
          </div>
        )}

        {/* Tab Headers */}
        <div className="nav-tabs-custom animate-fade-in delay-3">
          <button 
            className={`nav-tab-item ${activeTab === "tagihan" ? "active" : ""}`}
            onClick={() => setActiveTab("tagihan")}
          >
            💳 Tagihan SPP ({tagihanBelumLunas.length})
          </button>
          <button 
            className={`nav-tab-item ${activeTab === "riwayat" ? "active" : ""}`}
            onClick={() => setActiveTab("riwayat")}
          >
            📑 Riwayat Lunas ({tagihanLunas.length})
          </button>
          <button 
            className={`nav-tab-item ${activeTab === "profil" ? "active" : ""}`}
            onClick={() => setActiveTab("profil")}
          >
            👤 Data Diri Siswa
          </button>
        </div>

        {/* TAB 1: TAGIHAN AKTIF */}
        {activeTab === "tagihan" && (
          <div className="tab-pane-animate">
            {loading ? (
              <div className="text-center py-5 text-muted"><div className="spinner-border text-primary mb-2" /><p>Memuat tagihan...</p></div>
            ) : pageError ? (
              <div className="alert alert-danger">{pageError}</div>
            ) : tagihanBelumLunas.length === 0 ? (
              <div className="text-center py-5 bg-white rounded-4 border p-4 shadow-sm animate-bounce-slow">
                <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>🎉</div>
                <h4 className="h5 fw-bold" style={{ color: "#0f172a" }}>Semua Tagihan SPP Lunas!</h4>
                <p className="text-muted small">Terima kasih, tidak ada tunggakan SPP yang perlu dibayar saat ini.</p>
              </div>
            ) : (
              tagihanBelumLunas.map((t) => {
                const info = STATUS_INFO[t.status] || { label: t.status, bg: "#f3f4f6", color: "#374151", badgeClass: "" };
                const isBayarLoading = bayarLoading === t.id;
                const isCekLoading = cekStatusLoading === t.id;

                return (
                  <div className="tagihan-card-modern" key={t.id}>
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <h4 className="h6 fw-bold mb-0 text-dark">
                          SPP Bulan {BULAN_LABEL[t.bulan]} {t.tahun}
                        </h4>
                        <span className={`status-badge ${info.badgeClass}`} style={{ background: info.bg, color: info.color }}>
                          {info.label}
                        </span>
                      </div>
                      <div className="text-muted small">
                        Jatuh tempo: <strong>{new Date(t.jatuhTempo).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-3 tagihan-action-group">
                      <div className="fw-bold fs-5 text-dark">
                        Rp {t.nominal.toLocaleString("id-ID")}
                      </div>

                      <div className="d-flex gap-2 w-100-mobile">
                        <button
                          className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold btn-action-mobile"
                          onClick={() => handleCekStatus(t.id)}
                          disabled={isCekLoading || isBayarLoading}
                          title="Sinkronkan status dengan server Midtrans"
                        >
                          {isCekLoading ? <span className="spinner-border spinner-border-sm" /> : "🔄 Cek Status"}
                        </button>

                        <button
                          className="btn btn-primary btn-sm px-4 rounded-pill fw-bold shadow-sm btn-action-mobile btn-pay-animated"
                          onClick={() => handleBayar(t.id)}
                          disabled={isBayarLoading || isCekLoading}
                        >
                          {isBayarLoading ? (
                            <><span className="spinner-border spinner-border-sm me-1" /> Memuat...</>
                          ) : "Bayar Sekarang ➔"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: RIWAYAT LUNAS */}
        {activeTab === "riwayat" && (
          <div className="tab-pane-animate">
            {tagihanLunas.length > 0 && (
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control form-control-sm search-riwayat-input"
                  placeholder="🔍 Cari bulan / tahun riwayat..."
                  value={searchRiwayat}
                  onChange={(e) => setSearchRiwayat(e.target.value)}
                />
              </div>
            )}

            {loading ? (
              <div className="text-center py-5 text-muted"><div className="spinner-border text-primary mb-2" /><p>Memuat riwayat...</p></div>
            ) : tagihanLunas.length === 0 ? (
              <div className="text-center py-5 bg-white rounded-4 border p-4 shadow-sm">
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📜</div>
                <h5 className="fw-bold">Belum Ada Riwayat</h5>
                <p className="text-muted small">Belum ada transaksi pembayaran SPP yang berstatus lunas.</p>
              </div>
            ) : filteredRiwayat.length === 0 ? (
              <div className="text-center py-4 bg-white rounded-4 border p-3">
                <p className="text-muted mb-0 small">Tidak ditemukan riwayat pembayaran yang cocok.</p>
              </div>
            ) : (
              filteredRiwayat.map((t) => (
                <div className="tagihan-card-modern" key={t.id}>
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                      <h4 className="h6 fw-bold mb-0 text-dark">
                        SPP Bulan {BULAN_LABEL[t.bulan]} {t.tahun}
                      </h4>
                      <span className="status-badge" style={{ background: "#dcfce7", color: "#15803d" }}>
                        ✓ LUNAS
                      </span>
                    </div>
                    <div className="text-muted small">
                      Nominal: <strong>Rp {t.nominal.toLocaleString("id-ID")}</strong>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2 w-100-mobile">
                    <a
                      href={`/kwitansi/${t.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-primary btn-sm rounded-pill px-4 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-1 w-100-mobile"
                    >
                      <span>📄</span> Kwitansi PDF
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: PROFIL SAYA */}
        {activeTab === "profil" && (
          <div className="bg-white rounded-4 border p-4 shadow-sm tab-pane-animate">
            <h3 className="h6 fw-bold mb-3 text-uppercase text-primary" style={{ letterSpacing: "1px" }}>
              📋 Identitas Siswa Lengkap
            </h3>
            
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <div className="label">Nama Lengkap</div>
                <div className="value">{siswa?.namaLengkap || "-"}</div>
              </div>
              <div className="profile-info-item">
                <div className="label">NIS / NISN</div>
                <div className="value">{siswa?.nis || "-"} / {siswa?.nisn || "-"}</div>
              </div>
              <div className="profile-info-item">
                <div className="label">Kelas</div>
                <div className="value">{siswa?.kelas?.namaKelas || "-"}</div>
              </div>
              <div className="profile-info-item">
                <div className="label">Jenis Kelamin</div>
                <div className="value">{siswa?.jenisKelamin === "L" ? "Laki-Laki" : "Perempuan"}</div>
              </div>
              <div className="profile-info-item">
                <div className="label">Nama Wali</div>
                <div className="value">{siswa?.namaWali || "-"}</div>
              </div>
              <div className="profile-info-item">
                <div className="label">Kontak Wali / No HP</div>
                <div className="value">{siswa?.kontakWali || "-"}</div>
              </div>
              <div className="profile-info-item">
                <div className="label">Email Akun Login</div>
                <div className="value">{siswa?.akun?.email || "-"}</div>
              </div>
              <div className="profile-info-item">
                <div className="label">Status Siswa</div>
                <div className="value text-success">● Active / Aktif</div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating WhatsApp Action Button for Mobile */}
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className="floating-wa-btn d-md-none"
        title="Hubungi Bendahara via WhatsApp"
      >
        💬 WA Bendahara
      </a>
    </>
  );
}
