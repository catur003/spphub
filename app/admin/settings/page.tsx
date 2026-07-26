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

const inputClass =
  "w-full rounded-control border border-border-soft px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";
const labelClass = "mb-1 block text-sm font-semibold text-ink-700";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-wider text-ink-500">
      <span>{children}</span>
      <span className="h-px flex-1 bg-border-soft" />
    </div>
  );
}

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
    <div className="mx-auto w-full max-w-[760px] p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-900">Pengaturan</h1>
        <p className="text-sm text-ink-500">Konfigurasi sistem, payment gateway, dan WhatsApp Gateway</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex w-fit gap-1 rounded-xl border border-border-soft bg-surface p-1">
        <button
          type="button"
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === "payment" ? "bg-white font-semibold text-ink-900 shadow-sm2" : "text-ink-500 hover:text-ink-700"
          }`}
          onClick={() => setTab("payment")}
        >
          💳 Payment Gateway
        </button>
        <button
          type="button"
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === "sekolah" ? "bg-white font-semibold text-ink-900 shadow-sm2" : "text-ink-500 hover:text-ink-700"
          }`}
          onClick={() => setTab("sekolah")}
        >
          🏫 Profil Sekolah & WhatsApp
        </button>
      </div>

      {/* ——— TAB: PAYMENT ——— */}
      {tab === "payment" && (
        <form onSubmit={handleSavePayment}>
          {paymentError && <div className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{paymentError}</div>}
          {paymentMsg && (
            <div className="mb-3 flex items-center gap-2 rounded-control border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
              ✓ {paymentMsg}
            </div>
          )}

          {/* Environment Mode */}
          <SectionLabel>Environment Mode</SectionLabel>
          <div className="mb-6 grid grid-cols-2 gap-2.5">
            {(["sandbox", "production"] as const).map((env) => {
              const selected = payment.environment === env;
              return (
                <label
                  key={env}
                  className={`relative cursor-pointer rounded-xl border-2 p-4 transition ${
                    selected
                      ? "border-accent bg-accent-soft shadow-[0_0_0_4px_rgba(79,70,229,0.08)]"
                      : "border-border-soft bg-white hover:border-indigo-300 hover:bg-indigo-50/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="environment"
                    value={env}
                    checked={selected}
                    onChange={() => setPayment({ ...payment, environment: env })}
                    className="absolute opacity-0"
                  />
                  <div
                    className={`mb-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      selected ? "border-accent bg-accent" : "border-border-soft bg-white"
                    }`}
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div className={`text-[0.92rem] font-bold ${selected ? "text-accent" : "text-ink-900"}`}>
                    {env === "sandbox" ? "Sandbox" : "Production"}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-500">
                    {env === "sandbox" ? "Mode Uji Coba" : "Mode Live"}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Payment Gateway */}
          <SectionLabel>Payment Gateway</SectionLabel>
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-4 rounded-xl border-2 border-accent bg-accent-soft px-[1.1rem] py-[0.85rem] shadow-[0_0_0_4px_rgba(79,70,229,0.08)]">
              <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent">
                <span className="h-[7px] w-[7px] rounded-full bg-white" />
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#667eea] to-[#764ba2] text-base text-white">
                M
              </div>
              <div className="flex-1">
                <div className="text-[0.88rem] font-bold text-ink-900">Midtrans</div>
                <div className="mt-0.5 text-xs text-ink-500">Metode Snap Pop-up — checkout bawaan Midtrans</div>
              </div>
            </div>
          </div>

          {/* API Key Section */}
          <SectionLabel>Midtrans API Key</SectionLabel>
          <div className="mb-3 space-y-3">
            {/* Sandbox */}
            <div
              className={`rounded-2xl border-[1.5px] p-[1.1rem_1.2rem] ${
                envAktif === "sandbox" ? "border-amber-200 bg-amber-50" : "border-border-soft bg-[#fafbff]"
              }`}
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-[3px] text-[0.72rem] font-bold tracking-wide text-amber-800">
                  SANDBOX
                </span>
                <span className="text-sm font-bold text-ink-900">Konfigurasi Uji Coba</span>
                {envAktif === "sandbox" && (
                  <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-[3px] text-[0.7rem] text-amber-800">
                    ⚡ Aktif Digunakan
                  </span>
                )}
              </div>
              <div className="mb-2">
                <label className={labelClass}>Sandbox Client Key</label>
                <input
                  className={inputClass}
                  placeholder="SB-Mid-client-xxxxxxxx"
                  value={payment.sandboxClientKey || ""}
                  onChange={(e) => setPayment({ ...payment, sandboxClientKey: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Sandbox Server Key</label>
                <div className="relative">
                  <input
                    type={showSandboxServer ? "text" : "password"}
                    className={`${inputClass} pr-11`}
                    placeholder="SB-Mid-server-xxxxxxxx"
                    value={payment.sandboxServerKey || ""}
                    onChange={(e) => setPayment({ ...payment, sandboxServerKey: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center border-none bg-none p-0 text-ink-500 transition hover:text-accent"
                    onClick={() => setShowSandboxServer(!showSandboxServer)}
                  >
                    👁️
                  </button>
                </div>
              </div>
            </div>

            {/* Production */}
            <div
              className={`rounded-2xl border-[1.5px] p-[1.1rem_1.2rem] ${
                envAktif === "production" ? "border-green-300 bg-green-50" : "border-border-soft bg-[#fafbff]"
              }`}
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full bg-green-100 px-2.5 py-[3px] text-[0.72rem] font-bold tracking-wide text-green-700">
                  PRODUCTION
                </span>
                <span className="text-sm font-bold text-ink-900">Konfigurasi Live</span>
                {envAktif === "production" && (
                  <span className="ml-auto rounded-full bg-green-100 px-2.5 py-[3px] text-[0.7rem] text-green-700">
                    ⚡ Aktif Digunakan
                  </span>
                )}
              </div>
              <div className="mb-2">
                <label className={labelClass}>Production Client Key</label>
                <input
                  className={inputClass}
                  placeholder="Mid-client-xxxxxxxx"
                  value={payment.productionClientKey || ""}
                  onChange={(e) => setPayment({ ...payment, productionClientKey: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Production Server Key</label>
                <div className="relative">
                  <input
                    type={showProdServer ? "text" : "password"}
                    className={`${inputClass} pr-11`}
                    placeholder="Mid-server-xxxxxxxx"
                    value={payment.productionServerKey || ""}
                    onChange={(e) => setPayment({ ...payment, productionServerKey: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center border-none bg-none p-0 text-ink-500 transition hover:text-accent"
                    onClick={() => setShowProdServer(!showProdServer)}
                  >
                    👁️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="rounded-control bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
              disabled={paymentLoading}
            >
              {paymentLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : (
                "💾 Simpan Payment Settings"
              )}
            </button>
          </div>
        </form>
      )}

      {/* ——— TAB: SEKOLAH ——— */}
      {tab === "sekolah" && (
        <form onSubmit={handleSaveSekolah}>
          {sekolahError && <div className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{sekolahError}</div>}
          {sekolahMsg && (
            <div className="mb-3 flex items-center gap-2 rounded-control border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
              ✓ {sekolahMsg}
            </div>
          )}

          <div className="mb-4 rounded-2xl border border-border-soft bg-white p-5">
            <SectionLabel>Identitas Sekolah</SectionLabel>
            <div className="mb-3">
              <label className={labelClass}>Nama Sekolah</label>
              <input
                className={inputClass}
                value={sekolah.nama}
                onChange={(e) => setSekolah({ ...sekolah, nama: e.target.value })}
                required
                placeholder="Contoh: SMP Negeri 1 Contoh"
              />
            </div>
            <div className="mb-3">
              <label className={labelClass}>Alamat Sekolah</label>
              <textarea
                className={inputClass}
                rows={2}
                value={sekolah.alamat || ""}
                onChange={(e) => setSekolah({ ...sekolah, alamat: e.target.value })}
                placeholder="Alamat lengkap sekolah"
              />
            </div>
            <div className="mb-3">
              <label className={labelClass}>URL Logo Sekolah</label>
              <input
                className={inputClass}
                value={sekolah.logoUrl || ""}
                onChange={(e) => setSekolah({ ...sekolah, logoUrl: e.target.value })}
                placeholder="https://link-logo-sekolah.png"
              />
            </div>
            <div className="mb-1">
              <label className={labelClass}>Nominal SPP Default</label>
              <div className="flex items-stretch overflow-hidden rounded-control border border-border-soft transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
                <span className="flex items-center bg-surface px-3 text-sm font-semibold text-ink-500">Rp</span>
                <input
                  type="number"
                  className="w-full border-0 bg-transparent px-3 py-2 text-sm text-ink-900 outline-none"
                  value={sekolah.nominalSppDefault}
                  onChange={(e) => setSekolah({ ...sekolah, nominalSppDefault: Number(e.target.value) })}
                />
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Dipakai sebagai nilai acuan awal jika biaya SPP per kelas belum diatur.
              </p>
            </div>
          </div>

          {/* Section WhatsApp Bendahara & Gateway Fonnte */}
          <div className="mb-4 rounded-2xl border border-border-soft bg-white p-5">
            <SectionLabel>📲 WhatsApp Bendahara & Fonnte Gateway</SectionLabel>

            <div className="mb-3">
              <label className={labelClass}>No. WhatsApp / HP Bendahara Sekolah</label>
              <input
                className={inputClass}
                value={sekolah.noHpBendahara || ""}
                onChange={(e) => setSekolah({ ...sekolah, noHpBendahara: e.target.value })}
                placeholder="Contoh: 081234567890"
              />
              <p className="mt-1 text-xs text-ink-500">
                Nomor ini akan dipakai oleh siswa di portal saat mengeklik tombol <strong className="font-semibold text-ink-700">💬 Hubungi Bendahara</strong>.
              </p>
            </div>

            <div className="mb-1">
              <label className={labelClass}>Token Fonnte WhatsApp Gateway (API Key)</label>
              <div className="relative">
                <input
                  type={showFonnteToken ? "text" : "password"}
                  className={`${inputClass} pr-11`}
                  placeholder="Isikan Token API dari fonnte.com"
                  value={sekolah.fonnteToken || ""}
                  onChange={(e) => setSekolah({ ...sekolah, fonnteToken: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center border-none bg-none p-0 text-ink-500 transition hover:text-accent"
                  onClick={() => setShowFonnteToken(!showFonnteToken)}
                >
                  👁️
                </button>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Jika Token Fonnte diisi, notifikasi pengingat SPP di menu Tagihan akan terkirim{" "}
                <strong className="font-semibold text-ink-700">otomatis secara langsung via Fonnte API</strong> ke WA wali siswa!
              </p>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              className="rounded-control bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
              disabled={sekolahLoading}
            >
              {sekolahLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : (
                "💾 Simpan Profil Sekolah & WhatsApp"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
