"use client";

import { useEffect, useState } from "react";

type Kelas = { id: string; namaKelas: string };
type Siswa = {
  id: string;
  nis: string;
  nisn: string | null;
  namaLengkap: string;
  jenisKelamin: "L" | "P";
  status: string;
  kelas: Kelas | null;
  akun: { email: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  aktif: "Aktif",
  lulus: "Lulus",
  pindah: "Pindah",
  nonaktif: "Nonaktif",
};

type HasilImport = {
  total: number;
  berhasil: number;
  gagal: { baris: number; alasan?: string; nama?: string }[];
};

const FORM_KOSONG = {
  namaLengkap: "",
  nis: "",
  nisn: "",
  jenisKelamin: "L",
  kelasId: "",
  namaWali: "",
  kontakWali: "",
  status: "aktif",
  buatAkun: false,
  email: "",
  password: "",
};

export default function SiswaPage() {
  const [daftar, setDaftar] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(FORM_KOSONG);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [fileImport, setFileImport] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [hasilImport, setHasilImport] = useState<HasilImport | null>(null);
  const [importError, setImportError] = useState("");

  async function muatData() {
    const res = await fetch(`/api/siswa${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (res.ok) setDaftar(await res.json());
  }

  async function muatKelas() {
    const res = await fetch("/api/kelas");
    if (res.ok) setKelasList(await res.json());
  }

  useEffect(() => {
    muatKelas();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(muatData, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function resetForm() {
    setForm(FORM_KOSONG);
    setEditId(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(editId ? `/api/siswa/${editId}` : "/api/siswa", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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

  function handleEdit(s: Siswa) {
    setEditId(s.id);
    setForm({
      ...FORM_KOSONG,
      namaLengkap: s.namaLengkap,
      nis: s.nis,
      nisn: s.nisn || "",
      jenisKelamin: s.jenisKelamin,
      kelasId: s.kelas?.id || "",
      status: s.status,
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus siswa ini? (kalau punya riwayat tagihan, ubah status nonaktif aja)")) return;
    const res = await fetch(`/api/siswa/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Gagal menghapus");
      return;
    }
    muatData();
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!fileImport) return;
    setImportError("");
    setHasilImport(null);
    setImportLoading(true);

    const form = new FormData();
    form.append("file", fileImport);

    const res = await fetch("/api/siswa/import", { method: "POST", body: form });
    const data = await res.json();
    setImportLoading(false);

    if (!res.ok) {
      setImportError(data.error || "Gagal import");
      return;
    }

    setHasilImport(data);
    setFileImport(null);
    muatData();
  }

  return (
    <div className="container-fluid p-4">
      <h1 className="h4 mb-4">Data Siswa</h1>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h6 mb-3">Import / Export Excel</h2>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <a className="btn btn-sm btn-outline-secondary" href="/api/siswa/template">
              Download Template
            </a>
            <a className="btn btn-sm btn-outline-secondary" href="/api/siswa/export">
              Export Data Siswa (.xlsx)
            </a>
          </div>
          <form onSubmit={handleImport} className="d-flex gap-2 align-items-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="form-control"
              style={{ maxWidth: 320 }}
              onChange={(e) => setFileImport(e.target.files?.[0] || null)}
            />
            <button className="btn btn-sm btn-primary" disabled={!fileImport || importLoading}>
              {importLoading ? "Mengimpor..." : "Import"}
            </button>
          </form>
          {importError && <div className="alert alert-danger py-2 mt-3 mb-0">{importError}</div>}
          {hasilImport && (
            <div className="mt-3">
              <div className="alert alert-success py-2 mb-2">
                {hasilImport.berhasil} dari {hasilImport.total} baris berhasil diimport.
              </div>
              {hasilImport.gagal.length > 0 && (
                <div className="table-responsive" style={{ maxHeight: 240, overflowY: "auto" }}>
                  <table className="table table-sm table-bordered mb-0">
                    <thead>
                      <tr>
                        <th>Baris</th>
                        <th>Nama</th>
                        <th>Alasan Gagal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasilImport.gagal.map((g, i) => (
                        <tr key={i}>
                          <td>{g.baris}</td>
                          <td>{g.nama || "-"}</td>
                          <td>{g.alasan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card">
            <div className="card-body">
              <h2 className="h6 mb-3">{editId ? "Edit Siswa" : "Tambah Siswa"}</h2>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    className="form-control"
                    value={form.namaLengkap}
                    onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })}
                    required
                  />
                </div>
                <div className="row">
                  <div className="col-6 mb-2">
                    <label className="form-label">NIS</label>
                    <input
                      className="form-control"
                      value={form.nis}
                      onChange={(e) => setForm({ ...form, nis: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-6 mb-2">
                    <label className="form-label">NISN</label>
                    <input
                      className="form-control"
                      value={form.nisn}
                      onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label">Jenis Kelamin</label>
                  <select
                    className="form-select"
                    value={form.jenisKelamin}
                    onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })}
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Kelas</label>
                  <select
                    className="form-select"
                    value={form.kelasId}
                    onChange={(e) => setForm({ ...form, kelasId: e.target.value })}
                  >
                    <option value="">- Belum ada kelas -</option>
                    {kelasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.namaKelas}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {Object.entries(STATUS_LABEL).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {!editId && (
                  <div className="mb-3 border rounded p-2">
                    <div className="form-check mb-2">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="buatAkun"
                        checked={form.buatAkun}
                        onChange={(e) => setForm({ ...form, buatAkun: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="buatAkun">
                        Buat akun login siswa sekalian
                      </label>
                    </div>
                    {form.buatAkun && (
                      <>
                        <input
                          type="email"
                          className="form-control mb-2"
                          placeholder="Email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          required
                        />
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Password"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          required
                        />
                      </>
                    )}
                  </div>
                )}

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
          <input
            className="form-control mb-3"
            placeholder="Cari nama / NIS / NISN..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <table className="table table-bordered bg-white">
            <thead>
              <tr>
                <th>Nama</th>
                <th>NIS</th>
                <th>Kelas</th>
                <th>Status</th>
                <th>Akun</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((s) => (
                <tr key={s.id}>
                  <td>{s.namaLengkap}</td>
                  <td>{s.nis}</td>
                  <td>{s.kelas?.namaKelas || "-"}</td>
                  <td>{STATUS_LABEL[s.status]}</td>
                  <td>{s.akun ? s.akun.email : <span className="text-muted">Belum ada</span>}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(s)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.id)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {daftar.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted">
                    Belum ada data siswa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
