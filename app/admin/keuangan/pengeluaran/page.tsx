"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import { IconSearch } from "@/components/admin/icons";

type Pengeluaran = {
  id: string;
  judul: string;
  kategori: string;
  nominal: number;
  tanggal: string;
  penanggungJawab: string | null;
  buktiUrl: string | null;
  keterangan: string | null;
};

const KATEGORI_OPTIONS = [
  "Gaji & Honor Guru/Staf",
  "Operasional Listrik & Air",
  "Internet & Telekomunikasi",
  "Pembelian ATK & Inventaris",
  "Pemeliharaan Gedung & Fasilitas",
  "Kegiatan Sekolah / Event",
  "Lain-lain",
];

export default function PengeluaranPage() {
  const [daftar, setDaftar] = useState<Pengeluaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");

  const [form, setForm] = useState({
    judul: "",
    kategori: "Operasional Listrik & Air",
    nominal: "",
    tanggal: new Date().toISOString().split("T")[0],
    penanggungJawab: "",
    buktiUrl: "",
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
      const res = await fetch(`/api/pengeluaran?${params.toString()}`);
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
      const res = await fetch("/api/pengeluaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setError(data.error || "Gagal mencatat pengeluaran");
        return;
      }

      setForm({
        judul: "",
        kategori: "Operasional Listrik & Air",
        nominal: "",
        tanggal: new Date().toISOString().split("T")[0],
        penanggungJawab: "",
        buktiUrl: "",
        keterangan: "",
      });
      await alertMsg("🎉 Pengeluaran berhasil dicatat ke sistem!");
      muatData();
    } catch (err: any) {
      setSubmitting(false);
      setError("Gagal terhubung ke server: " + err.message);
    }
  }

  const totalPengeluaran = daftar.reduce((acc, curr) => acc + curr.nominal, 0);

  return (
    <>
      {modal}
      <div className="container-fluid p-4">
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>💸 Kelola Pengeluaran Kas Sekolah</h1>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
              Pencatatan Beban Operational, Gaji Guru, Listrik, Pembelian Inventaris & Biaya Kegiatan.
            </p>
          </div>
        </div>

        <div className="row g-4">
          {/* Form Catat Pengeluaran */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
              <div className="card-header bg-danger text-white p-3" style={{ borderRadius: "16px 16px 0 0" }}>
                <h2 className="h6 mb-0 fw-bold">✚ Catat Pengeluaran Baru</h2>
              </div>
              <div className="card-body p-4">
                {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                <form onSubmit={handleTambah}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Judul Pengeluaran</label>
                    <input
                      className="form-control"
                      value={form.judul}
                      onChange={(e) => setForm({ ...form, judul: e.target.value })}
                      placeholder="Contoh: Tagihan Listrik PLN Bulan Juli"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Kategori Pengeluaran</label>
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
                    <label className="form-label small fw-semibold">Nominal Pengeluaran (Rp)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted fw-semibold">Rp</span>
                      <input
                        type="number"
                        className="form-control fw-bold text-danger"
                        value={form.nominal}
                        onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                        placeholder="Contoh: 1250000"
                        min={1}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tanggal Pengeluaran</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.tanggal}
                      onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Penanggung Jawab (Opsional)</label>
                    <input
                      className="form-control"
                      value={form.penanggungJawab}
                      onChange={(e) => setForm({ ...form, penanggungJawab: e.target.value })}
                      placeholder="Nama Staf / Bendahara"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Link Foto / Nota Bukti (Opsional)</label>
                    <input
                      className="form-control"
                      value={form.buktiUrl}
                      onChange={(e) => setForm({ ...form, buktiUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Keterangan / Catatan</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.keterangan}
                      onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                      placeholder="Detail penggunaan dana..."
                    />
                  </div>
                  <button type="submit" className="btn btn-danger w-100 fw-bold py-2 shadow-sm" disabled={submitting}>
                    {submitting ? "Menyimpan..." : "💾 Simpan Pengeluaran"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Tabel Daftar Pengeluaran */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm p-4 mb-3" style={{ borderRadius: 16 }}>
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div>
                  <h6 className="fw-bold mb-0 text-dark">📋 Riwayat Pengeluaran Kas</h6>
                  <small className="text-muted">Total: <strong>Rp {totalPengeluaran.toLocaleString("id-ID")}</strong> ({daftar.length} transaksi)</small>
                </div>
                <div className="d-flex gap-2">
                  <input
                    className="form-control form-control-sm"
                    placeholder="🔍 Cari pengeluaran..."
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
                      <th>Pengeluaran</th>
                      <th>Kategori</th>
                      <th>Tanggal</th>
                      <th>Nominal</th>
                      <th>PJ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted">Memuat data pengeluaran...</td>
                      </tr>
                    ) : daftar.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted">Belum ada catatan pengeluaran kas.</td>
                      </tr>
                    ) : (
                      daftar.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="fw-bold text-dark">{item.judul}</div>
                            {item.keterangan && <div className="text-muted small">{item.keterangan}</div>}
                            {item.buktiUrl && (
                              <a href={item.buktiUrl} target="_blank" rel="noreferrer" className="badge bg-light text-primary border me-1 text-decoration-none">
                                📎 Bukti Nota
                              </a>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-danger-subtle text-danger border px-2 py-1">
                              {item.kategori}
                            </span>
                          </td>
                          <td>{new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                          <td className="fw-bold text-danger">Rp {item.nominal.toLocaleString("id-ID")}</td>
                          <td>{item.penanggungJawab || "-"}</td>
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
