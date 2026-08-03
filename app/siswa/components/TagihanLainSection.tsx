"use client";

import { useEffect, useState } from "react";
import { IconClipboard, IconWarning, IconRefresh, IconFileText } from "@/components/admin/icons";
import { formatTanggalPanjang } from "@/app/admin/tagihan/types";

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

type Props = {
  midtransReady: boolean;
  onToast: (msg: string, type?: "success" | "info" | "error") => void;
};

export default function TagihanLainSection({ midtransReady, onToast }: Props) {
  const [daftar, setDaftar] = useState<TagihanLain[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [bayarLoading, setBayarLoading] = useState<string | null>(null);
  const [sesiTerbuka, setSesiTerbuka] = useState<Set<string>>(new Set());
  const [cekStatusLoading, setCekStatusLoading] = useState<string | null>(null);
  const [bayarError, setBayarError] = useState<string | null>(null);

  useEffect(() => {
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

  async function handleCekStatus(id: string) {
    setCekStatusLoading(id);
    try {
      const res = await fetch(`/api/tagihan-lain/${id}/cek-status`);
      const data = await res.json();

      if (!res.ok) {
        onToast(data.error || "Gagal mengecek status pembayaran.", "error");
      } else if (data.status === "lunas") {
        onToast("Pembayaran dikonfirmasi LUNAS! Terima kasih.", "success");
        muatData();
      } else if (data.updated) {
        onToast(`Status diperbarui: ${data.status}`, "info");
        muatData();
      } else {
        onToast("Pembayaran belum terdeteksi. Silakan coba beberapa saat lagi.", "info");
      }
    } catch (err) {
      console.error(err);
      onToast("Kesalahan jaringan saat mengecek status.", "error");
    } finally {
      setCekStatusLoading(null);
    }
  }

  async function handleBayar(id: string, paksaBaru = false) {
    setBayarLoading(id);
    setBayarError(null);

    try {
      const res = await fetch(`/api/tagihan-lain/${id}/bayar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paksaBaru }),
      });
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

      setSesiTerbuka((prev) => new Set(prev).add(id));

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
          onToast("Pembayaran berhasil diselesaikan! Menyinkronkan status...", "success");
          setBayarLoading(null);
          handleCekStatus(id);
        },
        onPending: () => {
          onToast("Menunggu pembayaran. Selesaikan transaksi lalu klik 'Cek Status'.", "info");
          setBayarLoading(null);
          muatData();
        },
        onError: (result: any) => {
          console.error("Midtrans onError:", result);
          onToast("Pembayaran gagal. Silakan coba lagi.", "error");
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

  if (loading) {
    return (
      <div className="mt-8 border-t border-dashed border-border-soft pt-6 text-center text-sm text-ink-500">
        Memuat tagihan lainnya...
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="mt-8 border-t border-dashed border-border-soft pt-6">
        <div className="flex items-center gap-2 rounded-2xl border-l-[5px] border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          <IconWarning className="h-4 w-4" /> {pageError}
        </div>
      </div>
    );
  }

  if (daftar.length === 0) return null;

  return (
    <div className="mt-8 border-t border-dashed border-border-soft pt-6">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-ink-500">
        <IconClipboard className="h-4 w-4" /> Tagihan Lainnya (Seragam, Daftar Ulang, dll)
      </h3>

      {bayarError && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border-l-[5px] border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          <strong>Pembayaran Gagal:</strong> {bayarError}
          <button className="ml-auto text-lg leading-none text-red-800/70 hover:text-red-800" onClick={() => setBayarError(null)}>×</button>
        </div>
      )}

      {belumLunas.length > 0 && (
        <div className="mb-4">
          {belumLunas.map((t) => {
            const info = STATUS_INFO[t.status] || { label: t.status, className: "bg-gray-100 text-gray-800" };
            const isBayarLoading = bayarLoading === t.id;
            const isCekLoading = cekStatusLoading === t.id;
            return (
              <div
                key={t.id}
                className="mb-4 flex flex-col items-start justify-between gap-4 rounded-[18px] border border-border-soft bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)] sm:flex-row sm:items-center"
              >
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-ink-900">{t.jenisTagihanLain?.nama || "Tagihan"}</h4>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${info.className}`}>
                      {info.label}
                    </span>
                  </div>
                  {t.keterangan && <p className="mb-0.5 text-sm text-ink-500">{t.keterangan}</p>}
                  <div className="text-sm text-ink-500">
                    Jatuh tempo: <strong>{formatTanggalPanjang(t.jatuhTempo)}</strong>
                  </div>
                </div>

                <div className="flex w-full flex-col items-stretch gap-3 border-t border-dashed border-border-soft pt-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:border-t-0 sm:pt-0">
                  <div className="text-lg font-bold text-ink-900">{rupiah(t.nominal)}</div>

                  <div className="flex gap-2">
                    <a
                      href={`/invoice-lain/${t.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center rounded-full border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent-soft sm:flex-none"
                    >
                      <span className="inline-flex items-center gap-1"><IconFileText className="h-3.5 w-3.5" /> Invoice</span>
                    </a>

                    {t.status === "menunggu_verifikasi" && (
                      <button
                        className="flex flex-1 items-center justify-center rounded-full border border-border-soft px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-surface disabled:opacity-60 sm:flex-none"
                        onClick={() => handleCekStatus(t.id)}
                        disabled={isCekLoading || isBayarLoading}
                        title="Sinkronkan status dengan server Midtrans"
                      >
                        {isCekLoading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-500 border-t-transparent" /> : <span className="inline-flex items-center gap-1"><IconRefresh className="h-3.5 w-3.5" /> Cek Status</span>}
                      </button>
                    )}

                    {(t.status === "belum_bayar" || t.status === "terlambat") && (
                      <button
                        className="flex flex-1 items-center justify-center gap-1 rounded-full bg-gradient-to-br from-[#4338ca] to-[#4f46e5] px-4 py-1.5 text-xs font-bold text-white shadow-sm2 transition-all duration-200 hover:scale-[1.04] hover:from-[#3730a3] hover:to-[#4338ca] hover:shadow-[0_6px_18px_rgba(67,56,202,0.35)] active:scale-[0.96] disabled:opacity-60 disabled:hover:scale-100 sm:flex-none"
                        onClick={() => handleBayar(t.id)}
                        disabled={isBayarLoading || isCekLoading || !midtransReady}
                      >
                        {isBayarLoading ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Memuat...
                          </>
                        ) : "Bayar Sekarang"}
                      </button>
                    )}
                  </div>

                  {sesiTerbuka.has(t.id) && (
                    <button
                      className="w-full rounded-full border border-dashed border-border-soft px-3 py-1.5 text-xs font-semibold text-ink-500 transition hover:border-accent hover:text-accent disabled:opacity-60"
                      onClick={() => handleBayar(t.id, true)}
                      disabled={isBayarLoading || isCekLoading}
                    >
                      Mau ganti metode pembayaran? Buat sesi baru
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lunas.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Riwayat Lunas</h4>
          {lunas.map((t) => (
            <div
              key={t.id}
              className="mb-4 flex flex-col items-start justify-between gap-4 rounded-[18px] border border-border-soft bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)] sm:flex-row sm:items-center"
            >
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-ink-900">{t.jenisTagihanLain?.nama || "Tagihan"}</h4>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-bold tracking-wide text-green-700">
                    <span className="inline-flex items-center gap-1">✓ LUNAS</span>
                  </span>
                </div>
                <div className="text-sm text-ink-500">
                  Nominal: <strong>{rupiah(t.nominal)}</strong>
                  {t.pembayaran?.[0]?.paidAt ? ` — Dibayar: ${formatTanggalPanjang(t.pembayaran[0].paidAt)}` : ""}
                </div>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto">
                <a
                  href={`/invoice-lain/${t.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-1 rounded-full border border-accent px-4 py-1.5 text-sm font-semibold text-accent shadow-sm2 transition hover:bg-accent-soft sm:w-auto"
                >
                  <IconFileText className="h-4 w-4" /> Invoice
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
