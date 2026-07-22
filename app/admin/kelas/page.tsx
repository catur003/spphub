"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type Kelas = {
  id: string;
  namaKelas: string;
  tingkat: number;
  _count: { siswa: number };
};

/** Warna avatar deterministik */
const KELAS_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];
function kelasColor(nama: string): string {
  let h = 0;
  for (let i = 0; i < nama.length; i++) h = (h * 31 + nama.charCodeAt(i)) & 0xffff;
  return KELAS_COLORS[h % KELAS_COLORS.length];
}

export default function KelasPage() {
  const [daftar, setDaftar] = useState<Kelas[]>([]);
  const [editKelas, setEditKelas] = useState<Kelas | null>(null);
  const [namaKelas, setNamaKelas] = useState("");
  const [tingkat, setTingkat] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const { confirm, alertMsg, modal } = useConfirmModal();

  async function muatData() {
    const res = await fetch("/api/kelas");
    if (res.ok) setDaftar(await res.json());
  }

  useEffect(() => { muatData(); }, []);

  function tampilToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ——— Tambah ———
  async function handleTambah(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namaKelas, tingkat }),
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Gagal menyimpan kelas (Status ${res.status})`);
        return;
      }
      setNamaKelas(""); setTingkat(""); setError("");
      tampilToast("Kelas berhasil ditambahkan");
      muatData();
    } catch (err: any) {
      setLoading(false);
      setError("Gagal terhubung ke server: " + err.message);
    }
  }

  // ——— Edit (modal) ———
  function bukaEdit(k: Kelas) {
    setEditKelas(k);
    setError("");
  }

  function tutupEdit() {
    setEditKelas(null);
    setError("");
  }

  async function handleSimpanEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editKelas) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/kelas/${editKelas.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namaKelas: editKelas.namaKelas, tingkat: editKelas.tingkat }),
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Gagal memperbarui kelas (Status ${res.status})`);
        return;
      }
      tutupEdit();
      tampilToast("Kelas berhasil diperbarui");
      muatData();
    } catch (err: any) {
      setLoading(false);
      setError("Gagal terhubung ke server: " + err.message);
    }
  }

  // ——— Hapus ———
  async function handleDelete(id: string) {
    if (!(await confirm("Hapus kelas ini? Siswa yang terdaftar tidak akan ikut terhapus.", { confirmLabel: "Ya, Hapus" }))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/kelas/${id}`, { method: "DELETE" });
      setDeletingId(null);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        await alertMsg(data.error || `Gagal menghapus kelas (Status ${res.status})`);
        return;
      }
      tampilToast("Kelas berhasil dihapus");
      muatData();
    } catch (err: any) {
      setDeletingId(null);
      await alertMsg("Gagal terhubung ke server: " + err.message);
    }
  }


  return (
    <>
      <style>{`
        .kelas-badge {
          display: inline-flex; align-items: center; justify-content: center;
          width: 38px; height: 38px; border-radius: 10px;
          font-size: 0.78rem; font-weight: 700; color: white; flex-shrink: 0;
        }
        .kelas-table th {
          font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--ink-500); font-weight: 600; background: var(--surface);
          padding: 0.65rem 0.9rem; border-bottom: 2px solid var(--border-soft);
        }
        .kelas-table td { padding: 0.7rem 0.9rem; vertical-align: middle; font-size: 0.88rem; }
        .kelas-table tbody tr { transition: background 0.12s ease; }
        .kelas-table tbody tr:hover { background: #f5f7ff; }
        .toast-snack {
          position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
          display: flex; align-items: center; gap: 10px;
          padding: 0.75rem 1.1rem; border-radius: 12px;
          font-size: 0.88rem; font-weight: 500;
          box-shadow: 0 8px 24px rgba(15,23,42,.18);
          animation: toastIn 0.28s cubic-bezier(0.34,1.56,0.64,1);
        }
        .toast-snack--success { background:#fff; border-left:4px solid #10b981; color:#065f46; }
        .toast-snack--error   { background:#fff; border-left:4px solid #ef4444; color:#991b1b; }
        @keyframes toastIn {
          from { opacity:0; transform:translateY(12px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .modal-edit .modal-content { border:none; border-radius:18px; box-shadow:0 24px 60px rgba(15,23,42,.18); }
        .modal-edit .modal-header { background:linear-gradient(135deg,#4f46e5,#7c3aed); border-radius:18px 18px 0 0; padding:1.1rem 1.4rem; border-bottom:none; }
        .modal-edit .modal-title  { color:#fff; font-weight:700; font-size:1.05rem; }
        .modal-edit .btn-close     { filter:invert(1) brightness(2); opacity:.85; }
        .modal-edit .modal-body    { padding:1.4rem; }
        .modal-edit .modal-footer  { border-top:1px solid var(--border-soft); padding:0.9rem 1.4rem; border-radius:0 0 18px 18px; }
        .card-tambah .card-header { background:linear-gradient(135deg,#4f46e5,#7c3aed); border-radius:14px 14px 0 0; padding:0.9rem 1.1rem; border-bottom:none; }
        .card-tambah .card-header h2 { color:#fff; font-size:0.92rem; margin:0; font-weight:700; }
        .siswa-count-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: #eef2ff; color: #4338ca; border-radius: 20px;
          padding: 3px 10px; font-size: 0.78rem; font-weight: 600;
        }
        .tingkat-badge {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 8px;
          background: #f0fdf4; color: #15803d;
          font-size: 0.8rem; font-weight: 700;
        }
      `}</style>

      {toast && (
        <div className={`toast-snack toast-snack--${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div className="container-fluid p-4">
        <div className="mb-4">
          <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Data Kelas</h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>{daftar.length} kelas terdaftar</p>
        </div>

        <div className="row">
          {/* Form Tambah */}
          <div className="col-lg-4 mb-4">
            <div className="card card-tambah">
              <div className="card-header"><h2>✚ Tambah Kelas</h2></div>
              <div className="card-body">
                {error && !editKelas && <div className="alert alert-danger py-2 small">{error}</div>}
                <form onSubmit={handleTambah}>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Nama Kelas</label>
                    <input className="form-control" value={namaKelas}
                      onChange={(e) => setNamaKelas(e.target.value)} required
                      placeholder="Contoh: 7A, 8B, 9C" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tingkat</label>
                    <select className="form-select" value={tingkat}
                      onChange={(e) => setTingkat(e.target.value)} required>
                      <option value="">— Pilih Tingkat —</option>
                      <option value="7">7 (Kelas 7)</option>
                      <option value="8">8 (Kelas 8)</option>
                      <option value="9">9 (Kelas 9)</option>
                    </select>
                  </div>
                  <button className="btn btn-primary w-100" disabled={loading}>
                    {loading
                      ? <><span className="spinner-border spinner-border-sm me-1" />Menyimpan...</>
                      : "Tambah Kelas"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Tabel Kelas */}
          <div className="col-lg-8">
            <div className="card p-0 overflow-hidden">
              <div className="table-responsive">
                <table className="table kelas-table mb-0">
                  <thead>
                    <tr>
                      <th>Kelas</th>
                      <th>Tingkat</th>
                      <th>Jumlah Siswa</th>
                      <th style={{ width: 120 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftar.map((k) => (
                      <tr key={k.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="kelas-badge" style={{ background: kelasColor(k.namaKelas) }}>
                              {k.namaKelas.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="fw-semibold">{k.namaKelas}</span>
                          </div>
                        </td>
                        <td><span className="tingkat-badge">{k.tingkat}</span></td>
                        <td>
                          <span className="siswa-count-badge">
                            👥 {k._count.siswa} siswa
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8 }}
                              onClick={() => bukaEdit(k)}>Edit</button>
                            <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 8 }}
                              disabled={deletingId === k.id}
                              onClick={() => handleDelete(k.id)}>
                              {deletingId === k.id
                                ? <span className="spinner-border spinner-border-sm" />
                                : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {daftar.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-5">
                          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🏫</div>
                          Belum ada data kelas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edit Kelas */}
      {editKelas && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block modal-edit" tabIndex={-1} role="dialog" onClick={tutupEdit}>
            <div className="modal-dialog modal-dialog-centered" role="document"
              onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <div className="d-flex align-items-center gap-3">
                    <div className="kelas-badge" style={{ background: kelasColor(editKelas.namaKelas) }}>
                      {editKelas.namaKelas.slice(0, 2).toUpperCase()}
                    </div>
                    <h5 className="modal-title">Edit Kelas</h5>
                  </div>
                  <button type="button" className="btn-close" onClick={tutupEdit} />
                </div>
                <form onSubmit={handleSimpanEdit}>
                  <div className="modal-body">
                    {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Nama Kelas</label>
                      <input className="form-control" value={editKelas.namaKelas}
                        onChange={(e) => setEditKelas({ ...editKelas, namaKelas: e.target.value })}
                        required />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-semibold">Tingkat</label>
                      <select className="form-select" value={editKelas.tingkat}
                        onChange={(e) => setEditKelas({ ...editKelas, tingkat: Number(e.target.value) })}
                        required>
                        <option value={7}>7 (Kelas 7)</option>
                        <option value={8}>8 (Kelas 8)</option>
                        <option value={9}>9 (Kelas 9)</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={tutupEdit}>Batal</button>
                    <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                      {loading
                        ? <><span className="spinner-border spinner-border-sm me-1" />Menyimpan...</>
                        : "💾 Simpan Perubahan"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {modal}
    </>
  );
}
