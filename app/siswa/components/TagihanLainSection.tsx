"use client";

import { useEffect, useState } from "react";
import { IconClipboard, IconWarning, IconRefresh } from "@/components/admin/icons";
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
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {belumLunas.map((t) => {
            const info = STATUS_INFO[t.status] || { label: t.status, className: "bg-gray-100 text-gray-800" };
            const isBayarLoading = bayarLoading === t.id;
            const isCekLoading = cekStatusLoading === t.id;
            return (
              <div key={t.id} className="rounded-[18px] border border-border-soft bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-ink-900">{t.jenisTagihanLain?.nama || "Tagihan"}</div>
                    {t.keterangan && <p className="mt-0.5 text-sm text-ink-500">{t.keterangan}</p>}
                    <p className="mt-1 text-xs text-ink-500">
                      Jatuh tempo: <strong>{formatTanggalPanjang(t.jatuhTempo)}</strong>
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
                        disabled={isBayarLoading || isCekLoading || !midtransReady}
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
      )}

      {lunas.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Riwayat Lunas</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lunas.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-[18px] border border-border-soft bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                <div>
                  <div className="font-semibold text-ink-900">{t.jenisTagihanLain?.nama || "Tagihan"}</div>
                  <p className="text-xs text-ink-500">
                    {t.pembayaran?.[0]?.paidAt ? `Dibayar: ${formatTanggalPanjang(t.pembayaran[0].paidAt)}` : ""}
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
  );
}
