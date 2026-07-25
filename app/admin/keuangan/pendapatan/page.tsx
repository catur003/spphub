"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import { IconSearch, IconCheck } from "@/components/admin/icons";

type Pendapatan = {
  id: string;
  judul: string;
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan: string | null;
  penerima: string | null;
};

const KATEGORI_OPTIONS = [
  "Uang Pangkal / Gedung",
  "Uang Seragam & Atribut",
  "Buku / LKS",
  "Pendaftaran",
  "Sewa Kantin / Fasilitas",
  "Infak / Sumbangan Sukarela",
  "Kegiatan / Event",
  "Lain-lain",
];

export default function PendapatanPage() {
  const [daftar, setDaftar] = useState<Pendapatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");

  const [form, setForm] = useState({
    judul: "",
    kategori: "Uang Pangkal / Gedung",
    nominal: "",
    tanggal: new Date().toISOString().split("T")[0],
    penerima: "",
    keterangan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { alertMsg, modal } = useConfirmModal();

  async function muatData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (kategoriFilter) params.set("kategori", kategoriFilter);

    try {
      const res = await fetch(`/api/pendapatan?${params.toString()}`);
      if (res.ok) {
        setDaftar(await res.json());
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    muatData();
  }, [q, kategoriFilter]);

  async function handleTambah(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/pendapatan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setError(data.error || "Gagal mencatat pendapatan");
        return;
      }

      setForm({
        judul: "",
        kategori: "Uang Pangkal / Gedung",
        nominal: "",
        tanggal: new Date().toISOString().split("T")[0],
        penerima: "",
        keterangan: "",
      });
      await alertMsg("🎉 Pendapatan berhasil dicatat ke sistem!");
      muatData();
    } catch (err: any) {
      setSubmitting(false);
      setError("Gagal terhubung ke server: " + err.message);
    }
  }

  const totalPendapatan = daftar.reduce((acc, curr) => acc + curr.nominal, 0);

  return (
    <>
      {modal}
      <div className="container-fluid p-4">
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>💵 Kelola Pendapatan Non-SPP</h1>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
              Pencatatan Pemasukan Kas Sekolah dari Uang Gedung, Seragam, Pendaftaran, dan Pemasukan Lainnya.
            </p>
          </div>
        </div>

        <div className="row g-4">
          {/* Form Catat Pendapatan */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
              <div className="card-header bg-primary text-white p-3" style={{ borderRadius: "16px 16px 0 0" }}>
                <h2 className="h6 mb-0 fw-bold">✚ Catat Pemasukan Baru</h2>
              </div>
              <div className="card-body p-4">
                {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                <form onSubmit={handleTambah}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Judul Pemasukan</label>
                    <input
                      className="form-control"
                      value={form.judul}
                      onChange={(e) => setForm({ ...form, judul: e.target.value })}
                      placeholder="Contoh: Uang Seragam & Atribut Siswa A"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Kategori Pemasukan</label>
                    <select
                      className="form-select"
                      value={form.kategori}
                      onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    >
                      {KATEGORI_OPTIONS.map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nominal Pemasukan (Rp)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted fw-semibold">Rp</span>
                      <input
                        type="number"
                        className="form-control fw-bold text-success"
                        value={form.nominal}
                        onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                        placeholder="Contoh: 750000"
                        min={1}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tanggal Tanggal Pemasukan</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.tanggal}
                      onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Penerima / Kasir (Opsional)</label>
                    <input
                      className="form-control"
                      value={form.penerima}
                      onChange={(e) => setForm({ ...form, penerima: e.target.value })}
                      placeholder="Nama Petugas / Kasir"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Keterangan / Catatan</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.keterangan}
                      onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                      placeholder="Catatan tambahan..."
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100 fw-bold py-2 shadow-sm" disabled={submitting}>
                    {submitting ? "Menyimpan..." : "💾 Simpan Pendapatan"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Tabel Daftar Pendapatan */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm p-4 mb-3" style={{ borderRadius: 16 }}>
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div>
                  <h6 className="fw-bold mb-0 text-dark">📋 Riwayat Pemasukan Kas</h6>
                  <small className="text-muted">Total: <strong>Rp {totalPendapatan.toLocaleString("id-ID")}</strong> ({daftar.length} transaksi)</small>
                </div>
                <div className="d-flex gap-2">
                  <input
                    className="form-control form-control-sm"
                    placeholder="🔍 Cari transaksi..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <select
                    className="form-select form-select-sm"
                    value={kategoriFilter}
                    onChange={(e) => setKategoriFilter(e.target.value)}
                  >
                    <option value="">Semua Kategori</option>
                    {KATEGORI_OPTIONS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.88rem" }}>
                  <thead className="table-light">
                    <tr>
                      <th>Pemasukan</th>
                      <th>Kategori</th>
                      <th>Tanggal</th>
                      <th>Nominal</th>
                      <th>Penerima</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted">Memuat data pendapatan...</td>
                      </tr>
                    ) : daftar.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted">Belum ada catatan pendapatan non-SPP.</td>
                      </tr>
                    ) : (
                      daftar.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="fw-bold text-dark">{item.judul}</div>
                            {item.keterangan && <div className="text-muted small">{item.keterangan}</div>}
                          </td>
                          <td>
                            <span className="badge bg-indigo-subtle text-indigo border px-2 py-1" style={{ background: "#e0e7ff", color: "#3730a3" }}>
                              {item.kategori}
                            </span>
                          </td>
                          <td>{new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                          <td className="fw-bold text-success">Rp {item.nominal.toLocaleString("id-ID")}</td>
                          <td>{item.penerima || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
