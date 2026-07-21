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
    setSekolahMsg("Profil sekolah berhasil disimpan.");
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
        .badge-soon {
          background: #fef9c3; color: #854d0e; padding: 2px 8px;
          border-radius: 20px; font-size: 0.68rem; font-weight: 600; white-space: nowrap;
        }

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

        /* ——— Save button bar ——— */
        .save-bar {
          display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem;
          padding: 1rem 1.2rem; border-top: 1px solid var(--border-soft);
          background: var(--surface); border-radius: 0 0 16px 16px;
          margin-top: 1.5rem;
        }

        /* ——— Sekolah form ——— */
        .sekolah-section {
          border: 1px solid var(--border-soft); border-radius: 14px;
          padding: 1.2rem; background: white;
        }
      `}</style>

      <div className="container-fluid p-4" style={{ maxWidth: 760 }}>
        <div className="mb-4">
          <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Pengaturan</h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>Konfigurasi sistem dan payment gateway</p>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button className={`settings-tab ${tab === "payment" ? "active" : ""}`}
            onClick={() => setTab("payment")}>
            💳 Payment Gateway
          </button>
          <button className={`settings-tab ${tab === "sekolah" ? "active" : ""}`}
            onClick={() => setTab("sekolah")}>
            🏫 Profil Sekolah
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
              {/* Midtrans — active */}
              <div className="gateway-card selected">
                <div className="gateway-card__radio" />
                <div className="gateway-card__logo">M</div>
                <div className="gateway-card__info">
                  <div className="gateway-card__name">Midtrans</div>
                  <div className="gateway-card__desc">Metode Snap Pop-up — checkout bawaan Midtrans</div>
                </div>
              </div>
              {/* Duitku — coming soon */}
              <div className="gateway-card disabled">
                <div className="gateway-card__radio" />
                <div className="gateway-card__logo" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>D</div>
                <div className="gateway-card__info">
                  <div className="gateway-card__name">
                    Duitku <span className="badge-soon ms-1">Segera Hadir</span>
                  </div>
                  <div className="gateway-card__desc">Alternatif pembayaran multi-channel</div>
                </div>
              </div>
              {/* Cashi.id — coming soon */}
              <div className="gateway-card disabled">
                <div className="gateway-card__radio" />
                <div className="gateway-card__logo" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>C</div>
                <div className="gateway-card__info">
                  <div className="gateway-card__name">
                    Cashi.id <span className="badge-soon ms-1">Segera Hadir</span>
                  </div>
                  <div className="gateway-card__desc">Sistem QRIS Instan Cashi.id</div>
                </div>
              </div>
            </div>

            {/* API Key Section — Sandbox */}
            <div className="section-label">Midtrans API Key</div>
            <div className="mb-3">
              {/* Sandbox */}
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
                      {showSandboxServer
                        ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
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
                      {showProdServer
                        ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="d-flex justify-content-end">
              <button className="btn btn-primary px-4" disabled={paymentLoading}>
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
                <label className="form-label small fw-semibold">Alamat</label>
                <textarea className="form-control" rows={2} value={sekolah.alamat || ""}
                  onChange={(e) => setSekolah({ ...sekolah, alamat: e.target.value })}
                  placeholder="Alamat lengkap sekolah" />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">URL Logo</label>
                <input className="form-control" value={sekolah.logoUrl || ""}
                  onChange={(e) => setSekolah({ ...sekolah, logoUrl: e.target.value })}
                  placeholder="https://..." />
              </div>
              <div className="mb-1">
                <label className="form-label small fw-semibold">Nominal SPP Default</label>
                <div className="input-group">
                  <span className="input-group-text" style={{ borderRadius: "10px 0 0 10px", fontSize: "0.85rem" }}>Rp</span>
                  <input type="number" className="form-control" value={sekolah.nominalSppDefault}
                    onChange={(e) => setSekolah({ ...sekolah, nominalSppDefault: Number(e.target.value) })}
                    style={{ borderRadius: "0 10px 10px 0" }} />
                </div>
                <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                  Dipakai sebagai nilai awal saat generate tagihan massal.
                </small>
              </div>
            </div>
            <div className="d-flex justify-content-end mt-3">
              <button className="btn btn-primary px-4" disabled={sekolahLoading}>
                {sekolahLoading
                  ? <><span className="spinner-border spinner-border-sm me-1" />Menyimpan...</>
                  : "💾 Simpan Profil Sekolah"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
