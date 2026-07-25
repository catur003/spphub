"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type Utang = {
  id: string;
  namaPegawai: string;
  jabatan: string | null;
  nominalPinjaman: number;
  nominalTerbayar: number;
  status: string;
  tanggalPinjam: string;
  keterangan: string | null;
};

export default function UtangPegawaiPage() {
  const [daftar, setDaftar] = useState<Utang[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [form, setForm] = useState({
    namaPegawai: "",
    jabatan: "",
    nominalPinjaman: "",
    tanggalPinjam: new Date().toISOString().split("T")[0],
    keterangan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { confirm, alertMsg, modal } = useConfirmModal();

  async function muatData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/utang-pegawai?${params.toString()}`);
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
  }, [q, statusFilter]);

  async function handleTambah(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/utang-pegawai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setError(data.error || "Gagal mencatat pinjaman pegawai");
        return;
      }

      setForm({
        namaPegawai: "",
        jabatan: "",
        nominalPinjaman: "",
        tanggalPinjam: new Date().toISOString().split("T")[0],
        keterangan: "",
      });
      await alertMsg("🎉 Pinjaman kasbon pegawai berhasil dicatat!");
      muatData();
    } catch (err: any) {
      setSubmitting(false);
      setError("Gagal terhubung ke server: " + err.message);
    }
  }

  async function handleBayarLunas(id: string, nama: string) {
    if (!(await confirm(`Tandai pinjaman kasbon atas nama "${nama}" sebagai LUNAS?`, { confirmLabel: "Ya, Tandai Lunas" }))) return;
    try {
      const res = await fetch(`/api/utang-pegawai/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tandaiLunas: true }),
      });
      if (res.ok) {
        await alertMsg(`✅ Kasbon atas nama ${nama} berhasil dilunasi!`);
        muatData();
      }
    } catch (err: any) {
      await alertMsg("Gagal: " + err.message);
    }
  }

  async function handleHapus(id: string, nama: string) {
    if (!(await confirm(`Hapus catatan kasbon atas nama "${nama}"?`, { confirmLabel: "Ya, Hapus" }))) return;
    try {
      const res = await fetch(`/api/utang-pegawai/${id}`, { method: "DELETE" });
      if (res.ok) {
        await alertMsg("Catatan kasbon berhasil dihapus.");
        muatData();
      }
    } catch (err: any) {
      await alertMsg("Gagal menghapus: " + err.message);
    }
  }

  const totalSisaKasbon = daftar.reduce((acc, item) => acc + Math.max(0, item.nominalPinjaman - item.nominalTerbayar), 0);
  const pegawaiAktifCount = daftar.filter((item) => item.status === "aktif").length;

  return (
    <>
      {modal}
      <div className="container-fluid p-4">
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>💳 Kelola Utang Pegawai (Kasbon Staf & Guru)</h1>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
              Pencatatan Pinjaman Kasbon Guru dan Staf Sekolah beserta Pengembalian & Pelunasan.
            </p>
          </div>
        </div>

        <div className="row g-4">
          {/* Form Tambah Kasbon */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
              <div className="card-header bg-dark text-white p-3" style={{ borderRadius: "16px 16px 0 0" }}>
                <h2 className="h6 mb-0 fw-bold">✚ Catat Pinjaman / Kasbon Baru</h2>
              </div>
              <div className="card-body p-4">
                {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                <form onSubmit={handleTambah}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nama Pegawai / Guru</label>
                    <input
                      className="form-control"
                      value={form.namaPegawai}
                      onChange={(e) => setForm({ ...form, namaPegawai: e.target.value })}
                      placeholder="Contoh: Pak Budi Santoso"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Jabatan (Opsional)</label>
                    <input
                      className="form-control"
                      value={form.jabatan}
                      onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                      placeholder="Contoh: Guru Matematika / Staf TU"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nominal Pinjaman (Rp)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted fw-semibold">Rp</span>
                      <input
                        type="number"
                        className="form-control fw-bold text-dark"
                        value={form.nominalPinjaman}
                        onChange={(e) => setForm({ ...form, nominalPinjaman: e.target.value })}
                        placeholder="Contoh: 500000"
                        min={1}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tanggal Pinjaman</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.tanggalPinjam}
                      onChange={(e) => setForm({ ...form, tanggalPinjam: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Keterangan / Keperluan</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.keterangan}
                      onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                      placeholder="Catatan keperluan pinjaman..."
                    />
                  </div>
                  <button type="submit" className="btn btn-dark w-100 fw-bold py-2 shadow-sm" disabled={submitting}>
                    {submitting ? "Menyimpan..." : "💾 Simpan Kasbon Pegawai"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Tabel Daftar Utang Pegawai */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm p-4 mb-3" style={{ borderRadius: 16 }}>
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div>
                  <h6 className="fw-bold mb-0 text-dark">📋 Daftar Pinjaman Pegawai (Kasbon)</h6>
                  <small className="text-muted">
                    Total Sisa Kasbon: <strong className="text-danger">Rp {totalSisaKasbon.toLocaleString("id-ID")}</strong> ({pegawaiAktifCount} pegawai aktif)
                  </small>
                </div>
                <div className="d-flex gap-2">
                  <input
                    className="form-control form-control-sm"
                    placeholder="🔍 Cari nama pegawai..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <select
                    className="form-select form-select-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Semua Status</option>
                    <option value="aktif">Aktif (Belum Lunas)</option>
                    <option value="lunas">Lunas</option>
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.88rem" }}>
                  <thead className="table-light">
                    <tr>
                      <th>Nama Pegawai</th>
                      <th>Pinjaman Initial</th>
                      <th>Sisa Utang</th>
                      <th>Status</th>
                      <th style={{ width: "1%", whiteSpace: "nowrap", textAlign: "right" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted">Memuat data kasbon...</td>
                      </tr>
                    ) : daftar.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted">Belum ada catatan utang pegawai.</td>
                      </tr>
                    ) : (
                      daftar.map((item) => {
                        const sisa = Math.max(0, item.nominalPinjaman - item.nominalTerbayar);
                        return (
                          <tr key={item.id}>
                            <td>
                              <div className="fw-bold text-dark">{item.namaPegawai}</div>
                              <div className="text-muted small">{item.jabatan || "Pegawai/Guru"} • {new Date(item.tanggalPinjam).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</div>
                            </td>
                            <td className="fw-semibold">Rp {item.nominalPinjaman.toLocaleString("id-ID")}</td>
                            <td className="fw-bold text-danger">Rp {sisa.toLocaleString("id-ID")}</td>
                            <td>
                              {item.status === "lunas" ? (
                                <span className="badge bg-success-subtle text-success px-2 py-1">✓ Lunas</span>
                              ) : (
                                <span className="badge bg-warning-subtle text-warning-emphasis px-2 py-1">⏳ Aktif</span>
                              )}
                            </td>
                            <td className="text-end" style={{ whiteSpace: "nowrap" }}>
                              <div className="d-flex gap-1 justify-content-end align-items-center">
                                {item.status !== "lunas" && (
                                  <button
                                    className="btn btn-sm btn-outline-success rounded-pill px-2 py-1 fw-bold"
                                    style={{ fontSize: "0.75rem" }}
                                    onClick={() => handleBayarLunas(item.id, item.namaPegawai)}
                                  >
                                    ✓ Pelunasan
                                  </button>
                                )}
                                <button
                                  className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fw-bold"
                                  style={{ fontSize: "0.75rem" }}
                                  onClick={() => handleHapus(item.id, item.namaPegawai)}
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
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
