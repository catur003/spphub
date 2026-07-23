"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type UserAkun = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "petugas";
  createdAt: string;
};

export default function PenggunaPage() {
  const [users, setUsers] = useState<UserAkun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Form Tambah
  const [formTambah, setFormTambah] = useState({
    name: "",
    email: "",
    password: "",
    role: "petugas" as "owner" | "petugas",
  });
  const [loadingTambah, setLoadingTambah] = useState(false);

  // Form Reset Password Modal
  const [resetUser, setResetUser] = useState<UserAkun | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);

  const { confirm, alertMsg, modal } = useConfirmModal();

  async function muatUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    muatUsers();
  }, []);

  function tampilToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleTambah(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoadingTambah(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formTambah),
      });
      setLoadingTambah(false);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Gagal membuat pengguna baru");
        return;
      }
      setFormTambah({ name: "", email: "", password: "", role: "petugas" });
      tampilToast("Pengguna baru berhasil ditambahkan!");
      muatUsers();
    } catch (err: any) {
      setLoadingTambah(false);
      setError("Gagal terhubung ke server: " + err.message);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser) return;
    setLoadingReset(true);
    try {
      const res = await fetch(`/api/users/${resetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      setLoadingReset(false);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        await alertMsg(d.error || "Gagal mereset password");
        return;
      }
      setResetUser(null);
      setNewPassword("");
      tampilToast(`Password untuk ${resetUser.name} berhasil diperbarui!`);
    } catch (err: any) {
      setLoadingReset(false);
      await alertMsg("Gagal terhubung ke server: " + err.message);
    }
  }

  async function handleUbahRole(u: UserAkun, roleBaru: "owner" | "petugas") {
    if (!(await confirm(`Ubah peran ${u.name} menjadi ${roleBaru === "owner" ? "Owner (Akses Penuh)" : "Petugas"}?`))) return;
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleBaru }),
      });
      if (res.ok) {
        tampilToast(`Peran ${u.name} diubah menjadi ${roleBaru}`);
        muatUsers();
      } else {
        const d = await res.json().catch(() => ({}));
        await alertMsg(d.error || "Gagal mengubah peran");
      }
    } catch (err: any) {
      await alertMsg("Gagal terhubung ke server: " + err.message);
    }
  }

  async function handleDelete(u: UserAkun) {
    if (!(await confirm(`Hapus akun ${u.name} (${u.email})? Akun yang dihapus tidak bisa login kembali.`, { confirmLabel: "Ya, Hapus Akun" }))) return;
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      if (res.ok) {
        tampilToast(`Akun ${u.name} berhasil dihapus`);
        muatUsers();
      } else {
        const d = await res.json().catch(() => ({}));
        await alertMsg(d.error || "Gagal menghapus akun");
      }
    } catch (err: any) {
      await alertMsg("Gagal terhubung ke server: " + err.message);
    }
  }

  return (
    <>
      <style>{`
        .user-card {
          background: white; border-radius: 16px; border: 1px solid var(--border-soft);
          box-shadow: 0 4px 16px rgba(0,0,0,0.02); padding: 1.5rem;
        }
        .toast-snack {
          position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
          display: flex; align-items: center; gap: 10px;
          padding: 0.75rem 1.1rem; border-radius: 12px;
          font-size: 0.88rem; font-weight: 500;
          box-shadow: 0 8px 24px rgba(15,23,42,.18);
        }
        .toast-snack--success { background:#fff; border-left:4px solid #10b981; color:#065f46; }
        .toast-snack--error   { background:#fff; border-left:4px solid #ef4444; color:#991b1b; }
      `}</style>

      {modal}

      {toast && (
        <div className={`toast-snack toast-snack--${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div className="container-fluid p-4">
        <div className="mb-4">
          <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Kelola User & Hak Akses</h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
            Manajemen akun Owner dan Petugas, tambah akun staf baru, & atur ganti password
          </p>
        </div>

        <div className="row">
          {/* Form Tambah User */}
          <div className="col-lg-4 mb-4">
            <div className="user-card">
              <h2 className="h6 fw-bold mb-3" style={{ color: "var(--ink-900)" }}>✚ Tambah Akun Staf Baru</h2>
              {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
              <form onSubmit={handleTambah}>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Nama Lengkap</label>
                  <input
                    className="form-control"
                    value={formTambah.name}
                    onChange={(e) => setFormTambah({ ...formTambah, name: e.target.value })}
                    required
                    placeholder="Nama Pengguna"
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Email Login</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formTambah.email}
                    onChange={(e) => setFormTambah({ ...formTambah, email: e.target.value })}
                    required
                    placeholder="nama@sekolah.sch.id"
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={formTambah.password}
                    onChange={(e) => setFormTambah({ ...formTambah, password: e.target.value })}
                    required
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Hak Akses / Peran (Role)</label>
                  <select
                    className="form-select"
                    value={formTambah.role}
                    onChange={(e) => setFormTambah({ ...formTambah, role: e.target.value as "owner" | "petugas" })}
                  >
                    <option value="petugas">Petugas (Kelola Tagihan & Siswa)</option>
                    <option value="owner">Owner (Akses Pengaturan & Full)</option>
                  </select>
                </div>
                <button className="btn btn-primary w-100 fw-bold py-2" disabled={loadingTambah}>
                  {loadingTambah ? "Memproses..." : "Tambah Pengguna Baru"}
                </button>
              </form>
            </div>
          </div>

          {/* Tabel Daftar Pengguna */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: 16 }}>
              <div className="card-header bg-white py-3 px-4" style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <h5 className="mb-0 fw-bold" style={{ fontSize: "0.95rem" }}>👥 Daftar Pengguna Sistem ({users.length})</h5>
              </div>
              <div className="table-responsive">
                <table className="table align-middle mb-0" style={{ fontSize: "0.88rem" }}>
                  <thead className="table-light">
                    <tr>
                      <th>Nama & Email</th>
                      <th>Hak Akses (Role)</th>
                      <th>Tanggal Dibuat</th>
                      <th style={{ width: "1%", whiteSpace: "nowrap", textAlign: "right" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-muted">Memuat daftar pengguna...</td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className="fw-bold text-dark">{u.name}</div>
                            <div className="text-muted small" style={{ fontFamily: "monospace" }}>{u.email}</div>
                          </td>
                          <td>
                            {u.role === "owner" ? (
                              <span className="badge bg-primary rounded-pill px-3">Owner</span>
                            ) : (
                              <span className="badge bg-secondary rounded-pill px-3">Petugas</span>
                            )}
                          </td>
                          <td>
                            <div className="text-muted small">
                              {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          </td>
                          <td className="text-end" style={{ whiteSpace: "nowrap" }}>
                            <div className="d-flex gap-1 justify-content-end align-items-center flex-nowrap">
                              <button
                                className="btn btn-sm btn-outline-warning rounded-pill px-2 py-1 fw-semibold"
                                style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                                onClick={() => setResetUser(u)}
                              >
                                🔑 Ganti Password
                              </button>
                              <button
                                className="btn btn-sm btn-outline-info rounded-pill px-2 py-1 fw-semibold"
                                style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                                onClick={() => handleUbahRole(u, u.role === "owner" ? "petugas" : "owner")}
                              >
                                🔄 Peran ({u.role === "owner" ? "→ Petugas" : "→ Owner"})
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger rounded-circle"
                                style={{ width: 28, height: 28, padding: 0 }}
                                title="Hapus Akun"
                                onClick={() => handleDelete(u)}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
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

      {/* Modal Reset Password */}
      {resetUser && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" onClick={() => setResetUser(null)}>
            <div className="modal-dialog modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 20 }}>
                <div className="modal-header bg-dark text-white" style={{ borderRadius: "20px 20px 0 0" }}>
                  <h5 className="modal-title fw-bold text-white">🔑 Ganti Password: {resetUser.name}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setResetUser(null)} />
                </div>
                <form onSubmit={handleResetPassword}>
                  <div className="modal-body p-4">
                    <p className="text-muted small mb-3">
                      Masukkan password baru untuk akun <strong>{resetUser.email}</strong>.
                    </p>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Password Baru</label>
                      <input
                        type="password"
                        className="form-control"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Minimal 6 karakter"
                        minLength={6}
                      />
                    </div>
                  </div>
                  <div className="modal-footer bg-light" style={{ borderRadius: "0 0 20px 20px" }}>
                    <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setResetUser(null)}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-warning rounded-pill px-4 fw-bold" disabled={loadingReset}>
                      {loadingReset ? "Memproses..." : "🔑 Simpan Password Baru"}
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
