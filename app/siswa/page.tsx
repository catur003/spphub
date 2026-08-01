"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  IconCheck, IconX, IconGraduationCap, IconLogout, IconClipboard, IconChart,
  IconCreditCard, IconCheckCircle, IconCalendar, IconMegaphone, IconWarning,
  IconUser, IconRefresh, IconSearch, IconFileText, IconWhatsapp,
} from "@/components/admin/icons";
import TagihanLainSection from "./components/TagihanLainSection";

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

// Catatan: "menunggu_verifikasi" & "terlambat" sengaja gak dikasih animasi pulse —
// di versi Bootstrap lama, class pulse-info/pulse-danger yang dipakai gak pernah
// didefinisikan di siswa.css, jadi efeknya sudah gak aktif dari awal. Dipertahankan sama persis.
const STATUS_INFO: Record<string, { label: string; className: string }> = {
  belum_bayar:          { label: "Belum Bayar",         className: "bg-red-100 text-red-800 animate-pulse-badge" },
  menunggu_verifikasi:  { label: "Menunggu Verifikasi",  className: "bg-amber-100 text-amber-800" },
  lunas:                { label: "Lunas",                className: "bg-green-100 text-green-700 animate-pulse-success-ring" },
  terlambat:            { label: "Terlambat",            className: "bg-red-100 text-red-800" },
};

const inputClass =
  "w-full rounded-control border border-border-soft px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";

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
      <div className="group sticky top-0 z-[100] flex items-center justify-between gap-2 bg-gradient-to-br from-[#1e1b4b] via-[#3730a3] to-[#4f46e5] px-4 py-3 text-white shadow-[0_4px_20px_rgba(30,27,75,0.25)] backdrop-blur-md md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <IconGraduationCap className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
          <div className="min-w-0 truncate">
            <h1 className="truncate text-sm font-bold text-white">SPP Sekolah Digital</h1>
            <span className="hidden rounded-full border border-white/15 bg-white/[0.18] px-2.5 py-[3px] text-[0.7rem] font-semibold tracking-wide text-indigo-100 backdrop-blur-sm md:inline-block">
              Portal Siswa
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-900 shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(255,255,255,0.3)] md:inline-flex"
            title="Hubungi Bendahara via WhatsApp"
          >
            <span className="inline-flex items-center gap-1"><IconWhatsapp className="h-4 w-4" /> Hubungi Bendahara</span>
          </a>
          <button
            className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:border-red-400/90 hover:bg-red-500/85 hover:shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <span className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Keluar...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1"><span>Keluar</span> <IconLogout className="h-4 w-4" /></span>
            )}
          </button>
        </div>
      </div>

      {/* Student Hero Header */}
      <div className="mb-7 border-b border-border-soft bg-gradient-to-b from-white to-surface px-4 py-6 pb-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] sm:py-8 sm:pb-6">
        <div className="mx-auto max-w-[980px]">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
            <div className="flex h-16 w-16 shrink-0 animate-float-bounce items-center justify-center overflow-hidden rounded-2xl border-[3px] border-white bg-gradient-to-br from-indigo-500 to-[#4338ca] text-2xl font-extrabold text-white shadow-[0_8px_22px_rgba(79,70,229,0.3)] transition-transform duration-300 hover:scale-105 hover:rotate-3 sm:h-[76px] sm:w-[76px] sm:rounded-[22px] sm:text-[2.1rem]">
              {siswa?.fotoUrl ? (
                <img src={siswa.fotoUrl} alt="Foto Profil" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="w-full flex-grow">
              <div className="mb-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-xl font-bold text-ink-900 sm:text-2xl">
                  {siswa?.namaLengkap || "Siswa"}
                </h2>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                  Kelas {siswa?.kelas?.namaKelas || "-"}
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  ● Aktif
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="text-sm text-ink-500">
                  NIS: <strong className="text-ink-900">{siswa?.nis || "-"}</strong>
                </span>
                {siswa?.nis && (
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 transition-all duration-150 hover:scale-105 hover:bg-slate-200 hover:text-slate-800 active:scale-95"
                    onClick={() => copyToClipboard(siswa.nis, "NIS")}
                  >
                    <span className="inline-flex items-center gap-1"><IconClipboard className="h-3.5 w-3.5" /> Salin NIS</span>
                  </button>
                )}
                {siswa?.nisn && (
                  <>
                    <span className="hidden text-sm text-ink-500 sm:inline">|</span>
                    <span className="text-sm text-ink-500">NISN: <strong className="text-ink-900">{siswa.nisn}</strong></span>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 transition-all duration-150 hover:scale-105 hover:bg-slate-200 hover:text-slate-800 active:scale-95"
                      onClick={() => copyToClipboard(siswa.nisn!, "NISN")}
                    >
                      <span className="inline-flex items-center gap-1"><IconClipboard className="h-3.5 w-3.5" /> Salin NISN</span>
                    </button>
                  </>
                )}
              </div>

              {siswa?.namaWali && (
                <p className="mt-2 text-[0.82rem] italic text-ink-500">
                  <IconUser className="mr-1 inline h-3.5 w-3.5" /> Wali: <strong className="not-italic">{siswa.namaWali}</strong> {siswa.kontakWali ? `(${siswa.kontakWali})` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Container Dashboard Content */}
      <div className="mx-auto max-w-[980px] px-4 pb-16">

        {/* Progres SPP Component */}
        <div className="mb-6 animate-fade-in-up-lg rounded-[18px] border border-border-soft bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-200 [animation-delay:0.08s] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
            <div>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-900"><IconChart className="h-4 w-4" /> Capaian SPP Sekolah</span>
              <span className="ml-2 hidden text-sm text-ink-500 sm:inline">({lunasCount} dari {totalBulanCount} bulan terbayar)</span>
            </div>
            <span className="rounded-full bg-status-lunas px-3 py-1 text-sm font-bold text-white shadow-sm2">{persenLunas}% Lunas</span>
          </div>
          <div className="h-2.5 rounded-full bg-border-soft">
            <div
              className="h-full animate-shimmer-fill rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 bg-[length:200%_200%] transition-[width] duration-700 ease-out"
              style={{ width: `${persenLunas}%` }}
              role="progressbar"
              aria-valuenow={persenLunas}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Ringkasan Stats Cards */}
        <div className="mb-6 grid animate-fade-in-up-lg grid-cols-1 gap-3 [animation-delay:0.16s] sm:grid-cols-2 md:grid-cols-3">
          <div className="group flex h-full items-center gap-4 rounded-[18px] border border-border-soft bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[5deg]"><IconCreditCard className="h-6 w-6" /></div>
            <div>
              <div className="text-sm font-semibold text-ink-500">Total Tunggakan</div>
              <div className="text-lg font-bold text-red-600">
                {nominalTunggakan.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-ink-500">{tagihanBelumLunas.length} bulan belum lunas</div>
            </div>
          </div>

          <div className="group flex h-full items-center gap-4 rounded-[18px] border border-border-soft bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[5deg]"><IconCheckCircle className="h-6 w-6" /></div>
            <div>
              <div className="text-sm font-semibold text-ink-500">SPP Terbayar</div>
              <div className="text-lg font-bold text-green-600">
                {nominalLunas.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-ink-500">{tagihanLunas.length} bulan lunas</div>
            </div>
          </div>

          <div className="group flex h-full items-center gap-4 rounded-[18px] border border-border-soft bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:col-span-2 md:col-span-1">
            <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[5deg]"><IconCalendar className="h-6 w-6" /></div>
            <div>
              <div className="text-sm font-semibold text-ink-500">Status SPP Bulan Ini</div>
              <div className="mt-1 text-sm font-bold">
                {tagihanBulanIni ? (
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${STATUS_INFO[tagihanBulanIni.status]?.className || "bg-slate-100 text-slate-700"}`}>
                    {STATUS_INFO[tagihanBulanIni.status]?.label}
                  </span>
                ) : (
                  <span className="text-sm text-ink-500">Belum terbit</span>
                )}
              </div>
              <div className="text-xs text-ink-500">{BULAN_LABEL[currentMonth]} {currentYear}</div>
            </div>
          </div>
        </div>

        {/* Pengumuman Alerts */}
        {pengumuman.length > 0 && (
          <div className="mb-6 animate-fade-in-up-lg [animation-delay:0.24s]">
            {pengumuman.map(p => (
              <div key={p.id} className="mb-3 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 shadow-sm2 transition-transform duration-200 hover:-translate-y-0.5">
                <div className="flex items-start gap-3">
                  <div className="animate-pulse"><IconMegaphone className="h-6 w-6" /></div>
                  <div className="flex-grow">
                    <div className="mb-1 font-bold text-accent">{p.judul}</div>
                    <div className="mb-1 whitespace-pre-wrap text-sm text-ink-900">{p.isi}</div>
                    <div className="text-[0.72rem] text-ink-500">
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
          <div className="mb-6 flex items-start gap-2 rounded-2xl border-[1.5px] border-red-200 bg-red-50 px-4 py-3 text-red-800">
            <IconWarning className="h-5 w-5" />
            <div className="text-sm">
              <strong>Pembayaran Gagal:</strong> {bayarError}
            </div>
            <button className="ml-auto text-lg leading-none text-red-800/70 hover:text-red-800" onClick={() => setBayarError(null)}>×</button>
          </div>
        )}

        {/* Tab Headers */}
        <div className="mb-6 flex animate-fade-in-up-lg gap-2 overflow-x-auto border-b-2 border-border-soft pb-0.5 [animation-delay:0.24s] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            className={`flex items-center gap-2 whitespace-nowrap rounded-t-[10px] border-b-[3px] px-5 py-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === "tagihan"
                ? "border-[#4338ca] bg-accent-soft text-[#4338ca] shadow-[0_4px_12px_rgba(67,56,202,0.08)]"
                : "border-transparent text-ink-500 hover:bg-indigo-500/[0.04] hover:text-[#4338ca]"
            }`}
            onClick={() => setActiveTab("tagihan")}
          >
            <span className="inline-flex items-center gap-1.5"><IconCreditCard className="h-4 w-4" /> Tagihan SPP ({tagihanBelumLunas.length})</span>
          </button>
          <button
            className={`flex items-center gap-2 whitespace-nowrap rounded-t-[10px] border-b-[3px] px-5 py-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === "riwayat"
                ? "border-[#4338ca] bg-accent-soft text-[#4338ca] shadow-[0_4px_12px_rgba(67,56,202,0.08)]"
                : "border-transparent text-ink-500 hover:bg-indigo-500/[0.04] hover:text-[#4338ca]"
            }`}
            onClick={() => setActiveTab("riwayat")}
          >
            <span className="inline-flex items-center gap-1.5"><IconFileText className="h-4 w-4" /> Riwayat Lunas ({tagihanLunas.length})</span>
          </button>
          <button
            className={`flex items-center gap-2 whitespace-nowrap rounded-t-[10px] border-b-[3px] px-5 py-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === "profil"
                ? "border-[#4338ca] bg-accent-soft text-[#4338ca] shadow-[0_4px_12px_rgba(67,56,202,0.08)]"
                : "border-transparent text-ink-500 hover:bg-indigo-500/[0.04] hover:text-[#4338ca]"
            }`}
            onClick={() => setActiveTab("profil")}
          >
            <span className="inline-flex items-center gap-1.5"><IconUser className="h-4 w-4" /> Data Diri Siswa</span>
          </button>
        </div>

        {/* TAB 1: TAGIHAN AKTIF */}
        {activeTab === "tagihan" && (
          <div className="animate-tab-fade-in">
            {loading ? (
              <div className="py-10 text-center text-ink-500">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <p>Memuat tagihan...</p>
              </div>
            ) : pageError ? (
              <div className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{pageError}</div>
            ) : tagihanBelumLunas.length === 0 ? (
              <div className="animate-float-bounce rounded-2xl border border-border-soft bg-white p-4 py-10 text-center shadow-sm2">
                <IconCheckCircle className="mx-auto mb-2 h-14 w-14 text-status-lunas" />
                <h4 className="text-lg font-bold text-ink-900">Semua Tagihan SPP Lunas!</h4>
                <p className="text-sm text-ink-500">Terima kasih, tidak ada tunggakan SPP yang perlu dibayar saat ini.</p>
              </div>
            ) : (
              tagihanBelumLunas.map((t) => {
                const info = STATUS_INFO[t.status] || { label: t.status, className: "bg-slate-100 text-slate-700" };
                const isBayarLoading = bayarLoading === t.id;
                const isCekLoading = cekStatusLoading === t.id;

                return (
                  <div className="mb-4 flex flex-col items-start justify-between gap-4 rounded-[18px] border border-border-soft bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)] sm:flex-row sm:items-center" key={t.id}>
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-ink-900">
                          SPP Bulan {BULAN_LABEL[t.bulan]} {t.tahun}
                        </h4>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${info.className}`}>
                          {info.label}
                        </span>
                      </div>
                      <div className="text-sm text-ink-500">
                        Jatuh tempo: <strong>{new Date(t.jatuhTempo).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong>
                      </div>
                    </div>

                    <div className="flex w-full flex-col items-stretch gap-3 border-t border-dashed border-border-soft pt-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:border-t-0 sm:pt-0">
                      <div className="text-lg font-bold text-ink-900">
                        Rp {t.nominal.toLocaleString("id-ID")}
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={`/invoice/${t.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-1 items-center justify-center rounded-full border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent-soft sm:flex-none"
                        >
                          <span className="inline-flex items-center gap-1"><IconFileText className="h-3.5 w-3.5" /> Invoice</span>
                        </a>

                        <button
                          className="flex flex-1 items-center justify-center rounded-full border border-border-soft px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-surface disabled:opacity-60 sm:flex-none"
                          onClick={() => handleCekStatus(t.id)}
                          disabled={isCekLoading || isBayarLoading}
                          title="Sinkronkan status dengan server Midtrans"
                        >
                          {isCekLoading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-500 border-t-transparent" /> : <span className="inline-flex items-center gap-1"><IconRefresh className="h-3.5 w-3.5" /> Cek Status</span>}
                        </button>

                        <button
                          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-gradient-to-br from-[#4338ca] to-[#4f46e5] px-4 py-1.5 text-xs font-bold text-white shadow-sm2 transition-all duration-200 hover:scale-[1.04] hover:from-[#3730a3] hover:to-[#4338ca] hover:shadow-[0_6px_18px_rgba(67,56,202,0.35)] active:scale-[0.96] disabled:opacity-60 disabled:hover:scale-100 sm:flex-none"
                          onClick={() => handleBayar(t.id)}
                          disabled={isBayarLoading || isCekLoading}
                        >
                          {isBayarLoading ? (
                            <>
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Memuat...
                            </>
                          ) : "Bayar Sekarang"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {!loading && !pageError && (
              <TagihanLainSection midtransReady={!!midtrans} onToast={tampilToast} />
            )}
          </div>
        )}

        {/* TAB 2: RIWAYAT LUNAS */}
        {activeTab === "riwayat" && (
          <div className="animate-tab-fade-in">
            {tagihanLunas.length > 0 && (
              <div className="relative mb-3 max-w-full sm:max-w-xs">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/50" />
                <input
                  type="text"
                  className={`w-full pl-9 ${inputClass}`}
                  placeholder="Cari bulan / tahun riwayat..."
                  value={searchRiwayat}
                  onChange={(e) => setSearchRiwayat(e.target.value)}
                />
              </div>
            )}

            {loading ? (
              <div className="py-10 text-center text-ink-500">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <p>Memuat riwayat...</p>
              </div>
            ) : tagihanLunas.length === 0 ? (
              <div className="rounded-2xl border border-border-soft bg-white p-4 py-10 text-center shadow-sm2">
                <IconFileText className="mx-auto mb-2 h-12 w-12 text-ink-500/50" />
                <h5 className="font-bold text-ink-900">Belum Ada Riwayat</h5>
                <p className="text-sm text-ink-500">Belum ada transaksi pembayaran SPP yang berstatus lunas.</p>
              </div>
            ) : filteredRiwayat.length === 0 ? (
              <div className="rounded-2xl border border-border-soft bg-white p-3 py-8 text-center">
                <p className="text-sm text-ink-500">Tidak ditemukan riwayat pembayaran yang cocok.</p>
              </div>
            ) : (
              filteredRiwayat.map((t) => (
                <div className="mb-4 flex flex-col items-start justify-between gap-4 rounded-[18px] border border-border-soft bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)] sm:flex-row sm:items-center" key={t.id}>
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-ink-900">
                        SPP Bulan {BULAN_LABEL[t.bulan]} {t.tahun}
                      </h4>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-bold tracking-wide text-green-700">
                        <span className="inline-flex items-center gap-1"><IconCheck className="h-3.5 w-3.5" /> LUNAS</span>
                      </span>
                    </div>
                    <div className="text-sm text-ink-500">
                      Nominal: <strong>Rp {t.nominal.toLocaleString("id-ID")}</strong>
                    </div>
                  </div>

                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <a
                      href={`/kwitansi/${t.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center gap-1 rounded-full border border-accent px-4 py-1.5 text-sm font-semibold text-accent shadow-sm2 transition hover:bg-accent-soft sm:w-auto"
                    >
                      <IconFileText className="h-4 w-4" /> Kwitansi PDF
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: PROFIL SAYA */}
        {activeTab === "profil" && (
          <div className="animate-tab-fade-in rounded-2xl border border-border-soft bg-white p-4 shadow-sm2">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[1px] text-accent">
              <span className="inline-flex items-center gap-1.5"><IconClipboard className="h-4 w-4" /> Identitas Siswa Lengkap</span>
            </h3>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <div className="rounded-2xl border border-border-soft bg-surface p-4 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-wider text-ink-500">Nama Lengkap</div>
                <div className="text-[0.95rem] font-bold text-ink-900">{siswa?.namaLengkap || "-"}</div>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface p-4 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-wider text-ink-500">NIS / NISN</div>
                <div className="text-[0.95rem] font-bold text-ink-900">{siswa?.nis || "-"} / {siswa?.nisn || "-"}</div>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface p-4 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-wider text-ink-500">Kelas</div>
                <div className="text-[0.95rem] font-bold text-ink-900">{siswa?.kelas?.namaKelas || "-"}</div>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface p-4 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-wider text-ink-500">Jenis Kelamin</div>
                <div className="text-[0.95rem] font-bold text-ink-900">{siswa?.jenisKelamin === "L" ? "Laki-Laki" : "Perempuan"}</div>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface p-4 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-wider text-ink-500">Nama Wali</div>
                <div className="text-[0.95rem] font-bold text-ink-900">{siswa?.namaWali || "-"}</div>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface p-4 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-wider text-ink-500">Kontak Wali / No HP</div>
                <div className="text-[0.95rem] font-bold text-ink-900">{siswa?.kontakWali || "-"}</div>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface p-4 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-wider text-ink-500">Email Akun Login</div>
                <div className="text-[0.95rem] font-bold text-ink-900">{siswa?.akun?.email || "-"}</div>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface p-4 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-wider text-ink-500">Status Siswa</div>
                <div className="text-[0.95rem] font-bold text-green-600">● Active / Aktif</div>
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
        className="fixed bottom-6 right-5 z-[990] flex animate-pulse-ring items-center gap-1.5 rounded-full bg-[#25d366] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(37,211,102,0.4)] transition-all duration-200 hover:scale-105 hover:bg-[#20ba5a] md:hidden"
        title="Hubungi Bendahara via WhatsApp"
      >
        <span className="inline-flex items-center gap-1"><IconWhatsapp className="h-4 w-4" /> WA Bendahara</span>
      </a>
    </div>
  );
}
