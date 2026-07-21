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

    if (!res.ok) {
      setPaymentError(data.error || "Gagal menyimpan");
      return;
    }
    setPayment(data);
    setPaymentMsg("Payment Settings tersimpan.");
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

    if (!res.ok) {
      setSekolahError(data.error || "Gagal menyimpan");
      return;
    }
    setSekolah(data);
    setSekolahMsg("Profil Sekolah tersimpan.");
  }

  return (
    <div className="container-fluid p-4" style={{ maxWidth: 720 }}>
      <h1 className="h4 mb-4">Pengaturan</h1>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${tab === "payment" ? "active" : ""}`} onClick={() => setTab("payment")}>
            Payment Settings
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === "sekolah" ? "active" : ""}`} onClick={() => setTab("sekolah")}>
            Profil Sekolah
          </button>
        </li>
      </ul>

      {tab === "payment" && (
        <div className="card">
          <div className="card-body">
            {paymentError && <div className="alert alert-danger py-2">{paymentError}</div>}
            {paymentMsg && <div className="alert alert-success py-2">{paymentMsg}</div>}
            <form onSubmit={handleSavePayment}>
              <div className="mb-3">
                <label className="form-label">Environment Aktif</label>
                <select
                  className="form-select"
                  value={payment.environment}
                  onChange={(e) => setPayment({ ...payment, environment: e.target.value as "sandbox" | "production" })}
                >
                  <option value="sandbox">Sandbox (testing)</option>
                  <option value="production">Production (live)</option>
                </select>
                <small className="text-muted">
                  Key yang dipakai saat generate Snap token ditentukan dari pilihan ini.
                </small>
              </div>

              <hr />
              <h2 className="h6">Sandbox</h2>
              <div className="mb-2">
                <label className="form-label">Client Key</label>
                <input
                  className="form-control"
                  value={payment.sandboxClientKey || ""}
                  onChange={(e) => setPayment({ ...payment, sandboxClientKey: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Server Key</label>
                <input
                  type="password"
                  className="form-control"
                  value={payment.sandboxServerKey || ""}
                  onChange={(e) => setPayment({ ...payment, sandboxServerKey: e.target.value })}
                />
              </div>

              <hr />
              <h2 className="h6">Production</h2>
              <div className="mb-2">
                <label className="form-label">Client Key</label>
                <input
                  className="form-control"
                  value={payment.productionClientKey || ""}
                  onChange={(e) => setPayment({ ...payment, productionClientKey: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Server Key</label>
                <input
                  type="password"
                  className="form-control"
                  value={payment.productionServerKey || ""}
                  onChange={(e) => setPayment({ ...payment, productionServerKey: e.target.value })}
                />
              </div>

              <button className="btn btn-primary" disabled={paymentLoading}>
                {paymentLoading ? "Menyimpan..." : "Simpan Payment Settings"}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "sekolah" && (
        <div className="card">
          <div className="card-body">
            {sekolahError && <div className="alert alert-danger py-2">{sekolahError}</div>}
            {sekolahMsg && <div className="alert alert-success py-2">{sekolahMsg}</div>}
            <form onSubmit={handleSaveSekolah}>
              <div className="mb-2">
                <label className="form-label">Nama Sekolah</label>
                <input
                  className="form-control"
                  value={sekolah.nama}
                  onChange={(e) => setSekolah({ ...sekolah, nama: e.target.value })}
                  required
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Alamat</label>
                <textarea
                  className="form-control"
                  value={sekolah.alamat || ""}
                  onChange={(e) => setSekolah({ ...sekolah, alamat: e.target.value })}
                />
              </div>
              <div className="mb-2">
                <label className="form-label">URL Logo</label>
                <input
                  className="form-control"
                  value={sekolah.logoUrl || ""}
                  onChange={(e) => setSekolah({ ...sekolah, logoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Nominal SPP Default (Rp)</label>
                <input
                  type="number"
                  className="form-control"
                  value={sekolah.nominalSppDefault}
                  onChange={(e) => setSekolah({ ...sekolah, nominalSppDefault: Number(e.target.value) })}
                />
                <small className="text-muted">Dipakai sebagai nilai awal saat generate tagihan massal.</small>
              </div>

              <button className="btn btn-primary" disabled={sekolahLoading}>
                {sekolahLoading ? "Menyimpan..." : "Simpan Profil Sekolah"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
