"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { IconPrinter, IconCheck, IconWarning } from "@/components/admin/icons";

type TagihanLainInvoice = {
  id: string;
  nominal: number;
  status: string;
  jatuhTempo: string;
  createdAt: string;
  keterangan?: string | null;
  jenisTagihanLain?: { nama?: string } | null;
  siswa?: {
    namaLengkap?: string;
    nis?: string;
    nisn?: string | null;
    namaWali?: string | null;
    kontakWali?: string | null;
    kelas?: { namaKelas?: string; waliKelas?: string | null } | null;
  } | null;
};

type ProfilSekolah = {
  nama: string;
  alamat: string | null;
  noHpBendahara: string | null;
};

export default function InvoiceLainPage() {
  const params = useParams();
  const id = params?.id as string;

  const [tagihan, setTagihan] = useState<TagihanLainInvoice | null>(null);
  const [sekolah, setSekolah] = useState<ProfilSekolah | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/tagihan-lain/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/settings/sekolah").then((r) => r.ok ? r.json() : null),
    ]).then(([tagihanData, sekolahData]) => {
      if (tagihanData) setTagihan(tagihanData);
      if (sekolahData) setSekolah(sekolahData);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="p-5 text-center text-ink-500">
        <div className="mr-2 inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-accent-soft border-t-accent align-middle" />
        <span>Memuat tagihan invoice...</span>
      </div>
    );
  }

  if (!tagihan) {
    return (
      <div className="p-5 text-center text-ink-500">
        <div className="inline-block rounded-control border border-status-terlambat/30 bg-status-terlambat/10 px-4 py-3 text-status-terlambat">
          Tagihan invoice tidak ditemukan.
        </div>
      </div>
    );
  }

  const namaJenis = tagihan.jenisTagihanLain?.nama || "Tagihan Lainnya";
  const invoiceNo = `INV/LAIN/${new Date(tagihan.createdAt).getFullYear()}/${tagihan.id.slice(-5).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-surface py-4">
      <div className="mx-auto w-full max-w-[800px]">
        {/* Top Bar Actions */}
        <div className="mb-3 flex items-center justify-between print:hidden">
          <button
            className="rounded-full border border-border-soft px-3 py-1.5 text-sm text-ink-700 transition hover:bg-surface"
            onClick={() => window.history.back()}
          >
            ← Kembali
          </button>
          <div className="flex gap-2">
            <button
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover"
              onClick={() => window.print()}
            >
              <span className="inline-flex items-center gap-1.5"><IconPrinter className="h-4 w-4" /> Cetak / Download PDF</span>
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border-0 bg-white p-5 shadow-lg2 print:border-none print:shadow-none">
          {/* Header */}
          <div className="mb-4 flex items-start justify-between border-b border-border-soft pb-4">
            <div>
              <h3 className="mb-1 text-xl font-bold text-ink-900">{sekolah?.nama || "SPP Sekolah Digital"}</h3>
              <p className="text-sm text-ink-500">{sekolah?.alamat || "Sistem Informasi SPP & Keuangan Sekolah"}</p>
              {sekolah?.noHpBendahara && <p className="text-sm text-ink-500">Bendahara WA: {sekolah.noHpBendahara}</p>}
            </div>
            <div className="text-right">
              <span className="mb-2 inline-block rounded-full bg-[#e0e7ff] px-3 py-1 text-[0.85rem] font-bold text-[#3730a3]">
                INVOICE TAGIHAN
              </span>
              <div className="font-mono font-bold text-ink-900">{invoiceNo}</div>
              <div className="text-sm text-ink-500">Tgl Terbit: {new Date(tagihan.createdAt).toLocaleDateString("id-ID")}</div>
            </div>
          </div>

          {/* Bill To Info */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-semibold text-ink-500">DITAGIHKAN KEPADA:</div>
              <div className="text-xl font-bold text-ink-900">{tagihan.siswa?.namaLengkap}</div>
              <div className="text-sm text-ink-500">NIS: {tagihan.siswa?.nis || "-"} | Kelas: {tagihan.siswa?.kelas?.namaKelas || "-"}</div>
              <div className="text-sm text-ink-500">Wali Siswa: {tagihan.siswa?.namaWali || "-"}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-ink-500">TANGGAL JATUH TEMPO:</div>
              <div className="text-xl font-bold text-status-terlambat">
                {new Date(tagihan.jatuhTempo).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="mt-2">
                <span
                  className={`inline-block rounded-full px-3 py-2 font-bold ${
                    tagihan.status === "lunas" ? "bg-status-lunas text-white" : "bg-status-belum text-ink-900"
                  }`}
                >
                  {tagihan.status === "lunas" ? <span className="inline-flex items-center gap-1"><IconCheck className="h-3.5 w-3.5" /> LUNAS</span> : "BELUM DIBAYAR"}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="mb-4 w-full border-collapse">
            <thead>
              <tr className="bg-surface">
                <th className="border border-border-soft p-3 text-left">Deskripsi Rincian Tagihan</th>
                <th className="w-[180px] border border-border-soft p-3 text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border-soft p-3 align-middle">
                  <div className="font-bold text-ink-900">{namaJenis}</div>
                  <div className="text-sm text-ink-500">
                    {tagihan.keterangan || `Tagihan ${namaJenis} untuk siswa kelas ${tagihan.siswa?.kelas?.namaKelas || "-"}`}
                  </div>
                </td>
                <td className="border border-border-soft p-3 text-right align-middle font-bold text-ink-900">
                  Rp {tagihan.nominal.toLocaleString("id-ID")}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="border border-border-soft p-3 text-right font-bold">TOTAL TAGIHAN:</td>
                <td className="border border-border-soft p-3 text-right text-xl font-bold text-accent">
                  Rp {tagihan.nominal.toLocaleString("id-ID")}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Transfer Instructions Footer */}
          <div className="mb-4 rounded-control border border-border-soft bg-surface p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[0.85rem] font-bold text-ink-900"><IconWarning className="h-3.5 w-3.5" /> PANDUAN PEMBAYARAN:</div>
            <div className="text-sm text-ink-500">
              1. Pembayaran dapat dilakukan via <strong>Portal Siswa Online (Midtrans)</strong> atau bayar tunai di bendahara sekolah.<br />
              2. Simpan invoice & kwitansi ini sebagai bukti pembayaran sah.
            </div>
          </div>

          <div className="flex items-end justify-between pt-3">
            <div className="text-sm text-ink-500">
              Dicetak pada: {new Date().toLocaleString("id-ID")}
            </div>
            <div className="min-w-[160px] text-center">
              <div className="mb-12 text-sm text-ink-500">Staf Bendahara Sekolah,</div>
              <div className="border-b border-border-soft pb-1 font-bold text-ink-900">{sekolah?.nama || "Administrasi SPP"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
