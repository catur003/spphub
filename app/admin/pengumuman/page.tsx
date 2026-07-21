"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type Pengumuman = {
  id: string;
  judul: string;
  isi: string;
  createdAt: string;
};

export default function PengumumanPage() {
  const [daftar, setDaftar] = useState<Pengumuman[]>([]);
  const [editItem, setEditItem] = useState<Pengumuman | null>(null);
  
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const { confirm, alertMsg, modal } = useConfirmModal();

  async function muatData() {
    const res = await fetch("/api/pengumuman");
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
    setError(""); setLoading(true);
    const res = await fetch("/api/pengumuman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ judul, isi }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menyimpan pengumuman");
      return;
    }
    setJudul(""); setIsi(""); setError("");
    tampilToast("Pengumuman berhasil di-broadcast!");
    muatData();
  }

  // ——— Edit Modal ———
  function bukaEdit(t: Pengumuman) {
    setEditItem({ ...t });
    setError("");
  }
  function tutupEdit() {
    setEditItem(null);
    setError("");
  }
  async function handleSimpanEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setError(""); setLoading(true);
    const res = await fetch(`/api/pengumuman/${editItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ judul: editItem.judul, isi: editItem.isi }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal mengupdate pengumuman");
      return;
    }
    tutupEdit();
    tampilToast("Pengumuman berhasil diperbarui");
    muatData();
  }

  // ——— Hapus ———
  async function handleDelete(id: string) {
    if (!(await confirm("Hapus pengumuman ini? Siswa tidak akan bisa melihatnya lagi.", { confirmLabel: "Ya, Hapus" }))) return;
    setDeletingId(id);
    const res = await fetch(`/api/pengumuman/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json();
      await alertMsg(data.error || "Gagal menghapus");
      return;
    }
    tampilToast("Pengumuman berhasil ditarik");
    muatData();
  }

  return (
    <>
      <style>{`
        .pg-table th {
          font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--ink-500); font-weight: 600; background: var(--surface);
          padding: 0.65rem 0.9rem; border-bottom: 2px solid var(--border-soft);
        }
        .pg-table td { padding: 0.75rem 0.9rem; vertical-align: middle; font-size: 0.88rem; }
        .toast-snack-pg {
          position:fixed; bottom:1.5rem; right:1.5rem; z-index:9999;
          display:flex; align-items:center; gap:10px;
          padding:0.75rem 1.1rem; border-radius:12px;
          font-size:0.88rem; font-weight:500;
          box-shadow:0 8px 24px rgba(15,23,42,.18);
          animation:toastIn 0.28s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes toastIn {
          from { opacity:0; transform:translateY(12px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>

      {modal}
      {toast && (
        <div className={`toast-snack-pg toast-snack-ta--${toast.type}`}>
          {toast.type === "success" ? "✅" : "⚠️"} {toast.msg}
        </div>
      )}

      <div className="container-fluid p-4">
        <div className="mb-4">
          <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Pengumuman Sekolah</h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>Broadcast informasi penting ke dashboard seluruh siswa</p>
        </div>

        <div className="row">
          {/* Form Tambah */}
          <div className="col-lg-4 mb-4">
            <div className="card card-tambah-ta">
              <div className="card-header bg-primary text-white" style={{ borderRadius: "14px 14px 0 0", borderBottom: "none" }}>
                <h2 className="h6 mb-0 fw-bold">📢 Tulis Pengumuman Baru</h2>
              </div>
              <div className="card-body">
                {error && !editItem && <div className="alert alert-danger py-2 small">{error}</div>}
                <form onSubmit={handleTambah}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Judul Pengumuman</label>
                    <input className="form-control" value={judul}
                      onChange={(e) => setJudul(e.target.value)} required
                      placeholder="Contoh: Pemberitahuan Libur" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Isi Pesan</label>
                    <textarea className="form-control" rows={5} value={isi}
                      onChange={(e) => setIsi(e.target.value)} required
                      placeholder="Tulis pesan lengkap di sini..." />
                  </div>
                  <button className="btn btn-primary w-100 fw-bold" disabled={loading}>
                    {loading ? "Menerbitkan..." : "🚀 Broadcast Sekarang"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Tabel Pengumuman */}
          <div className="col-lg-8">
            <div className="card p-0 overflow-hidden">
              <div className="table-responsive">
                <table className="table pg-table mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: "20%" }}>Tanggal</th>
                      <th style={{ width: "60%" }}>Pengumuman</th>
                      <th style={{ width: "20%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftar.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="fw-semibold text-primary">{new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          <div className="small text-muted">{new Date(p.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</div>
                        </td>
                        <td>
                          <div className="fw-bold" style={{ color: "var(--ink-900)" }}>{p.judul}</div>
                          <div className="text-muted small mt-1" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {p.isi}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-1 justify-content-end">
                            <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8 }}
                              onClick={() => bukaEdit(p)}>Edit</button>
                            <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 8 }}
                              disabled={deletingId === p.id}
                              onClick={() => handleDelete(p.id)}>
                              {deletingId === p.id ? "..." : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {daftar.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-5">
                          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📭</div>
                          Belum ada pengumuman yang diterbitkan.
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

      {/* Modal Edit */}
      {editItem && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} onClick={tutupEdit}>
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content" style={{ border: "none", borderRadius: "18px" }}>
                <div className="modal-header bg-primary text-white" style={{ borderRadius: "18px 18px 0 0" }}>
                  <h5 className="modal-title fw-bold">📝 Edit Pengumuman</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={tutupEdit} />
                </div>
                <form onSubmit={handleSimpanEdit}>
                  <div className="modal-body p-4">
                    {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Judul Pengumuman</label>
                      <input className="form-control" value={editItem.judul}
                        onChange={(e) => setEditItem({ ...editItem, judul: e.target.value })}
                        required />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-semibold">Isi Pesan</label>
                      <textarea className="form-control" rows={5} value={editItem.isi}
                        onChange={(e) => setEditItem({ ...editItem, isi: e.target.value })}
                        required />
                    </div>
                  </div>
                  <div className="modal-footer" style={{ borderTop: "1px solid var(--border-soft)" }}>
                    <button type="button" className="btn btn-outline-secondary" onClick={tutupEdit}>Batal</button>
                    <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                      {loading ? "Menyimpan..." : "💾 Simpan Perubahan"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
