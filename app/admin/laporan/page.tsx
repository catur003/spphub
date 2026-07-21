"use client";

import { useEffect, useState } from "react";

type Kelas = { id: string; namaKelas: string };
type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  siswa: { namaLengkap: string; nis: string; kelas: Kelas | null };
};
type Ringkasan = {
  totalTagihan: number;
  totalNominal: number;
  totalLunas: number;
  nominalLunas: number;
  totalBelumLunas: number;
  nominalBelumLunas: number;
};

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const STATUS_LABEL: Record<string, string> = {
  belum_bayar: "Belum Bayar",
  menunggu_verifikasi: "Menunggu Verifikasi",
  lunas: "Lunas",
  terlambat: "Terlambat",
};

const STATUS_BADGE: Record<string, string> = {
  belum_bayar: "bg-secondary",
  menunggu_verifikasi: "bg-warning text-dark",
  lunas: "bg-success",
  terlambat: "bg-danger",
};

function rupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function LaporanPage() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [bulan, setBulan] = useState("");
  const [tahun, setTahun] = useState("");
  const [kelasId, setKelasId] = useState("");

  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [daftar, setDaftar] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/kelas").then(async (res) => {
      if (res.ok) setKelasList(await res.json());
    });
  }, []);

  function queryString() {
    const params = new URLSearchParams();
    if (bulan) params.set("bulan", bulan);
    if (tahun) params.set("tahun", tahun);
    if (kelasId) params.set("kelasId", kelasId);
    return params.toString();
  }

  async function muatLaporan() {
    setLoading(true);
    const res = await fetch(`/api/laporan?${queryString()}`);
    if (res.ok) {
      const data = await res.json();
      setRingkasan(data.ringkasan);
      setDaftar(data.daftar);
    }
    setLoading(false);
  }

  useEffect(() => {
    muatLaporan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-fluid p-4">
      <h1 className="h4 mb-4">Laporan</h1>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Bulan</label>
              <select className="form-select" value={bulan} onChange={(e) => setBulan(e.target.value)}>
                <option value="">Semua Bulan</option>
                {BULAN_LABEL.slice(1).map((b, i) => (
                  <option key={i + 1} value={i + 1}>{b}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Tahun</label>
              <input className="form-control" placeholder="cth 2026" value={tahun} onChange={(e) => setTahun(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Kelas</label>
              <select className="form-select" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
                <option value="">Semua Kelas</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>{k.namaKelas}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100" onClick={muatLaporan} disabled={loading}>
                {loading ? "..." : "Tampilkan"}
              </button>
            </div>
            <div className="col-md-2">
              <a className="btn btn-outline-secondary w-100" href={`/api/laporan/export?${queryString()}`}>
                Export Excel
              </a>
            </div>
          </div>
        </div>
      </div>

      {ringkasan && (
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <div className="text-muted small">Total Tagihan</div>
                <div className="h5 mb-0">{ringkasan.totalTagihan}</div>
                <div className="small text-muted">{rupiah(ringkasan.totalNominal)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center border-success">
              <div className="card-body">
                <div className="text-muted small">Lunas</div>
                <div className="h5 mb-0 text-success">{ringkasan.totalLunas}</div>
                <div className="small text-muted">{rupiah(ringkasan.nominalLunas)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center border-danger">
              <div className="card-body">
                <div className="text-muted small">Belum Lunas</div>
                <div className="h5 mb-0 text-danger">{ringkasan.totalBelumLunas}</div>
                <div className="small text-muted">{rupiah(ringkasan.nominalBelumLunas)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <div className="text-muted small">Persentase Lunas</div>
                <div className="h5 mb-0">
                  {ringkasan.totalTagihan > 0
                    ? Math.round((ringkasan.totalLunas / ringkasan.totalTagihan) * 100)
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <table className="table table-bordered bg-white">
        <thead>
          <tr>
            <th>Siswa</th>
            <th>NIS</th>
            <th>Kelas</th>
            <th>Periode</th>
            <th>Nominal</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {daftar.map((t) => (
            <tr key={t.id}>
              <td>{t.siswa.namaLengkap}</td>
              <td>{t.siswa.nis}</td>
              <td>{t.siswa.kelas?.namaKelas || "-"}</td>
              <td>{BULAN_LABEL[t.bulan]} {t.tahun}</td>
              <td>{rupiah(t.nominal)}</td>
              <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span></td>
            </tr>
          ))}
          {daftar.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted">Tidak ada data untuk filter ini.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
