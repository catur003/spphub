"use client";

import { useEffect, useState } from "react";
import { IconChart, IconClipboard, IconPrinter } from "@/components/admin/icons";

type LaporanKeuangan = {
  totalSppLunas: number;
  totalPendapatanLain: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  labaRugiNet: number;
  totalUtangPegawaiAktif: number;
  sppTunggakanTotal: number;
};

export default function LaporanKeuanganPage() {
  const [data, setData] = useState<LaporanKeuangan | null>(null);
  const [loading, setLoading] = useState(true);

  async function muatLaporan() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const d = await res.json();
        setData({
          totalSppLunas: d.pendapatanBulanIni || 0,
          totalPendapatanLain: 0,
          totalPemasukan: d.saldoKas || 0,
          totalPengeluaran: 0,
          labaRugiNet: d.labaRugi || 0,
          totalUtangPegawaiAktif: d.utangPegawaiTotal || 0,
          sppTunggakanTotal: d.sppBelumDibayarTotal || 0,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    muatLaporan();
  }, []);

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-ink-900"><IconChart className="h-5 w-5" /> Laporan Keuangan &amp; Arus Kas Sekolah</h1>
          <p className="text-[0.85rem] text-ink-500">
            Rekap Pembukuan Realtime Arus Kas, Pendapatan, Operasional &amp; Neraca Saldo Sekolah.
          </p>
        </div>
      </div>

      {loading || !data ? (
        <div className="p-5 text-center text-ink-500">
          <div className="mr-2 inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-accent-soft border-t-accent align-middle" />
          <span>Memuat laporan keuangan...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="h-full rounded-[18px] border-0 bg-white p-4 shadow-sm2">
            <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink-900"><IconChart className="h-4 w-4" /> Ringkasan Saldo &amp; Laba Rugi</h2>
            <div className="flex justify-between border-b border-border-soft py-2">
              <span className="text-ink-500">Total Saldo Kas Utama</span>
              <strong className="text-lg text-accent">Rp {data.totalPemasukan.toLocaleString("id-ID")}</strong>
            </div>
            <div className="flex justify-between border-b border-border-soft py-2">
              <span className="text-ink-500">Laba / Rugi Net (Surplus)</span>
              <strong className="text-lg text-status-lunas">Rp {data.labaRugiNet.toLocaleString("id-ID")}</strong>
            </div>
            <div className="flex justify-between border-b border-border-soft py-2">
              <span className="text-ink-500">Total Sisa Utang Pegawai (Kasbon)</span>
              <strong className="text-status-terlambat">Rp {data.totalUtangPegawaiAktif.toLocaleString("id-ID")}</strong>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-ink-500">Total Piutang SPP Belum Dibayar</span>
              <strong className="text-status-belum">Rp {data.sppTunggakanTotal.toLocaleString("id-ID")}</strong>
            </div>
          </div>

          <div className="h-full rounded-[18px] border-0 bg-white p-4 shadow-sm2">
            <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink-900"><IconClipboard className="h-4 w-4" /> Aksi &amp; Pengunduhan Laporan</h2>
            <p className="text-sm text-ink-500">
              Gunakan fitur ini untuk mencetak atau mengekspor rekap keuangan kas sekolah ke format resmi untuk pengurus yayasan.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                className="flex items-center justify-between rounded-control border border-accent py-2 text-left font-bold text-accent transition hover:bg-accent-soft"
                onClick={() => window.open("/cetak/laporan-keuangan", "_blank")}
              >
                <span className="inline-flex items-center gap-1.5 px-3"><IconPrinter className="h-4 w-4" /> Cetak Laporan Keuangan Pembukuan</span>
                <span className="px-3">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
