"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconFileText, IconMoney, IconChart, IconZap, IconMegaphone, IconClock, IconWarning } from "@/components/admin/icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

type Transaksi = {
  id: string;
  nominal: number;
  bulan: number;
  tahun: number;
  updatedAt: string;
  siswa: { namaLengkap: string; kelas: { namaKelas: string } | null };
};

type Notifikasi = {
  id: string;
  judul: string;
  isi: string;
  createdAt: string;
};

type DashboardData = {
  saldoKas?: number;
  labaRugi?: number;
  totalSppLunas?: number;
  totalPendapatanLain?: number;
  totalPengeluaran?: number;
  arusKasBulanIni?: number;
  pendapatanLainBulanIni?: number;
  pengeluaranBulanIni?: number;
  trenPersen?: number;
  trenArah?: "naik" | "turun" | "sama";
  sppBelumDibayarTotal?: number;
  sppBelumDibayarCount?: number;
  utangPegawaiTotal?: number;
  utangPegawaiCount?: number;
  totalSiswa?: number;
  siswaBaruBulanIni?: number;
  pendapatanBulanIni?: number;
  tunggakanBulanIni?: number;
  jumlahTagihanBelumDibuat?: number;
  transaksiTerbaru?: Transaksi[];
  pieChartData?: { name: string; value: number; color: string }[];
  barChartData?: { name: string; total: number }[];
  notifikasiPenting?: Notifikasi[];
  bulan?: number;
  tahun?: number;
};

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Gradient tiap kartu ringkasan — dipertahankan persis dari desain lama,
// cuma dipindah dari <style> block ke sini biar gak ada CSS global tambahan.
const CARD_GRADIENTS = {
  blue: "linear-gradient(135deg, #1d72e8, #0d52bf)",
  green: "linear-gradient(135deg, #2e7d32, #1b5e20)",
  orange: "linear-gradient(135deg, #e65100, #f57c00)",
  red: "linear-gradient(135deg, #d32f2f, #c62828)",
};

function ExecutiveCard({
  href, gradient, icon, value, title, footer,
}: {
  href: string; gradient: string; icon: React.ReactNode; value: string; title: string; footer: React.ReactNode;
}) {
  return (
    <Link href={href} className="no-underline">
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
        style={{ background: gradient }}
      >
        <div className="absolute right-4 top-4 flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/25 backdrop-blur">
          {icon}
        </div>
        <div className="text-[1.65rem] font-extrabold leading-tight tracking-tight">{value}</div>
        <div className="mt-1.5 text-sm font-semibold opacity-90">{title}</div>
        <div className="mt-4 flex items-center gap-1.5 border-t border-white/20 pt-2.5 text-xs font-medium opacity-95">
          {footer}
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (resData && !resData.error) {
          setData(resData);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetch("/api/dashboard")
          .then((res) => (res.ok ? res.json() : null))
          .then((resData) => {
            if (resData && !resData.error) {
              setData(resData);
            }
          })
          .catch(() => {});
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="w-full p-4">
        <div className="flex items-center justify-center gap-2 py-20 text-ink-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span>Memuat executive dashboard...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const saldoKas = Number(data.saldoKas ?? data.pendapatanBulanIni ?? 0);
  const labaRugi = Number(data.labaRugi ?? ((data.pendapatanBulanIni || 0) - (data.tunggakanBulanIni || 0)));
  const totalSppLunas = Number(data.totalSppLunas ?? 0);
  const totalPendapatanLain = Number(data.totalPendapatanLain ?? 0);
  const totalPengeluaran = Number(data.totalPengeluaran ?? 0);
  const arusKasBulanIni = Number(data.arusKasBulanIni ?? 0);
  const trenPersen = Number(data.trenPersen ?? 0);
  const trenArah = data.trenArah ?? "sama";
  const sppBelumTotal = Number(data.sppBelumDibayarTotal ?? data.tunggakanBulanIni ?? 0);
  const sppBelumCount = Number(data.sppBelumDibayarCount ?? 0);
  const utangPegawaiTotal = Number(data.utangPegawaiTotal ?? 0);
  const utangPegawaiCount = Number(data.utangPegawaiCount ?? 0);

  const barChartData = Array.isArray(data.barChartData) ? data.barChartData : [];
  const pieChartData = Array.isArray(data.pieChartData) ? data.pieChartData : [];
  const transaksiTerbaru = Array.isArray(data.transaksiTerbaru) ? data.transaksiTerbaru : [];
  const notifikasiPenting = Array.isArray(data.notifikasiPenting) ? data.notifikasiPenting : [];
  const jumlahTagihanBelumDibuat = Number(data.jumlahTagihanBelumDibuat ?? 0);
  const bulan = data.bulan || new Date().getMonth() + 1;
  const tahun = data.tahun || new Date().getFullYear();

  return (
    <div className="w-full p-4">
      {/* Header Title */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Executive Financial Dashboard</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Ringkasan Realtime Arus Kas, Tagihan, dan Keuangan Sekolah
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/keuangan/pendapatan"
            className="inline-flex items-center gap-1.5 rounded-full border border-accent px-3 py-1.5 text-sm font-bold text-accent transition hover:bg-accent-soft"
          >
            <IconMoney className="h-4 w-4" /> Catat Pendapatan
          </Link>
          <Link
            href="/admin/keuangan/pengeluaran"
            className="inline-flex items-center gap-1.5 rounded-full border border-red-500 px-3 py-1.5 text-sm font-bold text-red-500 transition hover:bg-red-50"
          >
            <IconMoney className="h-4 w-4" /> Catat Pengeluaran
          </Link>
        </div>
      </div>

      {/* Banner Notifikasi Tagihan Belum Dibuat */}
      {jumlahTagihanBelumDibuat > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 p-4 shadow-sm2">
          <div className="flex items-center gap-2">
            <IconWarning className="h-5 w-5 text-amber-600" />
            <div className="text-sm text-amber-900">
              <strong>Tagihan Periode Ini:</strong> Ada <strong>{jumlahTagihanBelumDibuat} siswa aktif</strong> yang belum dibuatkan tagihan SPP bulan {BULAN_LABEL[bulan]} {tahun}.
            </div>
          </div>
          <Link
            href="/admin/tagihan"
            className="inline-flex items-center gap-1 rounded-control bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950 transition hover:bg-amber-500"
          >
            <IconZap className="h-3.5 w-3.5" /> Generate Massal
          </Link>
        </div>
      )}

      {/* 4 Executive Stat Cards — warna dinamis ngikutin nilai, biar sekali lihat
          langsung kebaca mana yang butuh perhatian (lihat Tahap 5 di
          RENCANA-LANJUTAN.md untuk alasan pemilihan warna). */}
      <div className="mb-6 grid grid-cols-12 gap-3">
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <ExecutiveCard
            href="/admin/keuangan/laporan"
            gradient={saldoKas >= 0 ? CARD_GRADIENTS.green : CARD_GRADIENTS.red}
            icon={<IconMoney className="h-5 w-5" />}
            value={saldoKas.toLocaleString("id-ID")}
            title="Saldo Kas Utama (All-Time)"
            footer={
              <div className="flex w-full items-center justify-between">
                <span>Arus kas bulan ini: Rp {arusKasBulanIni.toLocaleString("id-ID")}</span>
                {trenArah !== "sama" && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-white/25 px-1.5 py-0.5 text-[0.68rem] font-bold">
                    {trenArah === "naik" ? "▲" : "▼"} {trenPersen !== 0 ? `${Math.abs(trenPersen)}%` : ""}
                  </span>
                )}
              </div>
            }
          />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <ExecutiveCard
            href="/admin/keuangan/laporan"
            gradient={labaRugi >= 0 ? CARD_GRADIENTS.green : CARD_GRADIENTS.red}
            icon={<IconChart className="h-5 w-5" />}
            value={labaRugi.toLocaleString("id-ID")}
            title="Laba/Rugi Net"
            footer={<>Per {todayStr}</>}
          />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <ExecutiveCard
            href="/admin/tagihan?status=belum_bayar"
            gradient={sppBelumTotal > 0 ? CARD_GRADIENTS.orange : CARD_GRADIENTS.green}
            icon={<IconFileText className="h-5 w-5" />}
            value={sppBelumTotal.toLocaleString("id-ID")}
            title="SPP Belum Dibayar"
            footer={<>{sppBelumCount} siswa belum bayar</>}
          />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <ExecutiveCard
            href="/admin/keuangan/utang-pegawai"
            gradient={utangPegawaiTotal > 0 ? CARD_GRADIENTS.red : CARD_GRADIENTS.green}
            icon={<IconMoney className="h-5 w-5" />}
            value={utangPegawaiTotal.toLocaleString("id-ID")}
            title="Utang Pegawai (Kasbon)"
            footer={<>{utangPegawaiCount} pegawai aktif</>}
          />
        </div>
      </div>

      {/* Tahap 7: breakdown sumber saldo kas (all-time), biar gak cuma 1 angka net */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm2">
          Dari SPP: <strong className="text-emerald-600">Rp {totalSppLunas.toLocaleString("id-ID")}</strong>
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm2">
          Pendapatan Lain: <strong className="text-emerald-600">Rp {totalPendapatanLain.toLocaleString("id-ID")}</strong>
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm2">
          Total Pengeluaran: <strong className="text-red-500">Rp {totalPengeluaran.toLocaleString("id-ID")}</strong>
        </span>
      </div>

      {/* Charts & Graphs Row */}
      <div className="mb-6 grid grid-cols-12 gap-3">
        {/* Bar Chart: Tren Pemasukan 6 Bulan */}
        <div className="col-span-12 lg:col-span-8">
          <div className="h-full rounded-[18px] bg-white p-4 shadow-sm2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-base font-bold text-ink-900"><IconChart className="h-4 w-4" /> Tren Pemasukan SPP (6 Bulan Terakhir)</div>
                <div className="text-sm text-ink-500">Total penerimaan kas SPP yang terverifikasi</div>
              </div>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                  <RechartsTooltip
                    formatter={(val: number) => [`Rp ${val.toLocaleString('id-ID')}`, 'Total Pemasukan']}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  />
                  <Bar dataKey="total" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pie Chart: Distribusi Status Pembayaran */}
        <div className="col-span-12 lg:col-span-4">
          <div className="h-full rounded-[18px] bg-white p-4 shadow-sm2">
            <div className="flex items-center gap-1.5 text-base font-bold text-ink-900"><IconChart className="h-4 w-4" /> Rasio Status SPP</div>
            <div className="mb-3 text-sm text-ink-500">Bulan {BULAN_LABEL[bulan]} {tahun}</div>
            <div style={{ width: "100%", height: 220 }}>
              {pieChartData.reduce((sum, d) => sum + (d.value || 0), 0) === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-ink-500">
                  <IconFileText className="h-8 w-8 text-ink-500/50" />
                  <span className="text-sm">Belum ada tagihan untuk bulan ini</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4}>
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    <RechartsTooltip formatter={(val: number) => [`${val} Siswa`, 'Jumlah']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Transaksi Terbaru & Pengumuman */}
      <div className="grid grid-cols-12 gap-3">
        {/* Transaksi Lunas Terbaru */}
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-[18px] bg-white p-4 shadow-sm2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-base font-bold text-ink-900"><IconZap className="h-4 w-4" /> Pembayaran Lunas Terbaru</div>
              <Link href="/admin/tagihan?status=lunas" className="text-sm font-bold text-accent no-underline">
                Lihat Semua →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-surface text-ink-500">
                  <tr>
                    <th className="px-2 py-2 font-medium">Siswa</th>
                    <th className="px-2 py-2 font-medium">Periode</th>
                    <th className="px-2 py-2 font-medium">Nominal</th>
                    <th className="px-2 py-2 font-medium">Tanggal Lunas</th>
                  </tr>
                </thead>
                <tbody>
                  {transaksiTerbaru.map((t) => (
                    <tr key={t.id} className="border-t border-border-soft hover:bg-surface">
                      <td className="px-2 py-2">
                        <div className="font-bold text-ink-900">{t.siswa?.namaLengkap || "Siswa"}</div>
                        <div className="text-xs text-ink-500">{t.siswa?.kelas?.namaKelas || "-"}</div>
                      </td>
                      <td className="px-2 py-2">{BULAN_LABEL[t.bulan]} {t.tahun}</td>
                      <td className="px-2 py-2 font-bold text-status-lunas">Rp {(t.nominal || 0).toLocaleString("id-ID")}</td>
                      <td className="px-2 py-2 text-xs text-ink-500">
                        {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"}
                      </td>
                    </tr>
                  ))}
                  {transaksiTerbaru.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-ink-500">Belum ada transaksi lunas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pengumuman Terbaru */}
        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-[18px] bg-white p-4 shadow-sm2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-base font-bold text-ink-900"><IconMegaphone className="h-4 w-4" /> Pengumuman Sekolah</div>
              <Link href="/admin/pengumuman" className="text-sm font-bold text-accent no-underline">
                Kelola →
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {notifikasiPenting.map((n) => (
                <div key={n.id} className="rounded-xl border border-border-soft bg-surface p-3">
                  <div className="mb-1 text-sm font-bold text-ink-900">{n.judul}</div>
                  <div className="line-clamp-2 text-sm text-ink-500">{n.isi}</div>
                  <div className="mt-1 text-xs text-ink-500">
                    <IconClock className="mr-1 inline h-3 w-3" />{new Date(n.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              ))}
              {notifikasiPenting.length === 0 && (
                <div className="py-8 text-center text-sm text-ink-500">Belum ada pengumuman terbit.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
