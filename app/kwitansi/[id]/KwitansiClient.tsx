"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function rupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);
}

export default function KwitansiClient({ tagihan, profil }: { tagihan: any, profil: any }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPDF() {
    if (!printRef.current) return;
    setDownloading(true);
    
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = printRef.current;
      const opt = {
        margin:       [10, 10, 10, 10], // top, left, bottom, right in mm
        filename:     `Kwitansi_SPP_${tagihan.siswa.namaLengkap.replace(/\s+/g, "_")}_${BULAN_LABEL[tagihan.bulan]}_${tagihan.tahun}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Gagal generate PDF", err);
      alert("Gagal mengunduh PDF. Pastikan koneksi stabil.");
    } finally {
      setDownloading(false);
    }
  }

  // Cari pembayaran tersukses (asumsi: hanya ada 1 pembayaran lunas per tagihan SPP)
  const pembayaran = tagihan.pembayaran && tagihan.pembayaran.length > 0 ? tagihan.pembayaran[0] : null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-[2rem_1rem] [font-family:system-ui,sans-serif]">
      <div className="mx-auto w-full max-w-[850px]">

        {/* Tombol Aksi (Tidak ikut ke-print) */}
        <div className="mb-4 flex items-center justify-between print:hidden">
          <button
            className="rounded-control border border-border-soft px-4 py-2 font-semibold text-ink-700 transition hover:bg-surface"
            onClick={() => window.history.back()}
          >
            ← Kembali
          </button>
          <div className="flex gap-2">
            <button
              className="rounded-control bg-slate-600 px-4 py-2 font-semibold text-white transition hover:bg-slate-700"
              onClick={() => window.print()}
            >
              🖨️ Cetak Printer
            </button>
            <button
              className="rounded-control bg-accent px-4 py-2 font-bold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDownloadPDF}
              disabled={downloading}
            >
              {downloading ? "Memproses PDF..." : "⬇️ Download PDF"}
            </button>
          </div>
        </div>

        {/* Area Kwitansi A4 */}
        <div
          ref={printRef}
          className="relative mx-auto overflow-hidden rounded-lg bg-white p-10 text-[#1e293b] shadow-[0_10px_40px_rgba(0,0,0,0.08)] print:max-w-none print:p-0 print:shadow-none"
        >
          {/* Lunas Watermark */}
          {tagihan.status === "lunas" && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] select-none text-[120px] font-black uppercase tracking-[10px] text-status-lunas/5">
              LUNAS
            </div>
          )}

          {/* KOP SURAT */}
          <div className="relative z-[1] mb-[30px] flex items-center justify-between border-b-[3px] border-[#1e293b] pb-5">
            <div className="flex items-center gap-4">
              {profil?.logoUrl ? (
                <img src={profil.logoUrl} alt="Logo" className="h-20 w-20 object-contain" crossOrigin="anonymous" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[10px] bg-border-soft text-2xl">🏫</div>
              )}
              <div>
                <h1 className="text-[28px] font-extrabold uppercase tracking-[1px] text-ink-900">
                  {profil?.nama || "NAMA SEKOLAH"}
                </h1>
                <p className="mt-[5px] max-w-[400px] text-sm leading-[1.5] text-ink-500">
                  {profil?.alamat || "Alamat sekolah belum diatur di sistem."}
                </p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold tracking-[2px] text-[#3b82f6]">KWITANSI</h2>
              <div className="mt-1 text-[13px] text-ink-500">
                No. Ref: {pembayaran?.orderId || `SPP-${tagihan.id.substring(0,8).toUpperCase()}`}
              </div>
            </div>
          </div>

          {/* INFORMASI PEMBAYAR */}
          <div className="relative z-[1] mb-12 grid grid-cols-12">
            <div className="col-span-7">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-slate-400">Diterima Dari</div>
              <div className="mb-1 text-lg font-bold text-ink-900">{tagihan.siswa.namaLengkap}</div>
              <div className="text-sm text-slate-600">NIS/NISN: {tagihan.siswa.nis} {tagihan.siswa.nisn ? `/ ${tagihan.siswa.nisn}` : ""}</div>
              <div className="text-sm text-slate-600">Kelas: {tagihan.siswa.kelas?.namaKelas || "-"}</div>
            </div>
            <div className="col-span-5 text-right">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-slate-400">Tanggal Pembayaran</div>
              <div className="text-base font-semibold text-ink-900">
                {pembayaran?.paidAt
                  ? new Date(pembayaran.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  : "-"}
              </div>
              <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[1px] text-slate-400">Metode Pembayaran</div>
              <div className="text-base font-semibold capitalize text-ink-900">
                {pembayaran?.metode || "Manual"}
              </div>
            </div>
          </div>

          {/* RINCIAN TAGIHAN */}
          <div className="relative z-[1]">
            <table className="mb-10 w-full border-collapse">
              <thead>
                <tr className="border-y-2 border-slate-300 bg-surface">
                  <th className="p-[12px_16px] text-left text-[13px] uppercase tracking-[1px] text-slate-600">Keterangan Pembayaran</th>
                  <th className="w-[200px] p-[12px_16px] text-right text-[13px] uppercase tracking-[1px] text-slate-600">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-soft">
                  <td className="p-[20px_16px] text-base font-medium">
                    Pembayaran SPP Bulan <strong className="text-ink-900">{BULAN_LABEL[tagihan.bulan]} {tagihan.tahun}</strong>
                    <div className="mt-1 text-[13px] text-ink-500">Tahun Ajaran {tagihan.tahunAjaran?.nama}</div>
                  </td>
                  <td className="p-[20px_16px] text-right text-base font-semibold">
                    {rupiah(tagihan.nominal)}
                  </td>
                </tr>
                {/* Total Row */}
                <tr>
                  <td className="p-[20px_16px] text-right text-sm font-bold uppercase tracking-[1px]">
                    Total Pembayaran
                  </td>
                  <td className="rounded-br-lg bg-accent-soft p-[20px_16px] text-right text-xl font-extrabold text-accent">
                    {rupiah(tagihan.nominal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TANDA TANGAN */}
          <div className="relative z-[1] mt-12 flex justify-between px-5">
            <div className="w-[200px] text-center">
              <div className="mb-[70px] text-sm text-slate-600">Penyetor / Siswa</div>
              <div className="border-b border-slate-300 pb-1 text-[15px] font-semibold">
                {tagihan.siswa.namaLengkap}
              </div>
            </div>
            <div className="w-[200px] text-center">
              <div className="mb-[70px] text-sm text-slate-600">Penerima / Petugas</div>
              <div className="border-b border-slate-300 pb-1 text-[15px] font-semibold">
                {pembayaran?.metode === "midtrans" ? "Sistem Otomatis" : "Bendahara Sekolah"}
              </div>
            </div>
          </div>

          <div className="relative z-[1] mt-[60px] text-center text-xs italic text-slate-400">
            Dokumen ini sah dan dicetak secara otomatis oleh sistem SPP Sekolah Digital.
          </div>

        </div>
      </div>
    </div>
  );
}
