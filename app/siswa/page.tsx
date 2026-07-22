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

const STATUS_INFO: Record<string, { label: string; bg: string; color: string }> = {
  belum_bayar:          { label: "Belum Bayar",         bg: "#f3f4f6", color: "#374151" },
  menunggu_verifikasi:  { label: "Menunggu Verifikasi",  bg: "#fef9c3", color: "#854d0e" },
  lunas:                { label: "Lunas",                bg: "#dcfce7", color: "#15803d" },
  terlambat:            { label: "Terlambat",            bg: "#fee2e2", color: "#991b1b" },
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
  const [activeTab, setActiveTab] = useState<"tagihan" | "riwayat" | "profil">("tagihan");
  
  const [bayarLoading, setBayarLoading] = useState<string | null>(null);
  const [cekStatusLoading, setCekStatusLoading] = useState<string | null>(null);
  const [bayarError, setBayarError] = useState<string | null>(null);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);
  const [midtrans, setMidtrans] = useState<MidtransConfig>(null);

  useEffect(() => {
    fetch("/api/settings/midtrans-public")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMidtrans(data); });
  }, []);

  async function muatData() {
    setLoading(true);
    try {
      const [resSiswa, resTagihan, resPengumuman] = await Promise.all([
        fetch("/api/siswa/saya"),
        fetch("/api/tagihan/saya"),
        fetch("/api/pengumuman?limit=3")
      ]);
      
      if (resSiswa.ok) setSiswa(await resSiswa.json());
      if (resPengumuman.ok) setPengumuman(await resPengumuman.json());

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

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
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

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const tagihanBulanIni = daftar.find(t => t.bulan === currentMonth && t.tahun === currentYear);

  const initials = siswa?.namaLengkap
    ? siswa.namaLengkap.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "S";

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
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontSize: "1.3rem" }}>🎓</span>
          <h1 className="h5 mb-0 fw-bold">SPP Sekolah Digital</h1>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-light rounded-pill px-3 fw-semibold" onClick={handleLogout}>
            Keluar 🚪
          </button>
        </div>
      </div>

      {/* Student Hero Header */}
      <div className="student-hero">
        <div className="container" style={{ maxWidth: 960 }}>
          <div className="d-flex align-items-center gap-4 flex-wrap">
            <div className="avatar-box">
              {siswa?.fotoUrl ? (
                <img src={siswa.fotoUrl} alt="Foto" style={{ width: "100%", height: "100%", borderRadius: "20px", objectFit: "cover" }} />
              ) : initials}
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h2 className="h4 fw-bold mb-0" style={{ color: "#0f172a" }}>
                  {siswa?.namaLengkap || "Siswa"}
                </h2>
                <span className="badge bg-primary rounded-pill px-3">{siswa?.kelas?.namaKelas || "Kelas -"}</span>
                <span className="badge bg-success rounded-pill px-3">Status: Aktif</span>
              </div>
              <p className="text-muted mb-0 small">
                NIS: <strong>{siswa?.nis || "-"}</strong> {siswa?.nisn ? `| NISN: ${siswa.nisn}` : ""}
              </p>
              {siswa?.namaWali && (
                <p className="text-muted mb-0 style-italic" style={{ fontSize: "0.82rem" }}>
                  Wali: {siswa.namaWali} {siswa.kontakWali ? `(${siswa.kontakWali})` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Container Dashboard Content */}
      <div className="container pb-5" style={{ maxWidth: 960 }}>
        
        {/* Ringkasan Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
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

          <div className="col-md-4">
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

          <div className="col-md-4">
            <div className="stat-card-custom">
              <div className="stat-icon-bg" style={{ background: "#e0e7ff", color: "#4338ca" }}>📅</div>
              <div>
                <div className="text-muted small fw-semibold">Status SPP Bulan Ini</div>
                <div className="h6 mb-0 fw-bold mt-1">
                  {tagihanBulanIni ? (
                    <span className="status-badge" style={{
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
          <div className="mb-4">
            {pengumuman.map(p => (
              <div key={p.id} className="alert alert-info border-0 shadow-sm mb-3" style={{ borderRadius: "14px", background: "linear-gradient(to right, #eff6ff, #dbeafe)" }}>
                <div className="d-flex gap-3">
                  <div style={{ fontSize: "1.6rem" }}>📢</div>
                  <div>
                    <div className="fw-bold text-primary mb-1">{p.judul}</div>
                    <div className="text-dark small mb-1" style={{ whiteSpace: "pre-wrap" }}>{p.isi}</div>
                    <div className="text-muted" style={{ fontSize: "0.7rem" }}>
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
          <div className="alert d-flex align-items-start gap-2 mb-4"
            style={{ background: "#fff1f2", border: "1.5px solid #fecaca", borderRadius: 14, color: "#991b1b" }}>
            <span style={{ fontSize: "1.2rem" }}>⚠️</span>
            <div>
              <strong>Pembayaran Gagal:</strong> {bayarError}
            </div>
            <button className="btn-close btn-close-sm ms-auto" onClick={() => setBayarError(null)} />
          </div>
        )}

        {/* Tab Headers */}
        <div className="nav-tabs-custom">
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
          <div>
            {loading ? (
              <div className="text-center py-5 text-muted"><div className="spinner-border text-primary mb-2" /><p>Memuat tagihan...</p></div>
            ) : pageError ? (
              <div className="alert alert-danger">{pageError}</div>
            ) : tagihanBelumLunas.length === 0 ? (
              <div className="text-center py-5 bg-white rounded-4 border p-4">
                <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>🎉</div>
                <h4 className="h5 fw-bold" style={{ color: "#0f172a" }}>Semua Tagihan Lunas!</h4>
                <p className="text-muted small">Tidak ada tunggakan SPP yang perlu dibayar saat ini.</p>
              </div>
            ) : (
              tagihanBelumLunas.map((t) => {
                const info = STATUS_INFO[t.status] || { label: t.status, bg: "#f3f4f6", color: "#374151" };
                const isBayarLoading = bayarLoading === t.id;
                const isCekLoading = cekStatusLoading === t.id;

                return (
                  <div className="tagihan-card-modern" key={t.id}>
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

                    <div className="d-flex align-items-center gap-3 tagihan-action-group">
                      <div className="fw-bold fs-5" style={{ color: "#0f172a" }}>
                        Rp {t.nominal.toLocaleString("id-ID")}
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold"
                          onClick={() => handleCekStatus(t.id)}
                          disabled={isCekLoading || isBayarLoading}
                          title="Sinkronkan status dengan server Midtrans"
                        >
                          {isCekLoading ? <span className="spinner-border spinner-border-sm" /> : "🔄 Cek Status"}
                        </button>

                        <button
                          className="btn btn-primary btn-sm px-4 rounded-pill fw-semibold shadow-sm"
                          onClick={() => handleBayar(t.id)}
                          disabled={isBayarLoading || isCekLoading}
                        >
                          {isBayarLoading ? (
                            <><span className="spinner-border spinner-border-sm me-1" /> Memuat...</>
                          ) : "Bayar Sekarang"}
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
          <div>
            {loading ? (
              <div className="text-center py-5 text-muted"><div className="spinner-border text-primary mb-2" /><p>Memuat riwayat...</p></div>
            ) : tagihanLunas.length === 0 ? (
              <div className="text-center py-5 bg-white rounded-4 border p-4">
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📜</div>
                <h5 className="fw-bold">Belum Ada Riwayat</h5>
                <p className="text-muted small">Belum ada transaksi pembayaran SPP yang berstatus lunas.</p>
              </div>
            ) : (
              tagihanLunas.map((t) => (
                <div className="tagihan-card-modern" key={t.id}>
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h4 className="h6 fw-bold mb-0" style={{ color: "#0f172a" }}>
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

                  <div className="d-flex align-items-center gap-2">
                    <a
                      href={`/kwitansi/${t.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-primary btn-sm rounded-pill px-4 fw-semibold shadow-sm d-flex align-items-center gap-1"
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
          <div className="bg-white rounded-4 border p-4">
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
                <div className="value text-success">Active / Aktif</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
