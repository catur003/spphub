"use client";

import { useEffect, useState } from "react";

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
    <div className="container-fluid p-4">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>📊 Laporan Keuangan & Arus Kas Kas Sekolah</h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
            Rekap Pembukuan Realtime Arus Kas, Pendapatan, Operasional & Neraca Saldo Sekolah.
          </p>
        </div>
      </div>

      {loading || !data ? (
        <div className="p-5 text-center text-muted">
          <div className="spinner-border text-primary me-2" />
          <span>Memuat laporan keuangan...</span>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-12 col-md-6">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: 18 }}>
              <h5 className="fw-bold mb-3 text-dark">📈 Ringkasan Saldo & Laba Rugi</h5>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Total Saldo Kas Utama</span>
                <strong className="text-primary fs-5">Rp {data.totalPemasukan.toLocaleString("id-ID")}</strong>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Laba / Rugi Net (Surplus)</span>
                <strong className="text-success fs-5">Rp {data.labaRugiNet.toLocaleString("id-ID")}</strong>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Total Sisa Utang Pegawai (Kasbon)</span>
                <strong className="text-danger">Rp {data.totalUtangPegawaiAktif.toLocaleString("id-ID")}</strong>
              </div>
              <div className="d-flex justify-content-between py-2">
                <span className="text-muted">Total Piutang SPP Belum Dibayar</span>
                <strong className="text-warning-emphasis">Rp {data.sppTunggakanTotal.toLocaleString("id-ID")}</strong>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: 18 }}>
              <h5 className="fw-bold mb-3 text-dark">📜 Aksi & Pengunduhan Laporan</h5>
              <p className="text-muted small">
                Gunakan fitur ini untuk mencetak atau mengekspor rekap keuangan kas sekolah ke format resmi untuk pengurus yayasan.
              </p>
              <div className="d-flex flex-column gap-2 mt-3">
                <button className="btn btn-outline-primary fw-bold py-2 text-start d-flex align-items-center justify-content-between" onClick={() => window.print()}>
                  <span>🖨️ Cetak Laporan Keuangan Pembukuan</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
