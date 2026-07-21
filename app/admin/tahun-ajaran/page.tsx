"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type TahunAjaran = {
  id: string;
  nama: string;
  aktif: boolean;
};

export default function TahunAjaranPage() {
  const [daftar, setDaftar] = useState<TahunAjaran[]>([]);
  const [nama, setNama] = useState("");
  const [aktif, setAktif] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { confirm, alertMsg, modal } = useConfirmModal();

  async function muatData() {
    const res = await fetch("/api/tahun-ajaran");
    if (res.ok) setDaftar(await res.json());
  }

  useEffect(() => {
    muatData();
  }, []);

  function resetForm() {
    setNama("");
    setAktif(false);
    setEditId(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(editId ? `/api/tahun-ajaran/${editId}` : "/api/tahun-ajaran", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, aktif }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menyimpan");
      return;
    }

    resetForm();
    muatData();
  }

  function handleEdit(t: TahunAjaran) {
    setEditId(t.id);
    setNama(t.nama);
    setAktif(t.aktif);
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Hapus tahun ajaran ini?"))) return;
    const res = await fetch(`/api/tahun-ajaran/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      await alertMsg(data.error || "Gagal menghapus");
      return;
    }
    muatData();
  }

  return (
    <div className="container-fluid p-4">
      <h1 className="h4 mb-4">Tahun Ajaran</h1>

      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card">
            <div className="card-body">
              <h2 className="h6 mb-3">{editId ? "Edit Tahun Ajaran" : "Tambah Tahun Ajaran"}</h2>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label className="form-label">Nama (cth: 2025/2026)</label>
                  <input
                    className="form-control"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="aktifCheck"
                    checked={aktif}
                    onChange={(e) => setAktif(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="aktifCheck">
                    Jadikan tahun ajaran aktif
                  </label>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary" disabled={loading}>
                    {editId ? "Simpan" : "Tambah"}
                  </button>
                  {editId && (
                    <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <table className="table table-bordered bg-white">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((t) => (
                <tr key={t.id}>
                  <td>{t.nama}</td>
                  <td>
                    {t.aktif ? (
                      <span className="badge bg-success">Aktif</span>
                    ) : (
                      <span className="badge bg-secondary">Nonaktif</span>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(t)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(t.id)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {daftar.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted">
                    Belum ada data tahun ajaran.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modal}
    </div>
  );
}
