"use client";

import { useEffect, useState } from "react";

type TahunAjaran = { id: string; nama: string; aktif: boolean };
type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo: string;
  siswa: { namaLengkap: string; nis: string };
};

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const STATUS_BADGE: Record<string, string> = {
  belum_bayar: "bg-secondary",
  menunggu_verifikasi: "bg-warning text-dark",
  lunas: "bg-success",
  terlambat: "bg-danger",
};

const STATUS_LABEL: Record<string, string> = {
  belum_bayar: "Belum Bayar",
  menunggu_verifikasi: "Menunggu Verifikasi",
  lunas: "Lunas",
  terlambat: "Terlambat",
};

export default function TagihanPage() {
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [daftar, setDaftar] = useState<Tagihan[]>([]);
  const [filterStatus, setFilterStatus] = useState("");

  const [gen, setGen] = useState({
    tahunAjaranId: "",
    bulan: String(new Date().getMonth() + 1),
    tahun: String(new Date().getFullYear()),
    nominal: "",
    jatuhTempo: "",
  });
  const [genError, setGenError] = useState("");
  const [genResult, setGenResult] = useState<{ dibuat: number; dilewati: number } | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  async function muatTahunAjaran() {
    const res = await fetch("/api/tahun-ajaran");
    if (res.ok) {
      const data: TahunAjaran[] = await res.json();
      setTahunAjaranList(data);
      const aktif = data.find((t) => t.aktif);
      if (aktif) setGen((g) => ({ ...g, tahunAjaranId: aktif.id }));
    }
  }

  async function muatTagihan() {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/tagihan?${params.toString()}`);
    if (res.ok) setDaftar(await res.json());
  }

  useEffect(() => {
    muatTahunAjaran();
  }, []);

  useEffect(() => {
    muatTagihan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenError("");
    setGenResult(null);
    setGenLoading(true);

    const res = await fetch("/api/tagihan/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gen),
    });

    const data = await res.json();
    setGenLoading(false);

    if (!res.ok) {
      setGenError(data.error || "Gagal generate tagihan");
      return;
    }

    setGenResult(data);
    muatTagihan();
  }

  async function handleVerifikasi(id: string) {
    if (!confirm("Tandai tagihan ini LUNAS (verifikasi manual)?")) return;
    const res = await fetch(`/api/tagihan/${id}/verifikasi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metode: "transfer_bank" }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Gagal verifikasi");
      return;
    }
    muatTagihan();
  }

  return (
    <div className="container-fluid p-4">
      <h1 className="h4 mb-4">Kelola Tagihan</h1>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h6 mb-3">Generate Tagihan Bulanan</h2>
          {genError && <div className="alert alert-danger py-2">{genError}</div>}
          {genResult && (
            <div className="alert alert-success py-2">
              Berhasil: {genResult.dibuat} tagihan dibuat, {genResult.dilewati} dilewati (udah ada).
            </div>
          )}
          <form onSubmit={handleGenerate} className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Tahun Ajaran</label>
              <select
                className="form-select"
                value={gen.tahunAjaranId}
                onChange={(e) => setGen({ ...gen, tahunAjaranId: e.target.value })}
                required
              >
                <option value="">- Pilih -</option>
                {tahunAjaranList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama} {t.aktif ? "(aktif)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Bulan</label>
              <select
                className="form-select"
                value={gen.bulan}
                onChange={(e) => setGen({ ...gen, bulan: e.target.value })}
              >
                {BULAN_LABEL.slice(1).map((b, i) => (
                  <option key={i + 1} value={i + 1}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Tahun</label>
              <input
                type="number"
                className="form-control"
                value={gen.tahun}
                onChange={(e) => setGen({ ...gen, tahun: e.target.value })}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Nominal</label>
              <input
                type="number"
                className="form-control"
                value={gen.nominal}
                onChange={(e) => setGen({ ...gen, nominal: e.target.value })}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Jatuh Tempo</label>
              <input
                type="date"
                className="form-control"
                value={gen.jatuhTempo}
                onChange={(e) => setGen({ ...gen, jatuhTempo: e.target.value })}
                required
              />
            </div>
            <div className="col-md-1">
              <button className="btn btn-primary w-100" disabled={genLoading}>
                {genLoading ? "..." : "Generate"}
              </button>
            </div>
          </form>
          <small className="text-muted d-block mt-2">
            Otomatis skip siswa yang udah punya tagihan di bulan/tahun/tahun-ajaran yang sama.
          </small>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h6 mb-0">Daftar Tagihan</h2>
        <select
          className="form-select w-auto"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABEL).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <table className="table table-bordered bg-white">
        <thead>
          <tr>
            <th>Siswa</th>
            <th>NIS</th>
            <th>Periode</th>
            <th>Nominal</th>
            <th>Jatuh Tempo</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {daftar.map((t) => (
            <tr key={t.id}>
              <td>{t.siswa.namaLengkap}</td>
              <td>{t.siswa.nis}</td>
              <td>{BULAN_LABEL[t.bulan]} {t.tahun}</td>
              <td>Rp {t.nominal.toLocaleString("id-ID")}</td>
              <td>{new Date(t.jatuhTempo).toLocaleDateString("id-ID")}</td>
              <td>
                <span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
              </td>
              <td>
                {t.status !== "lunas" && (
                  <button className="btn btn-sm btn-outline-success" onClick={() => handleVerifikasi(t.id)}>
                    Verifikasi Lunas
                  </button>
                )}
              </td>
            </tr>
          ))}
          {daftar.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center text-muted">
                Belum ada data tagihan.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
