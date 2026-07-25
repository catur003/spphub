"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type TagihanInvoice = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo: string;
  createdAt: string;
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

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function InvoicePage() {
  const params = useParams();
  const id = params?.id as string;

  const [tagihan, setTagihan] = useState<TagihanInvoice | null>(null);
  const [sekolah, setSekolah] = useState<ProfilSekolah | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/tagihan/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/settings/sekolah").then((r) => r.ok ? r.json() : null),
    ]).then(([tagihanData, sekolahData]) => {
      if (tagihanData) setTagihan(tagihanData);
      if (sekolahData) setSekolah(sekolahData);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="p-5 text-center text-muted">
        <div className="spinner-border text-primary me-2" />
        <span>Memuat tagihan invoice...</span>
      </div>
    );
  }

  if (!tagihan) {
    return (
      <div className="p-5 text-center text-muted">
        <div className="alert alert-danger d-inline-block">Tagihan invoice tidak ditemukan.</div>
      </div>
    );
  }

  const invoiceNo = `INV/${tagihan.tahun}/${String(tagihan.bulan).padStart(2, "0")}/${tagihan.id.slice(-5).toUpperCase()}`;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-card { shadow: none !important; border: none !important; }
        }
      `}</style>
      <div className="bg-light min-vh-100 py-4">
        <div className="container" style={{ maxWidth: 800 }}>
          {/* Top Bar Actions */}
          <div className="d-flex align-items-center justify-content-between mb-3 no-print">
            <button className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => window.history.back()}>
              ← Kembali
            </button>
            <div className="d-flex gap-2">
              <button className="btn btn-primary btn-sm rounded-pill px-4 fw-bold shadow-sm" onClick={() => window.print()}>
                🖨️ Cetak / Download PDF
              </button>
            </div>
          </div>

          <div className="card border-0 shadow-lg p-5 invoice-card" style={{ borderRadius: 24, background: "white" }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-start border-bottom pb-4 mb-4">
              <div>
                <h3 className="fw-bold text-dark mb-1">{sekolah?.nama || "SPP Sekolah Digital"}</h3>
                <p className="text-muted small mb-0">{sekolah?.alamat || "Sistem Informasi SPP & Keuangan Sekolah"}</p>
                {sekolah?.noHpBendahara && <p className="text-muted small mb-0">Bendahara WA: {sekolah.noHpBendahara}</p>}
              </div>
              <div className="text-end">
                <span className="badge bg-indigo-subtle text-indigo px-3 py-1 rounded-pill mb-2 fw-bold" style={{ background: "#e0e7ff", color: "#3730a3", fontSize: "0.85rem" }}>
                  INVOICE TAGIHAN
                </span>
                <div className="fw-bold text-dark" style={{ fontFamily: "monospace" }}>{invoiceNo}</div>
                <div className="text-muted small">Tgl Terbit: {new Date(tagihan.createdAt).toLocaleDateString("id-ID")}</div>
              </div>
            </div>

            {/* Bill To Info */}
            <div className="row mb-4">
              <div className="col-6">
                <div className="text-muted small fw-semibold">DITAGIHKAN KEPADA:</div>
                <div className="fw-bold fs-5 text-dark">{tagihan.siswa?.namaLengkap}</div>
                <div className="text-muted small">NIS: {tagihan.siswa?.nis || "-"} | Kelas: {tagihan.siswa?.kelas?.namaKelas || "-"}</div>
                <div className="text-muted small">Wali Siswa: {tagihan.siswa?.namaWali || "-"}</div>
              </div>
              <div className="col-6 text-end">
                <div className="text-muted small fw-semibold">TANGGAL JATUH TEMPO:</div>
                <div className="fw-bold text-danger fs-5">
                  {new Date(tagihan.jatuhTempo).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </div>
                <div className="mt-2">
                  <span className={`badge ${tagihan.status === "lunas" ? "bg-success" : "bg-warning text-dark"} px-3 py-2 rounded-pill fw-bold`}>
                    {tagihan.status === "lunas" ? "✓ LUNAS" : "BELUM DIBAYAR"}
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <table className="table table-bordered align-middle mb-4">
              <thead className="table-light">
                <tr>
                  <th>Deskripsi Rincian Tagihan</th>
                  <th className="text-end" style={{ width: 180 }}>Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="fw-bold text-dark">Pembayaran SPP Bulan {BULAN_LABEL[tagihan.bulan]} {tagihan.tahun}</div>
                    <div className="text-muted small">Iuran SPP Rutin Kelas {tagihan.siswa?.kelas?.namaKelas || "-"}</div>
                  </td>
                  <td className="text-end fw-bold text-dark">
                    Rp {tagihan.nominal.toLocaleString("id-ID")}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td className="fw-bold text-end">TOTAL TAGIHAN:</td>
                  <td className="fw-bold text-end text-primary fs-5">
                    Rp {tagihan.nominal.toLocaleString("id-ID")}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Transfer Instructions Footer */}
            <div className="p-3 bg-light rounded-3 border mb-4">
              <div className="fw-bold text-dark mb-1" style={{ fontSize: "0.85rem" }}>ℹ️ PANDUAN PEMBAYARAN:</div>
              <div className="text-muted small">
                1. Pembayaran dapat dilakukan via <strong>Portal Siswa Online (Midtrans)</strong> atau bayar tunai di bendahara sekolah.<br />
                2. Simpan invoice & kwitansi ini sebagai bukti pembayaran sah.
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-end pt-3">
              <div className="text-muted small">
                Dicetak pada: {new Date().toLocaleString("id-ID")}
              </div>
              <div className="text-center" style={{ minWidth: 160 }}>
                <div className="text-muted small mb-5">Staf Bendahara Sekolah,</div>
                <div className="fw-bold text-dark border-bottom pb-1">{sekolah?.nama || "Administrasi SPP"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
