"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type Kelas = {
  id: string;
  namaKelas: string;
  tingkat: number;
  _count: { siswa: number };
};

export default function KelasPage() {
  const [daftar, setDaftar] = useState<Kelas[]>([]);
  const [namaKelas, setNamaKelas] = useState("");
  const [tingkat, setTingkat] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { confirm, alertMsg, modal } = useConfirmModal();

  async function muatData() {
    const res = await fetch("/api/kelas");
    if (res.ok) setDaftar(await res.json());
  }

  useEffect(() => {
    muatData();
  }, []);

  function resetForm() {
    setNamaKelas("");
    setTingkat("");
    setEditId(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(editId ? `/api/kelas/${editId}` : "/api/kelas", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namaKelas, tingkat }),
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

  function handleEdit(k: Kelas) {
    setEditId(k.id);
    setNamaKelas(k.namaKelas);
    setTingkat(String(k.tingkat));
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Hapus kelas ini?"))) return;
    const res = await fetch(`/api/kelas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      await alertMsg(data.error || "Gagal menghapus");
      return;
    }
    muatData();
  }

  return (
    <div className="container-fluid p-4">
      <h1 className="h4 mb-4">Data Kelas</h1>

      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card">
            <div className="card-body">
              <h2 className="h6 mb-3">{editId ? "Edit Kelas" : "Tambah Kelas"}</h2>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label className="form-label">Nama Kelas</label>
                  <input
                    className="form-control"
                    value={namaKelas}
                    onChange={(e) => setNamaKelas(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Tingkat</label>
                  <input
                    type="number"
                    className="form-control"
                    value={tingkat}
                    onChange={(e) => setTingkat(e.target.value)}
                    required
                  />
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
                <th>Nama Kelas</th>
                <th>Tingkat</th>
                <th>Jumlah Siswa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((k) => (
                <tr key={k.id}>
                  <td>{k.namaKelas}</td>
                  <td>{k.tingkat}</td>
                  <td>{k._count.siswa}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(k)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(k.id)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {daftar.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    Belum ada data kelas.
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
