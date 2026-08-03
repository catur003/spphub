"use client";

import { useEffect, useState, useMemo } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import Pagination from "@/components/admin/Pagination";
import { authClient } from "@/lib/auth-client";
import {
  IconCheck, IconX, IconPlus, IconCrown,
  IconUsers, IconSearch, IconEdit, IconKey, IconSave,
} from "@/components/admin/icons";

type UserAkun = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "petugas" | "siswa";
  createdAt: string;
};

type SortField = "name" | "role" | "createdAt";

const inputClass =
  "w-full rounded-control border border-border-soft px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";
const labelClass = "mb-1 block text-sm font-semibold text-ink-700";

const AVATAR_GRADIENT: Record<UserAkun["role"], string> = {
  owner: "bg-gradient-to-br from-[#4f46e5] to-[#3730a3]",
  siswa: "bg-gradient-to-br from-[#10b981] to-[#047857]",
  petugas: "bg-gradient-to-br from-[#64748b] to-[#475569]",
};

const ROLE_SELECT_STYLE: Record<UserAkun["role"], string> = {
  owner: "border-indigo-200 bg-indigo-100 text-indigo-800",
  siswa: "border-green-200 bg-green-100 text-green-700",
  petugas: "border-border-soft bg-slate-100 text-ink-700",
};

export default function PenggunaPage() {
  const [users, setUsers] = useState<UserAkun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Form Tambah
  const [formTambah, setFormTambah] = useState({
    name: "",
    email: "",
    password: "",
    role: "petugas" as "owner" | "petugas" | "siswa",
  });
  const [loadingTambah, setLoadingTambah] = useState(false);

  // Form Edit Nama & Email Modal
  const [editUser, setEditUser] = useState<UserAkun | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Form Reset Password Modal
  const [resetUser, setResetUser] = useState<UserAkun | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);

  const { confirm, alertMsg, modal } = useConfirmModal();

  useEffect(() => {
    authClient.getSession().then((session) => {
      if (session?.data?.user?.email) {
        setCurrentUserEmail(session.data.user.email);
      }
    });
  }, []);

  async function muatUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Gagal memuat daftar pengguna");
      }
    } catch (err: any) {
      console.error(err);
      setError("Gagal terhubung ke server");
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

  function bukaEditUser(u: UserAkun) {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
  }

  async function handleSimpanEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setLoadingEdit(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, email: editEmail }),
      });
      setLoadingEdit(false);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        await alertMsg(d.error || "Gagal memperbarui data pengguna");
        return;
      }
      setEditUser(null);
      tampilToast(`Data pengguna ${editName} berhasil diperbarui!`);
      muatUsers();
    } catch (err: any) {
      setLoadingEdit(false);
      await alertMsg("Gagal terhubung ke server: " + err.message);
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

  async function handleUbahRole(u: UserAkun, roleBaru: "owner" | "petugas" | "siswa") {
    if (u.email === currentUserEmail && roleBaru !== "owner") {
      await alertMsg("Anda tidak dapat menurunkan peran (role) akun Anda sendiri.");
      return;
    }

    const labelBaru = roleBaru === "owner" ? "Owner" : roleBaru === "siswa" ? "Siswa" : "Petugas";
    if (!(await confirm(`Ubah peran ${u.name} menjadi ${labelBaru}?`, { confirmLabel: "Ya, Ubah Peran" }))) return;

    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleBaru }),
      });
      if (res.ok) {
        tampilToast(`Peran ${u.name} diubah menjadi ${roleBaru.toUpperCase()}`);
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
    if (u.email === currentUserEmail) {
      await alertMsg("Anda tidak dapat menghapus akun Anda sendiri saat sedang login.");
      return;
    }
    if (!(await confirm(`Hapus akun ${u.name} (${u.email})? Akun yang dihapus tidak dapat login kembali.`, { confirmLabel: "Ya, Hapus Akun" }))) return;
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

  // Filter & Sort Users
  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comp = 0;
    if (sortField === "name") comp = a.name.localeCompare(b.name);
    else if (sortField === "role") comp = a.role.localeCompare(b.role);
    else if (sortField === "createdAt") comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortAsc ? comp : -comp;
  });

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedUsers.map((u) => u.id).join(","), currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  }

  return (
    <>
      {modal}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex animate-fade-in-up items-center gap-2.5 rounded-xl border-l-4 bg-white px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.type === "success" ? "border-status-lunas text-emerald-800" : "border-status-terlambat text-red-800"
          }`}
        >
          {toast.type === "success" ? <IconCheck className="inline h-4 w-4" /> : <IconX className="inline h-4 w-4" />} {toast.msg}
        </div>
      )}

      <div className="w-full p-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-ink-900">Kelola User & Hak Akses</h1>
          <p className="text-sm text-ink-500">
            Manajemen akun Owner, Petugas, dan Akun Siswa (Tambah akun, ubah role, & edit nama/email)
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Form Tambah User */}
          <div className="lg:col-span-1">
            <div className="rounded-[18px] border border-border-soft bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-900"><IconPlus className="h-4 w-4" /> Tambah Akun Baru</h2>
              {error && <div className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              <form onSubmit={handleTambah}>
                <div className="mb-2">
                  <label className={labelClass}>Nama Lengkap</label>
                  <input
                    className={inputClass}
                    value={formTambah.name}
                    onChange={(e) => setFormTambah({ ...formTambah, name: e.target.value })}
                    required
                    placeholder="Contoh: Ahmad Admin / Siswa"
                  />
                </div>
                <div className="mb-2">
                  <label className={labelClass}>Email Login</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={formTambah.email}
                    onChange={(e) => setFormTambah({ ...formTambah, email: e.target.value })}
                    required
                    placeholder="nama@sekolah.sch.id"
                  />
                </div>
                <div className="mb-2">
                  <label className={labelClass}>Password</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={formTambah.password}
                    onChange={(e) => setFormTambah({ ...formTambah, password: e.target.value })}
                    required
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                  />
                </div>
                <div className="mb-3">
                  <label className={labelClass}>Hak Akses / Peran (Role)</label>
                  <select
                    className={inputClass}
                    value={formTambah.role}
                    onChange={(e) => setFormTambah({ ...formTambah, role: e.target.value as any })}
                  >
                    <option value="petugas">Petugas (Kelola Tagihan &amp; Siswa)</option>
                    <option value="owner">Owner (Akses Penuh Pengaturan &amp; User)</option>
                    <option value="siswa">Siswa (Akses Portal Siswa)</option>
                  </select>
                </div>
                <button
                  className="w-full rounded-control bg-accent py-2 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover disabled:opacity-60"
                  disabled={loadingTambah}
                >
                  {loadingTambah ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Memproses...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5"><IconPlus className="h-4 w-4" /> Tambah Pengguna Baru</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Tabel Daftar Pengguna */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-[18px] border border-border-soft bg-white shadow-sm2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft bg-white px-4 py-3">
                <h5 className="flex items-center gap-1.5 text-sm font-bold text-ink-900"><IconUsers className="h-4 w-4" /> Daftar Pengguna Sistem ({sortedUsers.length})</h5>
                <div className="flex gap-2">
                  <select
                    className="w-[130px] rounded-control border border-border-soft px-2 py-1.5 text-sm text-ink-900 outline-none focus:border-accent"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="">Semua Role</option>
                    <option value="owner">Owner</option>
                    <option value="petugas">Petugas</option>
                    <option value="siswa">Siswa</option>
                  </select>
                  <div className="relative max-w-[200px]">
                    <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500/50" />
                    <input
                      type="text"
                      className="w-full rounded-control border border-border-soft py-1.5 pl-8 pr-2 text-sm text-ink-900 outline-none focus:border-accent"
                      placeholder="Cari pengguna..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-surface">
                    <tr>
                      <th className="cursor-pointer select-none px-4 py-2.5 text-left font-semibold text-ink-700 transition hover:text-accent-hover" onClick={() => toggleSort("name")}>
                        Nama & Email {sortField === "name" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th className="cursor-pointer select-none px-4 py-2.5 text-left font-semibold text-ink-700 transition hover:text-accent-hover" onClick={() => toggleSort("role")}>
                        Hak Akses (Role Dropdown) {sortField === "role" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th className="cursor-pointer select-none px-4 py-2.5 text-left font-semibold text-ink-700 transition hover:text-accent-hover" onClick={() => toggleSort("createdAt")}>
                        Dibuat {sortField === "createdAt" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-ink-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-ink-500">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                            Memuat daftar pengguna...
                          </span>
                        </td>
                      </tr>
                    ) : sortedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-ink-500">
                          Tidak ada data pengguna yang cocok.
                        </td>
                      </tr>
                    ) : (
                      pagedUsers.map((u) => {
                        const isSelf = u.email === currentUserEmail;

                        return (
                          <tr key={u.id}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white ${AVATAR_GRADIENT[u.role]}`}
                                >
                                  {u.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 font-bold text-ink-900">
                                    {u.name}
                                    {isSelf && (
                                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[0.68rem] font-semibold text-indigo-800">
                                        Akun Anda
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-mono text-xs text-ink-500">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isSelf ? (
                                <span className="rounded-full bg-accent px-3 py-2 text-[0.78rem] font-bold text-white">
                                  <span className="inline-flex items-center gap-1"><IconCrown className="h-3.5 w-3.5" /> Owner (Akun Anda)</span>
                                </span>
                              ) : (
                                <select
                                  className={`cursor-pointer rounded-full border px-3 py-1 pr-7 text-[0.78rem] font-bold transition hover:border-indigo-500 hover:shadow-[0_2px_8px_rgba(99,102,241,0.15)] ${ROLE_SELECT_STYLE[u.role]}`}
                                  value={u.role}
                                  onChange={(e) => handleUbahRole(u, e.target.value as any)}
                                >
                                  <option value="owner">Owner (Akses Penuh)</option>
                                  <option value="petugas">Petugas (Staff Operasional)</option>
                                  <option value="siswa">Siswa (Portal Siswa)</option>
                                </select>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs text-ink-500">
                                {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <div className="flex flex-nowrap items-center justify-end gap-1">
                                <button
                                  className="whitespace-nowrap rounded-full border border-accent px-2 py-1 text-xs font-semibold text-accent transition hover:bg-accent-soft"
                                  onClick={() => bukaEditUser(u)}
                                >
                                  <span className="inline-flex items-center gap-1"><IconEdit className="h-3.5 w-3.5" /> Edit</span>
                                </button>
                                <button
                                  className="whitespace-nowrap rounded-full border border-amber-500 px-2 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
                                  onClick={() => setResetUser(u)}
                                >
                                  <span className="inline-flex items-center gap-1"><IconKey className="h-3.5 w-3.5" /> Password</span>
                                </button>
                                <button
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-red-500 p-0 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  title={isSelf ? "Tidak dapat menghapus akun sendiri" : "Hapus Akun"}
                                  disabled={isSelf}
                                  onClick={() => handleDelete(u)}
                                >
                                  <IconX className="h-3.5 w-3.5" />
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
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={sortedUsers.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edit Nama & Email User */}
      {editUser && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4" onClick={() => setEditUser(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-accent px-5 py-4">
              <h5 className="flex items-center gap-1.5 text-base font-bold text-white"><IconEdit className="h-4 w-4" /> Edit User: {editUser.name}</h5>
              <button type="button" aria-label="Tutup" className="text-xl leading-none text-white/80 hover:text-white" onClick={() => setEditUser(null)}>×</button>
            </div>
            <form onSubmit={handleSimpanEditUser}>
              <div className="p-5">
                <div className="mb-3">
                  <label className={labelClass}>Nama Lengkap</label>
                  <input
                    className={inputClass}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className={labelClass}>Email Login</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">
                <button type="button" className="rounded-control border border-border-soft px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface" onClick={() => setEditUser(null)}>
                  Batal
                </button>
                <button type="submit" className="rounded-control bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60" disabled={loadingEdit}>
                  {loadingEdit ? "Memproses..." : <span className="inline-flex items-center gap-1.5"><IconSave className="h-4 w-4" /> Simpan Perubahan</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {resetUser && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4" onClick={() => setResetUser(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-ink-900 px-5 py-4">
              <h5 className="flex items-center gap-1.5 text-base font-bold text-white"><IconKey className="h-4 w-4" /> Ganti Password: {resetUser.name}</h5>
              <button type="button" aria-label="Tutup" className="text-xl leading-none text-white/80 hover:text-white" onClick={() => setResetUser(null)}>×</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="p-5">
                <p className="mb-3 text-sm text-ink-500">
                  Masukkan password baru untuk akun <strong className="font-semibold text-ink-700">{resetUser.email}</strong>.
                </p>
                <div className="mb-3">
                  <label className={labelClass}>Password Baru</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">
                <button type="button" className="rounded-control border border-border-soft px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface" onClick={() => setResetUser(null)}>
                  Batal
                </button>
                <button type="submit" className="rounded-control bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-60" disabled={loadingReset}>
                  {loadingReset ? "Memproses..." : <span className="inline-flex items-center gap-1.5"><IconKey className="h-4 w-4" /> Simpan Password Baru</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
