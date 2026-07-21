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
  const [editTahun, setEditTahun] = useState<TahunAjaran | null>(null);
  const [nama, setNama] = useState("");
  const [aktif, setAktif] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const { confirm, alertMsg, modal } = useConfirmModal();

  async function muatData() {
    const res = await fetch("/api/tahun-ajaran");
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
    const res = await fetch("/api/tahun-ajaran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, aktif }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menyimpan");
      return;
    }
    setNama(""); setAktif(false); setError("");
    tampilToast("Tahun ajaran berhasil ditambahkan");
    muatData();
  }

  // ——— Edit Modal ———
  function bukaEdit(t: TahunAjaran) {
    setEditTahun({ ...t });
    setError("");
  }

  function tutupEdit() {
    setEditTahun(null);
    setError("");
  }

  async function handleSimpanEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTahun) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/tahun-ajaran/${editTahun.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: editTahun.nama, aktif: editTahun.aktif }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menyimpan");
      return;
    }
    tutupEdit();
    tampilToast("Tahun ajaran berhasil diperbarui");
    muatData();
  }

  // ——— Hapus ———
  async function handleDelete(id: string) {
    if (!(await confirm("Hapus tahun ajaran ini? Data tagihan yang terhubung tidak bisa dihapus.", { confirmLabel: "Ya, Hapus" }))) return;
    setDeletingId(id);
    const res = await fetch(`/api/tahun-ajaran/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json();
      await alertMsg(data.error || "Gagal menghapus");
      return;
    }
    tampilToast("Tahun ajaran berhasil dihapus");
    muatData();
  }

  return (
    <>
      <style>{`
        .ta-table th {
          font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--ink-500); font-weight: 600; background: var(--surface);
          padding: 0.65rem 0.9rem; border-bottom: 2px solid var(--border-soft);
        }
        .ta-table td { padding: 0.75rem 0.9rem; vertical-align: middle; font-size: 0.88rem; }
        .ta-table tbody tr { transition: background 0.12s ease; }
        .ta-table tbody tr:hover { background: #f5f7ff; }
        .toast-snack-ta {
          position:fixed; bottom:1.5rem; right:1.5rem; z-index:9999;
          display:flex; align-items:center; gap:10px;
          padding:0.75rem 1.1rem; border-radius:12px;
          font-size:0.88rem; font-weight:500;
          box-shadow:0 8px 24px rgba(15,23,42,.18);
          animation:toastInTA 0.28s cubic-bezier(0.34,1.56,0.64,1);
        }
        .toast-snack-ta--success { background:#fff; border-left:4px solid #10b981; color:#065f46; }
        .toast-snack-ta--error   { background:#fff; border-left:4px solid #ef4444; color:#991b1b; }
        @keyframes toastInTA {
          from { opacity:0; transform:translateY(12px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .modal-ta .modal-content { border:none; border-radius:18px; box-shadow:0 24px 60px rgba(15,23,42,.18); }
        .modal-ta .modal-header { background:linear-gradient(135deg,#4f46e5,#7c3aed); border-radius:18px 18px 0 0; padding:1.1rem 1.4rem; border-bottom:none; }
        .modal-ta .modal-title  { color:#fff; font-weight:700; font-size:1.05rem; }
        .modal-ta .btn-close     { filter:invert(1) brightness(2); opacity:.85; }
        .modal-ta .modal-body    { padding:1.4rem; }
        .modal-ta .modal-footer  { border-top:1px solid var(--border-soft); padding:0.9rem 1.4rem; border-radius:0 0 18px 18px; }
        .card-tambah-ta .card-header { background:linear-gradient(135deg,#4f46e5,#7c3aed); border-radius:14px 14px 0 0; padding:0.9rem 1.1rem; border-bottom:none; }
        .card-tambah-ta .card-header h2 { color:#fff; font-size:0.92rem; margin:0; font-weight:700; }
        .badge-aktif    { background:#dcfce7; color:#15803d; padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:600; }
        .badge-nonaktif { background:#f3f4f6; color:#6b7280; padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:600; }
        .ta-icon {
          width:38px; height:38px; border-radius:10px; flex-shrink:0;
          display:inline-flex; align-items:center; justify-content:center;
          background: linear-gradient(135deg,#eef2ff,#e0e7ff);
          font-size:1rem;
        }
        .aktif-toggle-row {
          display:flex; align-items:center; justify-content:space-between;
          padding:0.75rem 1rem; border-radius:10px;
          border:1.5px solid var(--border-soft); cursor:pointer;
          transition:border-color 0.15s ease, background 0.15s ease;
        }
        .aktif-toggle-row:has(input:checked) {
          border-color:#6366f1; background:#eef2ff;
        }
      `}</style>

      {toast && (
        <div className={`toast-snack-ta toast-snack-ta--${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div className="container-fluid p-4">
        <div className="mb-4">
          <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Tahun Ajaran</h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>{daftar.length} tahun ajaran terdaftar</p>
        </div>

        <div className="row">
          {/* Form Tambah */}
          <div className="col-lg-4 mb-4">
            <div className="card card-tambah-ta">
              <div className="card-header"><h2>✚ Tambah Tahun Ajaran</h2></div>
              <div className="card-body">
                {error && !editTahun && <div className="alert alert-danger py-2 small">{error}</div>}
                <form onSubmit={handleTambah}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nama Tahun Ajaran</label>
                    <input className="form-control" value={nama}
                      onChange={(e) => setNama(e.target.value)} required
                      placeholder="Contoh: 2025/2026" />
                  </div>
                  <div className="mb-3">
                    <label className="aktif-toggle-row">
                      <div>
                        <div className="fw-semibold" style={{ fontSize: "0.88rem" }}>Jadikan Aktif</div>
                        <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                          Hanya satu tahun ajaran yang bisa aktif sekaligus
                        </div>
                      </div>
                      <input type="checkbox" className="form-check-input ms-2"
                        checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
                    </label>
                  </div>
                  <button className="btn btn-primary w-100" disabled={loading}>
                    {loading
                      ? <><span className="spinner-border spinner-border-sm me-1" />Menyimpan...</>
                      : "Tambah Tahun Ajaran"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Tabel */}
          <div className="col-lg-8">
            <div className="card p-0 overflow-hidden">
              <div className="table-responsive">
                <table className="table ta-table mb-0">
                  <thead>
                    <tr>
                      <th>Tahun Ajaran</th>
                      <th>Status</th>
                      <th style={{ width: 120 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftar.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="ta-icon">📅</div>
                            <span className="fw-semibold">{t.nama}</span>
                          </div>
                        </td>
                        <td>
                          {t.aktif
                            ? <span className="badge-aktif">✓ Aktif</span>
                            : <span className="badge-nonaktif">Nonaktif</span>}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8 }}
                              onClick={() => bukaEdit(t)}>Edit</button>
                            <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 8 }}
                              disabled={deletingId === t.id}
                              onClick={() => handleDelete(t.id)}>
                              {deletingId === t.id
                                ? <span className="spinner-border spinner-border-sm" />
                                : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {daftar.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-5">
                          <div style={{ fontSize: "2rem", marginBottom: 8 }}>📅</div>
                          Belum ada data tahun ajaran.
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

      {/* Modal Edit Tahun Ajaran */}
      {editTahun && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block modal-ta" tabIndex={-1} role="dialog" onClick={tutupEdit}>
            <div className="modal-dialog modal-dialog-centered" role="document"
              onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Tahun Ajaran</h5>
                  <button type="button" className="btn-close" onClick={tutupEdit} />
                </div>
                <form onSubmit={handleSimpanEdit}>
                  <div className="modal-body">
                    {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Nama Tahun Ajaran</label>
                      <input className="form-control" value={editTahun.nama}
                        onChange={(e) => setEditTahun({ ...editTahun, nama: e.target.value })}
                        required placeholder="Contoh: 2025/2026" />
                    </div>
                    <div className="mb-2">
                      <label className="aktif-toggle-row">
                        <div>
                          <div className="fw-semibold" style={{ fontSize: "0.88rem" }}>Jadikan Aktif</div>
                          <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                            Hanya satu tahun ajaran yang bisa aktif sekaligus
                          </div>
                        </div>
                        <input type="checkbox" className="form-check-input ms-2"
                          checked={editTahun.aktif}
                          onChange={(e) => setEditTahun({ ...editTahun, aktif: e.target.checked })} />
                      </label>
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
