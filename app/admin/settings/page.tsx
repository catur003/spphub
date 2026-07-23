"use client";

import { useEffect, useState } from "react";

type PaymentSettings = {
  environment: "sandbox" | "production";
  sandboxClientKey: string | null;
  sandboxServerKey: string | null;
  productionClientKey: string | null;
  productionServerKey: string | null;
};

type SekolahSettings = {
  nama: string;
  alamat: string | null;
  logoUrl: string | null;
  nominalSppDefault: number;
  noHpBendahara: string | null;
  fonnteToken: string | null;
};

const PAYMENT_KOSONG: PaymentSettings = {
  environment: "sandbox",
  sandboxClientKey: "",
  sandboxServerKey: "",
  productionClientKey: "",
  productionServerKey: "",
};

const SEKOLAH_KOSONG: SekolahSettings = {
  nama: "",
  alamat: "",
  logoUrl: "",
  nominalSppDefault: 0,
  noHpBendahara: "",
  fonnteToken: "",
};

export default function SettingsPage() {
  const [tab, setTab] = useState<"payment" | "sekolah">("payment");

  const [payment, setPayment] = useState<PaymentSettings>(PAYMENT_KOSONG);
  const [paymentMsg, setPaymentMsg] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showSandboxServer, setShowSandboxServer] = useState(false);
  const [showProdServer, setShowProdServer] = useState(false);

  const [sekolah, setSekolah] = useState<SekolahSettings>(SEKOLAH_KOSONG);
  const [sekolahMsg, setSekolahMsg] = useState("");
  const [sekolahError, setSekolahError] = useState("");
  const [sekolahLoading, setSekolahLoading] = useState(false);
  const [showFonnteToken, setShowFonnteToken] = useState(false);

  useEffect(() => {
    fetch("/api/settings/payment").then(async (res) => {
      if (res.ok) setPayment(await res.json());
    });
    fetch("/api/settings/sekolah").then(async (res) => {
      if (res.ok) setSekolah(await res.json());
    });
  }, []);

  async function handleSavePayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError("");
    setPaymentMsg("");
    setPaymentLoading(true);
    const res = await fetch("/api/settings/payment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payment),
    });
    const data = await res.json();
    setPaymentLoading(false);
    if (!res.ok) { setPaymentError(data.error || "Gagal menyimpan"); return; }
    setPayment(data);
    setPaymentMsg("Pengaturan payment berhasil disimpan.");
  }

  async function handleSaveSekolah(e: React.FormEvent) {
    e.preventDefault();
    setSekolahError("");
    setSekolahMsg("");
    setSekolahLoading(true);
    const res = await fetch("/api/settings/sekolah", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sekolah),
    });
    const data = await res.json();
    setSekolahLoading(false);
    if (!res.ok) { setSekolahError(data.error || "Gagal menyimpan"); return; }
    setSekolah(data);
    setSekolahMsg("Profil sekolah & pengaturan WhatsApp berhasil disimpan.");
  }

  // Key yang aktif berdasarkan environment yang dipilih
  const envAktif = payment.environment;

  return (
    <>
      <style>{`
        /* ——— Tab Navigation ——— */
        .settings-tabs {
          display: flex; gap: 4px; padding: 4px;
          background: var(--surface); border-radius: 12px;
          border: 1px solid var(--border-soft);
          width: fit-content; margin-bottom: 1.5rem;
        }
        .settings-tab {
          padding: 0.5rem 1.25rem; border-radius: 9px; border: none;
          background: transparent; font-size: 0.875rem; font-weight: 500;
          color: var(--ink-500); cursor: pointer;
          transition: all 0.15s ease;
        }
        .settings-tab.active {
          background: white; color: var(--ink-900); font-weight: 600;
          box-shadow: var(--shadow-sm);
        }
        .settings-tab:hover:not(.active) { color: var(--ink-700); }

        /* ——— Section Label ——— */
        .section-label {
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--ink-500);
          margin-bottom: 0.65rem; display: flex; align-items: center; gap: 8px;
        }
        .section-label::after {
          content: ''; flex: 1; height: 1px; background: var(--border-soft);
        }

        /* ——— Radio Cards (Environment) ——— */
        .env-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.5rem; }
        .env-card {
          position: relative; padding: 1rem 1.1rem; border-radius: 12px;
          border: 2px solid var(--border-soft); cursor: pointer;
          background: white; transition: all 0.2s ease;
        }
        .env-card:hover { border-color: #a5b4fc; background: #fafafe; }
        .env-card.selected {
          border-color: var(--accent); background: #eef2ff;
          box-shadow: 0 0 0 4px rgba(79,70,229,0.08);
        }
        .env-card input[type="radio"] { position: absolute; opacity: 0; pointer-events: none; }
        .env-card__dot {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid var(--border-soft); background: white;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.15s ease;
          margin-bottom: 0.5rem;
        }
        .env-card.selected .env-card__dot {
          border-color: var(--accent); background: var(--accent);
        }
        .env-card.selected .env-card__dot::after {
          content: ''; width: 6px; height: 6px; border-radius: 50%; background: white;
        }
        .env-card__title { font-size: 0.92rem; font-weight: 700; color: var(--ink-900); }
        .env-card__sub   { font-size: 0.75rem; color: var(--ink-500); margin-top: 1px; }
        .env-card.selected .env-card__title { color: var(--accent); }

        /* ——— Gateway Card ——— */
        .gateway-card {
          display: flex; align-items: center; gap: 1rem;
          padding: 0.85rem 1.1rem; border-radius: 12px;
          border: 2px solid var(--border-soft); background: white;
          margin-bottom: 0.5rem; transition: all 0.18s ease;
        }
        .gateway-card.selected {
          border-color: var(--accent); background: #eef2ff;
          box-shadow: 0 0 0 4px rgba(79,70,229,0.08);
        }
        .gateway-card.disabled { opacity: 0.5; cursor: not-allowed; }
        .gateway-card__radio {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid var(--border-soft); background: white;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.15s ease;
        }
        .gateway-card.selected .gateway-card__radio {
          border-color: var(--accent); background: var(--accent);
        }
        .gateway-card.selected .gateway-card__radio::after {
          content: ''; width: 7px; height: 7px; border-radius: 50%; background: white;
        }
        .gateway-card__logo {
          width: 36px; height: 36px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #667eea, #764ba2);
          font-size: 1rem; color: white; flex-shrink: 0;
        }
        .gateway-card__info { flex: 1; }
        .gateway-card__name { font-size: 0.88rem; font-weight: 700; color: var(--ink-900); }
        .gateway-card__desc { font-size: 0.75rem; color: var(--ink-500); margin-top: 1px; }

        /* ——— API Key Section ——— */
        .api-key-section {
          border: 1.5px solid var(--border-soft); border-radius: 14px;
          padding: 1.1rem 1.2rem; background: #fafbff;
        }
        .api-key-section__header {
          display: flex; align-items: center; gap: 8px; margin-bottom: 1rem;
        }
        .api-key-section__badge {
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em;
        }
        .api-key-section__badge--sandbox   { background: #fef9c3; color: #854d0e; }
        .api-key-section__badge--production { background: #dcfce7; color: #15803d; }
        .api-key-section__title { font-weight: 700; font-size: 0.9rem; color: var(--ink-900); }

        /* ——— Input with eye toggle ——— */
        .input-secret { position: relative; }
        .input-secret input { padding-right: 2.8rem; }
        .input-secret__eye {
          position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; padding: 0; cursor: pointer;
          color: var(--ink-500); display: flex; align-items: center;
          transition: color 0.15s ease;
        }
        .input-secret__eye:hover { color: var(--accent); }

        /* ——— Sekolah form ——— */
        .sekolah-section {
          border: 1px solid var(--border-soft); border-radius: 14px;
          padding: 1.2rem; background: white; margin-bottom: 1rem;
        }
      `}</style>

      <div className="container-fluid p-4" style={{ maxWidth: 760 }}>
        <div className="mb-4">
          <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Pengaturan</h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>Konfigurasi sistem, payment gateway, dan WhatsApp Gateway</p>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button className={`settings-tab ${tab === "payment" ? "active" : ""}`}
            onClick={() => setTab("payment")}>
            💳 Payment Gateway
          </button>
          <button className={`settings-tab ${tab === "sekolah" ? "active" : ""}`}
            onClick={() => setTab("sekolah")}>
            🏫 Profil Sekolah & WhatsApp
          </button>
        </div>

        {/* ——— TAB: PAYMENT ——— */}
        {tab === "payment" && (
          <form onSubmit={handleSavePayment}>
            {paymentError && <div className="alert alert-danger py-2 small mb-3">{paymentError}</div>}
            {paymentMsg && (
              <div className="d-flex align-items-center gap-2 mb-3 p-2 px-3"
                style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, fontSize: "0.85rem", color: "#166534" }}>
                ✓ {paymentMsg}
              </div>
            )}

            {/* Environment Mode */}
            <div className="section-label">Environment Mode</div>
            <div className="env-cards">
              {(["sandbox", "production"] as const).map((env) => (
                <label key={env}
                  className={`env-card ${payment.environment === env ? "selected" : ""}`}>
                  <input type="radio" name="environment" value={env}
                    checked={payment.environment === env}
                    onChange={() => setPayment({ ...payment, environment: env })} />
                  <div className="env-card__dot" />
                  <div className="env-card__title">
                    {env === "sandbox" ? "Sandbox" : "Production"}
                  </div>
                  <div className="env-card__sub">
                    {env === "sandbox" ? "Mode Uji Coba" : "Mode Live"}
                  </div>
                </label>
              ))}
            </div>

            {/* Payment Gateway */}
            <div className="section-label">Payment Gateway</div>
            <div className="mb-4">
              <div className="gateway-card selected">
                <div className="gateway-card__radio" />
                <div className="gateway-card__logo">M</div>
                <div className="gateway-card__info">
                  <div className="gateway-card__name">Midtrans</div>
                  <div className="gateway-card__desc">Metode Snap Pop-up — checkout bawaan Midtrans</div>
                </div>
              </div>
            </div>

            {/* API Key Section */}
            <div className="section-label">Midtrans API Key</div>
            <div className="mb-3">
              <div className={`api-key-section mb-3 ${envAktif === "sandbox" ? "border-warning" : ""}`}
                style={{ borderColor: envAktif === "sandbox" ? "#fde68a" : undefined,
                          background: envAktif === "sandbox" ? "#fffbeb" : undefined }}>
                <div className="api-key-section__header">
                  <span className="api-key-section__badge api-key-section__badge--sandbox">SANDBOX</span>
                  <span className="api-key-section__title">Konfigurasi Uji Coba</span>
                  {envAktif === "sandbox" && (
                    <span className="ms-auto badge" style={{ background: "#fef9c3", color: "#854d0e", fontSize: "0.7rem" }}>
                      ⚡ Aktif Digunakan
                    </span>
                  )}
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Sandbox Client Key</label>
                  <input className="form-control form-control-sm"
                    placeholder="SB-Mid-client-xxxxxxxx"
                    value={payment.sandboxClientKey || ""}
                    onChange={(e) => setPayment({ ...payment, sandboxClientKey: e.target.value })} />
                </div>
                <div>
                  <label className="form-label small fw-semibold">Sandbox Server Key</label>
                  <div className="input-secret">
                    <input
                      type={showSandboxServer ? "text" : "password"}
                      className="form-control form-control-sm"
                      placeholder="SB-Mid-server-xxxxxxxx"
                      value={payment.sandboxServerKey || ""}
                      onChange={(e) => setPayment({ ...payment, sandboxServerKey: e.target.value })} />
                    <button type="button" className="input-secret__eye"
                      onClick={() => setShowSandboxServer(!showSandboxServer)}>
                      👁️
                    </button>
                  </div>
                </div>
              </div>

              {/* Production */}
              <div className={`api-key-section ${envAktif === "production" ? "" : ""}`}
                style={{ borderColor: envAktif === "production" ? "#86efac" : undefined,
                          background: envAktif === "production" ? "#f0fdf4" : undefined }}>
                <div className="api-key-section__header">
                  <span className="api-key-section__badge api-key-section__badge--production">PRODUCTION</span>
                  <span className="api-key-section__title">Konfigurasi Live</span>
                  {envAktif === "production" && (
                    <span className="ms-auto badge" style={{ background: "#dcfce7", color: "#15803d", fontSize: "0.7rem" }}>
                      ⚡ Aktif Digunakan
                    </span>
                  )}
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Production Client Key</label>
                  <input className="form-control form-control-sm"
                    placeholder="Mid-client-xxxxxxxx"
                    value={payment.productionClientKey || ""}
                    onChange={(e) => setPayment({ ...payment, productionClientKey: e.target.value })} />
                </div>
                <div>
                  <label className="form-label small fw-semibold">Production Server Key</label>
                  <div className="input-secret">
                    <input
                      type={showProdServer ? "text" : "password"}
                      className="form-control form-control-sm"
                      placeholder="Mid-server-xxxxxxxx"
                      value={payment.productionServerKey || ""}
                      onChange={(e) => setPayment({ ...payment, productionServerKey: e.target.value })} />
                    <button type="button" className="input-secret__eye"
                      onClick={() => setShowProdServer(!showProdServer)}>
                      👁️
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end">
              <button className="btn btn-primary px-4 fw-bold" disabled={paymentLoading}>
                {paymentLoading
                  ? <><span className="spinner-border spinner-border-sm me-1" />Menyimpan...</>
                  : "💾 Simpan Payment Settings"}
              </button>
            </div>
          </form>
        )}

        {/* ——— TAB: SEKOLAH ——— */}
        {tab === "sekolah" && (
          <form onSubmit={handleSaveSekolah}>
            {sekolahError && <div className="alert alert-danger py-2 small mb-3">{sekolahError}</div>}
            {sekolahMsg && (
              <div className="d-flex align-items-center gap-2 mb-3 p-2 px-3"
                style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, fontSize: "0.85rem", color: "#166534" }}>
                ✓ {sekolahMsg}
              </div>
            )}

            <div className="sekolah-section">
              <div className="section-label">Identitas Sekolah</div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Nama Sekolah</label>
                <input className="form-control" value={sekolah.nama}
                  onChange={(e) => setSekolah({ ...sekolah, nama: e.target.value })} required
                  placeholder="Contoh: SMP Negeri 1 Contoh" />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Alamat Sekolah</label>
                <textarea className="form-control" rows={2} value={sekolah.alamat || ""}
                  onChange={(e) => setSekolah({ ...sekolah, alamat: e.target.value })}
                  placeholder="Alamat lengkap sekolah" />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">URL Logo Sekolah</label>
                <input className="form-control" value={sekolah.logoUrl || ""}
                  onChange={(e) => setSekolah({ ...sekolah, logoUrl: e.target.value })}
                  placeholder="https://link-logo-sekolah.png" />
              </div>
              <div className="mb-1">
                <label className="form-label small fw-semibold">Nominal SPP Default</label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted fw-semibold">Rp</span>
                  <input type="number" className="form-control" value={sekolah.nominalSppDefault}
                    onChange={(e) => setSekolah({ ...sekolah, nominalSppDefault: Number(e.target.value) })} />
                </div>
                <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                  Dipakai sebagai nilai acuan awal jika biaya SPP per kelas belum diatur.
                </small>
              </div>
            </div>

            {/* Section WhatsApp Bendahara & Gateway Fonnte */}
            <div className="sekolah-section">
              <div className="section-label">📲 WhatsApp Bendahara & Fonnte Gateway</div>
              
              <div className="mb-3">
                <label className="form-label small fw-semibold">No. WhatsApp / HP Bendahara Sekolah</label>
                <input className="form-control" value={sekolah.noHpBendahara || ""}
                  onChange={(e) => setSekolah({ ...sekolah, noHpBendahara: e.target.value })}
                  placeholder="Contoh: 081234567890" />
                <div className="form-text text-muted" style={{ fontSize: "0.76rem" }}>
                  Nomor ini akan dipakai oleh siswa di portal saat mengeklik tombol <strong>💬 Hubungi Bendahara</strong>.
                </div>
              </div>

              <div className="mb-1">
                <label className="form-label small fw-semibold">Token Fonnte WhatsApp Gateway (API Key)</label>
                <div className="input-secret">
                  <input
                    type={showFonnteToken ? "text" : "password"}
                    className="form-control"
                    placeholder="Isikan Token API dari fonnte.com"
                    value={sekolah.fonnteToken || ""}
                    onChange={(e) => setSekolah({ ...sekolah, fonnteToken: e.target.value })}
                  />
                  <button type="button" className="input-secret__eye"
                    onClick={() => setShowFonnteToken(!showFonnteToken)}>
                    👁️
                  </button>
                </div>
                <div className="form-text text-muted" style={{ fontSize: "0.76rem" }}>
                  Jika Token Fonnte diisi, notifikasi pengingat SPP di menu Tagihan akan terkirim <strong>otomatis secara langsung via Fonnte API</strong> ke WA wali siswa!
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end mt-3">
              <button className="btn btn-primary px-4 fw-bold" disabled={sekolahLoading}>
                {sekolahLoading
                  ? <><span className="spinner-border spinner-border-sm me-1" />Menyimpan...</>
                  : "💾 Simpan Profil Sekolah & WhatsApp"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
