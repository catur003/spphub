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
    <div style={{ backgroundColor: "#f1f5f9", minHeight: "100vh", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <div className="container" style={{ maxWidth: "850px" }}>
        
        {/* Tombol Aksi (Tidak ikut ke-print) */}
        <div className="d-flex justify-content-between align-items-center mb-4 no-print">
          <button className="btn btn-outline-secondary fw-semibold" onClick={() => window.history.back()}>
            ← Kembali
          </button>
          <div className="d-flex gap-2">
            <button className="btn btn-secondary fw-semibold" onClick={() => window.print()}>
              🖨️ Cetak Printer
            </button>
            <button className="btn btn-primary fw-bold" onClick={handleDownloadPDF} disabled={downloading}>
              {downloading ? "Memproses PDF..." : "⬇️ Download PDF"}
            </button>
          </div>
        </div>

        {/* Area Kwitansi A4 */}
        <div 
          ref={printRef}
          style={{ 
            backgroundColor: "#ffffff", 
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)", 
            borderRadius: "8px",
            padding: "40px",
            color: "#1e293b",
            margin: "0 auto",
            position: "relative",
            overflow: "hidden"
          }}
          className="kwitansi-paper"
        >
          {/* Lunas Watermark */}
          {tagihan.status === "lunas" && (
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-30deg)",
              fontSize: "120px", fontWeight: "900", color: "rgba(16, 185, 129, 0.05)",
              pointerEvents: "none", zIndex: 0, textTransform: "uppercase", letterSpacing: "10px"
            }}>
              LUNAS
            </div>
          )}

          {/* KOP SURAT */}
          <div className="d-flex align-items-center justify-content-between" style={{ borderBottom: "3px solid #1e293b", paddingBottom: "20px", marginBottom: "30px", zIndex: 1, position: "relative" }}>
            <div className="d-flex align-items-center gap-4">
              {profil?.logoUrl ? (
                <img src={profil.logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: "contain" }} crossOrigin="anonymous" />
              ) : (
                <div style={{ width: 80, height: 80, backgroundColor: "#e2e8f0", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>🏫</div>
              )}
              <div>
                <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "1px" }}>
                  {profil?.nama || "NAMA SEKOLAH"}
                </h1>
                <p style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px", maxWidth: "400px", lineHeight: "1.5" }}>
                  {profil?.alamat || "Alamat sekolah belum diatur di sistem."}
                </p>
              </div>
            </div>
            <div className="text-end">
              <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#3b82f6", letterSpacing: "2px" }}>KWITANSI</h2>
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                No. Ref: {pembayaran?.orderId || `SPP-${tagihan.id.substring(0,8).toUpperCase()}`}
              </div>
            </div>
          </div>

          {/* INFORMASI PEMBAYAR */}
          <div className="row mb-5" style={{ zIndex: 1, position: "relative" }}>
            <div className="col-7">
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Diterima Dari</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>{tagihan.siswa.namaLengkap}</div>
              <div style={{ fontSize: "14px", color: "#475569" }}>NIS/NISN: {tagihan.siswa.nis} {tagihan.siswa.nisn ? `/ ${tagihan.siswa.nisn}` : ""}</div>
              <div style={{ fontSize: "14px", color: "#475569" }}>Kelas: {tagihan.siswa.kelas?.namaKelas || "-"}</div>
            </div>
            <div className="col-5 text-end">
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Tanggal Pembayaran</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a" }}>
                {pembayaran?.paidAt 
                  ? new Date(pembayaran.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) 
                  : "-"}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginTop: "16px", marginBottom: "8px" }}>Metode Pembayaran</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>
                {pembayaran?.metode || "Manual"}
              </div>
            </div>
          </div>

          {/* RINCIAN TAGIHAN */}
          <div style={{ zIndex: 1, position: "relative" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #cbd5e1", borderTop: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "1px" }}>Keterangan Pembayaran</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "1px", width: "200px" }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "20px 16px", fontSize: "16px", fontWeight: 500 }}>
                    Pembayaran SPP Bulan <strong style={{ color: "#0f172a" }}>{BULAN_LABEL[tagihan.bulan]} {tagihan.tahun}</strong>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>Tahun Ajaran {tagihan.tahunAjaran?.nama}</div>
                  </td>
                  <td style={{ padding: "20px 16px", fontSize: "16px", fontWeight: 600, textAlign: "right" }}>
                    {rupiah(tagihan.nominal)}
                  </td>
                </tr>
                {/* Total Row */}
                <tr>
                  <td style={{ padding: "20px 16px", fontSize: "14px", fontWeight: 700, textAlign: "right", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Total Pembayaran
                  </td>
                  <td style={{ padding: "20px 16px", fontSize: "20px", fontWeight: 800, textAlign: "right", color: "#4f46e5", backgroundColor: "#eef2ff", borderBottomRightRadius: "8px" }}>
                    {rupiah(tagihan.nominal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TANDA TANGAN */}
          <div className="d-flex justify-content-between mt-5" style={{ zIndex: 1, position: "relative", padding: "0 20px" }}>
            <div style={{ width: "200px", textAlign: "center" }}>
              <div style={{ fontSize: "14px", color: "#475569", marginBottom: "70px" }}>Penyetor / Siswa</div>
              <div style={{ borderBottom: "1px solid #cbd5e1", paddingBottom: "4px", fontSize: "15px", fontWeight: 600 }}>
                {tagihan.siswa.namaLengkap}
              </div>
            </div>
            <div style={{ width: "200px", textAlign: "center" }}>
              <div style={{ fontSize: "14px", color: "#475569", marginBottom: "70px" }}>Penerima / Petugas</div>
              <div style={{ borderBottom: "1px solid #cbd5e1", paddingBottom: "4px", fontSize: "15px", fontWeight: 600 }}>
                {pembayaran?.metode === "midtrans" ? "Sistem Otomatis" : "Bendahara Sekolah"}
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: "center", marginTop: "60px", fontSize: "12px", color: "#94a3b8", fontStyle: "italic", zIndex: 1, position: "relative" }}>
            Dokumen ini sah dan dicetak secara otomatis oleh sistem SPP Sekolah Digital.
          </div>

        </div>
      </div>

      <style>{`
        @media print {
          body { background-color: #fff !important; }
          .no-print { display: none !important; }
          .kwitansi-paper { 
            box-shadow: none !important; 
            padding: 0 !important; 
            width: 100% !important; 
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}
