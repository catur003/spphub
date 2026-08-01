"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import {
  IconCheck, IconX, IconClipboard, IconWarning, IconChevronLeft, IconFileText, IconRefresh,
} from "@/components/admin/icons";

type TagihanLain = {
  id: string;
  nominal: number;
  status: string;
  jatuhTempo: string;
  keterangan?: string | null;
  jenisTagihanLain?: { id: string; nama: string } | null;
  pembayaran?: { id: string; paidAt: string | null; metode: string; orderId: string }[];
};

const STATUS_INFO: Record<string, { label: string; className: string }> = {
  belum_bayar:          { label: "Belum Bayar",         className: "bg-red-100 text-red-800" },
  menunggu_verifikasi:  { label: "Menunggu Verifikasi",  className: "bg-amber-100 text-amber-800" },
  lunas:                { label: "Lunas",                className: "bg-green-100 text-green-700" },
  terlambat:            { label: "Terlambat",            className: "bg-red-100 text-red-800" },
};

function rupiah(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
}

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

export default function TagihanLainPage() {
  const [daftar, setDaftar] = useState<TagihanLain[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [midtrans, setMidtrans] = useState<MidtransConfig>(null);
  const [bayarLoading, setBayarLoading] = useState<string | null>(null);
  const [cekStatusLoading, setCekStatusLoading] = useState<string | null>(null);
  const [bayarError, setBayarError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/settings/midtrans-public")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setMidtrans(data); });
    muatData();
  }, []);

  async function muatData() {
    setLoading(true);
    setPageError("");
    try {
      const res = await fetch("/api/tagihan-lain/saya");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPageError(data.error || "Gagal memuat data tagihan.");
        setLoading(false);
        return;
      }
      setDaftar(await res.json());
    } catch (err) {
      console.error(err);
      setPageError("Kesalahan jaringan saat memuat data.");
    } finally {
      setLoading(false);
    }
  }

  function tampilToast(msg: string, type: "success" | "info" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleCekStatus(id: string) {
    setCekStatusLoading(id);
    try {
      const res = await fetch(`/api/tagihan-lain/${id}/cek-status`);
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
      const res = await fetch(`/api/tagihan-lain/${id}/bayar`, { method: "POST" });
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

  const belumLunas = daftar.filter((t) => t.status !== "lunas");
  const lunas = daftar.filter((t) => t.status === "lunas");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f1f5f9] font-sans text-ink-900">
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
        <div
          className={`fixed bottom-[4.5rem] left-4 right-4 z-[9999] flex max-w-[90vw] animate-toast-in items-center gap-2.5 rounded-2xl border-l-[5px] bg-white px-5 py-3.5 text-sm font-semibold shadow-[0_12px_36px_rgba(15,23,42,0.2)] sm:bottom-7 sm:left-auto sm:right-6 ${
            toast.type === "success" ? "border-emerald-500 text-emerald-800" :
            toast.type === "info" ? "border-blue-500 text-blue-800" :
            "border-red-500 text-red-800"
          }`}
        >
          {toast.type === "success" ? <IconCheck className="inline h-4 w-4" /> : toast.type === "info" ? <IconWarning className="inline h-4 w-4" /> : <IconX className="inline h-4 w-4" />} {toast.msg}
        </div>
      )}

      {/* Top Navbar */}
      <div className="sticky top-0 z-[100] flex items-center gap-3 bg-gradient-to-br from-[#1e1b4b] via-[#3730a3] to-[#4f46e5] px-4 py-3 text-white shadow-[0_4px_20px_rgba(30,27,75,0.25)] backdrop-blur-md md:px-6">
        <a href="/siswa" className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20">
          <IconChevronLeft className="h-4 w-4" /> Kembali
        </a>
        <h1 className="truncate text-sm font-bold text-white">
          <span className="inline-flex items-center gap-1.5"><IconClipboard className="h-4 w-4" /> Tagihan Lainnya</span>
        </h1>
      </div>

      <div className="mx-auto max-w-[980px] px-4 py-6 pb-16">
        {pageError && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border-l-[5px] border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            <IconWarning className="h-4 w-4" /> {pageError}
          </div>
        )}

        {bayarError && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border-l-[5px] border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            <strong>Pembayaran Gagal:</strong> {bayarError}
            <button className="ml-auto text-lg leading-none text-red-800/70 hover:text-red-800" onClick={() => setBayarError(null)}>×</button>
          </div>
        )}

        {loading && (
          <div className="py-16 text-center text-ink-500">Memuat data tagihan...</div>
        )}

        {!loading && daftar.length === 0 && !pageError && (
          <div className="rounded-card border border-border-soft bg-white p-8 text-center shadow-sm2">
            <IconFileText className="mx-auto mb-2 h-8 w-8 text-ink-500/50" />
            <p className="text-sm text-ink-500">Belum ada tagihan lainnya (seragam, daftar ulang, dll) untuk kamu saat ini.</p>
          </div>
        )}

        {!loading && belumLunas.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Perlu Dibayar</h2>
            <div className="flex flex-col gap-3">
              {belumLunas.map((t) => {
                const info = STATUS_INFO[t.status] || { label: t.status, className: "bg-gray-100 text-gray-800" };
                const isBayarLoading = bayarLoading === t.id;
                const isCekLoading = cekStatusLoading === t.id;
                return (
                  <div key={t.id} className="rounded-card border border-border-soft bg-white p-4 shadow-sm2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-ink-900">{t.jenisTagihanLain?.nama || "Tagihan"}</div>
                        {t.keterangan && <p className="mt-0.5 text-sm text-ink-500">{t.keterangan}</p>}
                        <p className="mt-1 text-xs text-ink-500">
                          Jatuh tempo: {new Date(t.jatuhTempo).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${info.className}`}>{info.label}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-lg font-extrabold text-ink-900">{rupiah(t.nominal)}</span>
                      <div className="flex gap-2">
                        {t.status === "menunggu_verifikasi" && (
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full border border-border-soft px-3 py-1.5 text-sm font-semibold text-ink-700 transition hover:bg-surface disabled:opacity-60"
                            onClick={() => handleCekStatus(t.id)}
                            disabled={isCekLoading || isBayarLoading}
                          >
                            <IconRefresh className={`h-4 w-4 ${isCekLoading ? "animate-spin" : ""}`} /> Cek Status
                          </button>
                        )}
                        {(t.status === "belum_bayar" || t.status === "terlambat") && (
                          <button
                            className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
                            onClick={() => handleBayar(t.id)}
                            disabled={isBayarLoading || isCekLoading}
                          >
                            {isBayarLoading ? "Memproses..." : "Bayar Sekarang"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && lunas.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Riwayat Lunas</h2>
            <div className="flex flex-col gap-2">
              {lunas.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-card border border-border-soft bg-white p-4 shadow-sm2">
                  <div>
                    <div className="font-semibold text-ink-900">{t.jenisTagihanLain?.nama || "Tagihan"}</div>
                    <p className="text-xs text-ink-500">
                      {t.pembayaran?.[0]?.paidAt ? `Dibayar: ${new Date(t.pembayaran[0].paidAt).toLocaleDateString("id-ID")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink-900">{rupiah(t.nominal)}</span>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Lunas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
