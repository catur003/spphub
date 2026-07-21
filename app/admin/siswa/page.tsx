"use client";

import { useEffect, useState, useCallback } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

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

const STATUS_COLOR: Record<string, string> = {
  aktif: "badge-status--aktif",
  lulus: "badge-status--lulus",
  pindah: "badge-status--pindah",
  nonaktif: "badge-status--nonaktif",
};

type HasilImport = {
  total: number;
  berhasil: number;
  gagal: { baris: number; alasan?: string; nama?: string }[];
};

const FORM_TAMBAH_KOSONG = {
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

type FormEdit = {
  namaLengkap: string;
  nis: string;
  nisn: string;
  jenisKelamin: string;
  kelasId: string;
  namaWali: string;
  kontakWali: string;
  status: string;
  // Manajemen akun
  buatAkun: boolean;
  email: string;
  password: string;
  gantiEmail: boolean;
  emailBaru: string;
  resetPassword: boolean;
  passwordBaru: string;
};

const FORM_EDIT_KOSONG: FormEdit = {
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
  gantiEmail: false,
  emailBaru: "",
  resetPassword: false,
  passwordBaru: "",
};

/** Inisial dari nama, maks 2 huruf */
function getInisial(nama: string): string {
  return nama
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

/** Warna avatar deterministik berdasarkan nama */
const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];
function getAvatarColor(nama: string): string {
  let h = 0;
  for (let i = 0; i < nama.length; i++) h = (h * 31 + nama.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function SiswaPage() {
  const [daftar, setDaftar] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [q, setQ] = useState("");
  const [filterKelasId, setFilterKelasId] = useState("");
  const [formTambah, setFormTambah] = useState(FORM_TAMBAH_KOSONG);
  const [loadingTambah, setLoadingTambah] = useState(false);
  const [errorTambah, setErrorTambah] = useState("");

  // State modal edit
  const [editSiswa, setEditSiswa] = useState<Siswa | null>(null);
  const [formEdit, setFormEdit] = useState<FormEdit>(FORM_EDIT_KOSONG);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [fileImport, setFileImport] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [hasilImport, setHasilImport] = useState<HasilImport | null>(null);
  const [importError, setImportError] = useState("");

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { confirm, alertMsg, modal } = useConfirmModal();

  const muatData = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filterKelasId) params.set("kelasId", filterKelasId);
    const qs = params.toString();
    const res = await fetch(`/api/siswa${qs ? `?${qs}` : ""}`);
    if (res.ok) setDaftar(await res.json());
  }, [q, filterKelasId]);

  async function muatKelas() {
    const res = await fetch("/api/kelas");
    if (res.ok) setKelasList(await res.json());
  }

  function tampilToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => { muatKelas(); }, []);

  useEffect(() => {
    const timeout = setTimeout(muatData, 300);
    return () => clearTimeout(timeout);
  }, [muatData]);

  // ——— Form Tambah ———
  async function handleTambah(e: React.FormEvent) {
    e.preventDefault();
    setErrorTambah("");
    setLoadingTambah(true);
    const res = await fetch("/api/siswa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formTambah),
    });
    setLoadingTambah(false);
    if (!res.ok) {
      const data = await res.json();
      setErrorTambah(data.error || "Gagal menyimpan");
      return;
    }
    setFormTambah(FORM_TAMBAH_KOSONG);
    tampilToast("Siswa berhasil ditambahkan");
    muatData();
  }

  // ——— Modal Edit ———
  function bukaEdit(s: Siswa) {
    setEditSiswa(s);
    setFormEdit({
      ...FORM_EDIT_KOSONG,
      namaLengkap: s.namaLengkap,
      nis: s.nis,
      nisn: s.nisn || "",
      jenisKelamin: s.jenisKelamin,
      kelasId: s.kelas?.id || "",
      status: s.status,
    });
    setErrorEdit("");
  }

  function tutupEdit() {
    setEditSiswa(null);
    setFormEdit(FORM_EDIT_KOSONG);
    setErrorEdit("");
  }

  async function handleSimpanEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editSiswa) return;
    setErrorEdit("");
    setLoadingEdit(true);

    const res = await fetch(`/api/siswa/${editSiswa.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formEdit),
    });
    setLoadingEdit(false);

    if (!res.ok) {
      const data = await res.json();
      setErrorEdit(data.error || "Gagal menyimpan");
      return;
    }

    tutupEdit();
    tampilToast("Data siswa berhasil disimpan");
    muatData();
  }

  // ——— Hapus ———
  async function handleDelete(id: string) {
    const yakin = await confirm(
      "Hapus siswa ini? Jika punya riwayat tagihan, ubah status menjadi Nonaktif saja.",
      { title: "Hapus Siswa", confirmLabel: "Ya, Hapus" }
    );
    if (!yakin) return;
    setDeletingId(id);
    const res = await fetch(`/api/siswa/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json();
      await alertMsg(data.error || "Gagal menghapus");
      return;
    }
    tampilToast("Siswa berhasil dihapus");
    muatData();
  }

  // ——— Import ———
  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!fileImport) return;
    setImportError("");
    setHasilImport(null);
    setImportLoading(true);

    const formData = new FormData();
    formData.append("file", fileImport);

    const res = await fetch("/api/siswa/import", { method: "POST", body: formData });
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

  const sudahPunyaAkun = !!editSiswa?.akun;

  return (
    <>
      <style>{`
        /* ——— Badge status ——— */
        .badge-status {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 20px;
          font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em;
        }
        .badge-status::before {
          content: ''; width: 6px; height: 6px;
          border-radius: 50%; background: currentColor; opacity: 0.7;
        }
        .badge-status--aktif   { background: #dcfce7; color: #15803d; }
        .badge-status--lulus   { background: #dbeafe; color: #1d4ed8; }
        .badge-status--pindah  { background: #fef9c3; color: #854d0e; }
        .badge-status--nonaktif{ background: #f3f4f6; color: #6b7280; }

        /* ——— Chip akun ——— */
        .chip-akun {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.73rem; font-weight: 500;
        }
        .chip-akun--ada   { background: #ede9fe; color: #5b21b6; }
        .chip-akun--kosong{ background: #f3f4f6; color: #9ca3af; font-style: italic; }

        /* ——— Avatar ——— */
        .siswa-avatar {
          width: 34px; height: 34px; border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 700; color: white;
          flex-shrink: 0;
        }

        /* ——— Modal Edit ——— */
        .modal-edit .modal-content {
          border: none; border-radius: 18px;
          box-shadow: 0 24px 60px rgba(15,23,42,.18);
        }
        .modal-edit .modal-header {
          background: linear-gradient(135deg,#4f46e5,#7c3aed);
          border-radius: 18px 18px 0 0; padding: 1.1rem 1.4rem;
          border-bottom: none;
        }
        .modal-edit .modal-title { color: #fff; font-weight: 700; font-size: 1.05rem; }
        .modal-edit .btn-close { filter: invert(1) brightness(2); opacity: .85; }
        .modal-edit .modal-body { padding: 1.4rem; max-height: 75vh; overflow-y: auto; }
        .modal-edit .modal-footer {
          border-top: 1px solid var(--border-soft);
          padding: 0.9rem 1.4rem; border-radius: 0 0 18px 18px;
        }

        /* ——— Section akun dalam modal ——— */
        .akun-section {
          border: 1.5px dashed #c4b5fd; border-radius: 12px;
          padding: 1rem 1.1rem; background: #faf5ff; margin-top: 0.5rem;
        }
        .akun-section--ada {
          border-color: #a5b4fc; background: #eef2ff;
        }
        .akun-section__label {
          font-size: 0.78rem; font-weight: 600; color: #6d28d9;
          text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.75rem;
          display: flex; align-items: center; gap: 6px;
        }
        .akun-section--ada .akun-section__label { color: #4338ca; }

        /* ——— Toggle switch ——— */
        .toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 0.5rem; cursor: pointer; user-select: none;
        }
        .toggle-row input[type="checkbox"] { cursor: pointer; }

        /* ——— Field collapse animasi ——— */
        .field-group-collapse {
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease;
          max-height: 0; opacity: 0;
        }
        .field-group-collapse.open { max-height: 300px; opacity: 1; }

        /* ——— Toast ——— */
        .toast-snack {
          position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
          display: flex; align-items: center; gap: 10px;
          padding: 0.75rem 1.1rem; border-radius: 12px;
          font-size: 0.88rem; font-weight: 500;
          box-shadow: 0 8px 24px rgba(15,23,42,.18);
          animation: toastIn 0.28s cubic-bezier(0.34,1.56,0.64,1);
        }
        .toast-snack--success { background: #fff; border-left: 4px solid #10b981; color: #065f46; }
        .toast-snack--error   { background: #fff; border-left: 4px solid #ef4444; color: #991b1b; }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ——— Tabel siswa ——— */
        .siswa-table th {
          font-size: 0.76rem; text-transform: uppercase;
          letter-spacing: 0.05em; color: var(--ink-500);
          font-weight: 600; background: var(--surface);
          padding: 0.65rem 0.85rem; border-bottom: 2px solid var(--border-soft);
        }
        .siswa-table td { padding: 0.7rem 0.85rem; vertical-align: middle; font-size: 0.88rem; }
        .siswa-table tbody tr { transition: background 0.12s ease; }
        .siswa-table tbody tr:hover { background: #f5f7ff; }

        /* ——— Card form tambah ——— */
        .card-form-tambah .card-header {
          background: linear-gradient(135deg,#4f46e5,#7c3aed);
          border-radius: 14px 14px 0 0; padding: 0.9rem 1.1rem; border-bottom: none;
        }
        .card-form-tambah .card-header h2 { color: #fff; font-size: 0.92rem; margin: 0; font-weight: 700; }

        /* ——— Import result ——— */
        .import-result-success { background:#f0fdf4; border:1.5px solid #86efac; color:#166534; border-radius:10px; padding:0.65rem 1rem; font-size:0.85rem; }
        .import-result-table   { border-radius:10px; overflow:hidden; font-size:0.82rem; }
      `}</style>

      {/* ——— Toast ——— */}
      {toast && (
        <div className={`toast-snack toast-snack--${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div className="container-fluid p-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Data Siswa</h1>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
              {daftar.length} siswa ditemukan
            </p>
          </div>
        </div>

        {/* ——— Import / Export ——— */}
        <div className="card mb-4">
          <div className="card-body">
            <h2 className="h6 fw-semibold mb-3" style={{ color: "var(--ink-700)" }}>
              📥 Import / Export Excel
            </h2>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <a className="btn btn-sm btn-outline-secondary" href="/api/siswa/template">
                ⬇ Download Template
              </a>
              <a className="btn btn-sm btn-outline-secondary" href="/api/siswa/export">
                ⬇ Export Data Siswa (.xlsx)
              </a>
            </div>
            <form onSubmit={handleImport} className="d-flex gap-2 align-items-center flex-wrap">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="form-control form-control-sm"
                style={{ maxWidth: 320 }}
                onChange={(e) => setFileImport(e.target.files?.[0] || null)}
              />
              <button className="btn btn-sm btn-primary" disabled={!fileImport || importLoading}>
                {importLoading ? (
                  <><span className="spinner-border spinner-border-sm me-1" />Mengimpor...</>
                ) : "Import"}
              </button>
            </form>
            {importError && <div className="alert alert-danger py-2 mt-3 mb-0 small">{importError}</div>}
            {hasilImport && (
              <div className="mt-3">
                <div className="import-result-success mb-2">
                  ✓ <strong>{hasilImport.berhasil}</strong> dari <strong>{hasilImport.total}</strong> baris berhasil diimport.
                </div>
                {hasilImport.gagal.length > 0 && (
                  <div className="table-responsive import-result-table" style={{ maxHeight: 240, overflowY: "auto" }}>
                    <table className="table table-sm table-bordered mb-0">
                      <thead><tr><th>Baris</th><th>Nama</th><th>Alasan Gagal</th></tr></thead>
                      <tbody>
                        {hasilImport.gagal.map((g, i) => (
                          <tr key={i}>
                            <td>{g.baris}</td>
                            <td>{g.nama || "—"}</td>
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
          {/* ——— Form Tambah (inline kiri) ——— */}
          <div className="col-lg-4 mb-4">
            <div className="card card-form-tambah">
              <div className="card-header">
                <h2>✚ Tambah Siswa</h2>
              </div>
              <div className="card-body">
                {errorTambah && <div className="alert alert-danger py-2 small">{errorTambah}</div>}
                <form onSubmit={handleTambah}>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Nama Lengkap</label>
                    <input className="form-control form-control-sm" value={formTambah.namaLengkap}
                      onChange={(e) => setFormTambah({ ...formTambah, namaLengkap: e.target.value })} required />
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">NIS</label>
                      <input className="form-control form-control-sm" value={formTambah.nis}
                        onChange={(e) => setFormTambah({ ...formTambah, nis: e.target.value })} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">NISN</label>
                      <input className="form-control form-control-sm" value={formTambah.nisn}
                        onChange={(e) => setFormTambah({ ...formTambah, nisn: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Jenis Kelamin</label>
                    <select className="form-select form-select-sm" value={formTambah.jenisKelamin}
                      onChange={(e) => setFormTambah({ ...formTambah, jenisKelamin: e.target.value })}>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Kelas</label>
                    <select className="form-select form-select-sm" value={formTambah.kelasId}
                      onChange={(e) => setFormTambah({ ...formTambah, kelasId: e.target.value })}>
                      <option value="">— Belum ada kelas —</option>
                      {kelasList.map((k) => <option key={k.id} value={k.id}>{k.namaKelas}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Status</label>
                    <select className="form-select form-select-sm" value={formTambah.status}
                      onChange={(e) => setFormTambah({ ...formTambah, status: e.target.value })}>
                      {Object.entries(STATUS_LABEL).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Buat akun sekaligus */}
                  <div className="akun-section">
                    <label className="toggle-row mb-0">
                      <span className="akun-section__label" style={{ marginBottom: 0 }}>
                        🔑 Buat akun login
                      </span>
                      <input type="checkbox" className="form-check-input"
                        checked={formTambah.buatAkun}
                        onChange={(e) => setFormTambah({ ...formTambah, buatAkun: e.target.checked })} />
                    </label>
                    <div className={`field-group-collapse${formTambah.buatAkun ? " open" : ""}`}>
                      <div className="mt-2">
                        <input type="email" className="form-control form-control-sm mb-2"
                          placeholder="Email siswa"
                          value={formTambah.email}
                          onChange={(e) => setFormTambah({ ...formTambah, email: e.target.value })}
                          required={formTambah.buatAkun} />
                        <input type="password" className="form-control form-control-sm"
                          placeholder="Password (min. 8 karakter)"
                          value={formTambah.password}
                          onChange={(e) => setFormTambah({ ...formTambah, password: e.target.value })}
                          required={formTambah.buatAkun} minLength={8} />
                      </div>
                    </div>
                  </div>

                  <button className="btn btn-primary w-100 mt-3" disabled={loadingTambah}>
                    {loadingTambah
                      ? <><span className="spinner-border spinner-border-sm me-1" />Menyimpan...</>
                      : "Tambah Siswa"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* ——— Tabel Siswa ——— */}
          <div className="col-lg-8">
            <div className="d-flex gap-2 mb-3 flex-wrap">
              <input className="form-control" placeholder="🔍 Cari nama / NIS / NISN..."
                value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
              <select className="form-select" style={{ maxWidth: 200 }}
                value={filterKelasId} onChange={(e) => setFilterKelasId(e.target.value)}>
                <option value="">Semua Kelas</option>
                {kelasList.map((k) => <option key={k.id} value={k.id}>{k.namaKelas}</option>)}
              </select>
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="table-responsive">
                <table className="table siswa-table mb-0">
                  <thead>
                    <tr>
                      <th>Siswa</th>
                      <th>NIS</th>
                      <th>Kelas</th>
                      <th>Status</th>
                      <th>Akun Login</th>
                      <th style={{ width: 100 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftar.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="siswa-avatar" style={{ background: getAvatarColor(s.namaLengkap) }}>
                              {getInisial(s.namaLengkap)}
                            </div>
                            <div>
                              <div className="fw-semibold" style={{ fontSize: "0.88rem" }}>{s.namaLengkap}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--ink-500)" }}>
                                {s.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: "0.83rem" }}>{s.nis}</span>
                        </td>
                        <td>{s.kelas?.namaKelas || <span className="text-muted">—</span>}</td>
                        <td>
                          <span className={`badge-status ${STATUS_COLOR[s.status] || ""}`}>
                            {STATUS_LABEL[s.status] || s.status}
                          </span>
                        </td>
                        <td>
                          {s.akun ? (
                            <span className="chip-akun chip-akun--ada" title={s.akun.email}>
                              🔑 {s.akun.email.length > 22 ? s.akun.email.slice(0, 20) + "…" : s.akun.email}
                            </span>
                          ) : (
                            <span className="chip-akun chip-akun--kosong">Belum ada akun</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8 }}
                              onClick={() => bukaEdit(s)}>
                              Edit
                            </button>
                            <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 8 }}
                              disabled={deletingId === s.id}
                              onClick={() => handleDelete(s.id)}>
                              {deletingId === s.id
                                ? <span className="spinner-border spinner-border-sm" />
                                : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {daftar.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-5">
                          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🎓</div>
                          Belum ada data siswa.
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

      {/* ——————————————————————————————————————————
          MODAL EDIT SISWA
      —————————————————————————————————————————— */}
      {editSiswa && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block modal-edit" tabIndex={-1} role="dialog" onClick={tutupEdit}>
            <div className="modal-dialog modal-dialog-centered modal-lg" role="document"
              onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                {/* Header */}
                <div className="modal-header">
                  <div className="d-flex align-items-center gap-3">
                    <div className="siswa-avatar" style={{ background: getAvatarColor(editSiswa.namaLengkap), width: 40, height: 40, borderRadius: 12, fontSize: "0.85rem" }}>
                      {getInisial(editSiswa.namaLengkap)}
                    </div>
                    <div>
                      <h5 className="modal-title">Edit Siswa</h5>
                      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.75)" }}>
                        NIS {editSiswa.nis}
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn-close" onClick={tutupEdit} />
                </div>

                {/* Body */}
                <form onSubmit={handleSimpanEdit}>
                  <div className="modal-body">
                    {errorEdit && <div className="alert alert-danger py-2 small mb-3">{errorEdit}</div>}

                    <div className="row g-3">
                      {/* Data Siswa */}
                      <div className="col-12">
                        <p className="text-uppercase fw-semibold mb-2" style={{ fontSize: "0.72rem", color: "var(--ink-500)", letterSpacing: "0.05em" }}>
                          Data Siswa
                        </p>
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Nama Lengkap</label>
                        <input className="form-control" value={formEdit.namaLengkap}
                          onChange={(e) => setFormEdit({ ...formEdit, namaLengkap: e.target.value })} required />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">NIS</label>
                        <input className="form-control" value={formEdit.nis}
                          onChange={(e) => setFormEdit({ ...formEdit, nis: e.target.value })} required />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">NISN</label>
                        <input className="form-control" value={formEdit.nisn}
                          onChange={(e) => setFormEdit({ ...formEdit, nisn: e.target.value })} />
                      </div>
                      <div className="col-sm-4">
                        <label className="form-label small fw-semibold">Jenis Kelamin</label>
                        <select className="form-select" value={formEdit.jenisKelamin}
                          onChange={(e) => setFormEdit({ ...formEdit, jenisKelamin: e.target.value })}>
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div className="col-sm-4">
                        <label className="form-label small fw-semibold">Kelas</label>
                        <select className="form-select" value={formEdit.kelasId}
                          onChange={(e) => setFormEdit({ ...formEdit, kelasId: e.target.value })}>
                          <option value="">— Belum ada kelas —</option>
                          {kelasList.map((k) => <option key={k.id} value={k.id}>{k.namaKelas}</option>)}
                        </select>
                      </div>
                      <div className="col-sm-4">
                        <label className="form-label small fw-semibold">Status</label>
                        <select className="form-select" value={formEdit.status}
                          onChange={(e) => setFormEdit({ ...formEdit, status: e.target.value })}>
                          {Object.entries(STATUS_LABEL).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>

                      {/* ——— Section Akun ——— */}
                      <div className="col-12 mt-1">
                        <hr style={{ borderColor: "var(--border-soft)", margin: "0 0 1rem" }} />

                        {!sudahPunyaAkun ? (
                          // BELUM PUNYA AKUN → opsi buat akun baru
                          <div className="akun-section">
                            <label className="toggle-row">
                              <span className="akun-section__label" style={{ marginBottom: 0 }}>
                                🔑 Buat Akun Login
                              </span>
                              <input type="checkbox" className="form-check-input"
                                checked={formEdit.buatAkun}
                                onChange={(e) => setFormEdit({ ...formEdit, buatAkun: e.target.checked })} />
                            </label>
                            <p className="text-muted mt-1 mb-0" style={{ fontSize: "0.78rem" }}>
                              Siswa ini belum memiliki akun login. Aktifkan untuk membuat akun sekarang.
                            </p>
                            <div className={`field-group-collapse${formEdit.buatAkun ? " open" : ""}`}>
                              <div className="mt-2 d-flex flex-column gap-2">
                                <input type="email" className="form-control form-control-sm"
                                  placeholder="Email siswa"
                                  value={formEdit.email}
                                  onChange={(e) => setFormEdit({ ...formEdit, email: e.target.value })}
                                  required={formEdit.buatAkun} />
                                <input type="password" className="form-control form-control-sm"
                                  placeholder="Password (min. 8 karakter)"
                                  value={formEdit.password}
                                  onChange={(e) => setFormEdit({ ...formEdit, password: e.target.value })}
                                  required={formEdit.buatAkun} minLength={8} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          // SUDAH PUNYA AKUN → opsi ganti email & reset password
                          <div className="akun-section akun-section--ada">
                            <div className="akun-section__label">
                              🔑 Akun Login
                              <span className="chip-akun chip-akun--ada ms-auto" style={{ fontWeight: 500 }}>
                                {editSiswa.akun?.email}
                              </span>
                            </div>

                            {/* Ganti Email */}
                            <label className="toggle-row mb-1" style={{ fontSize: "0.85rem" }}>
                              <span className="fw-semibold" style={{ color: "var(--ink-700)" }}>Ganti Email</span>
                              <input type="checkbox" className="form-check-input"
                                checked={formEdit.gantiEmail}
                                onChange={(e) => setFormEdit({ ...formEdit, gantiEmail: e.target.checked, emailBaru: "" })} />
                            </label>
                            <div className={`field-group-collapse${formEdit.gantiEmail ? " open" : ""}`}>
                              <input type="email" className="form-control form-control-sm mt-1"
                                placeholder="Email baru"
                                value={formEdit.emailBaru}
                                onChange={(e) => setFormEdit({ ...formEdit, emailBaru: e.target.value })}
                                required={formEdit.gantiEmail} />
                            </div>

                            <hr style={{ borderColor: "#c4b5fd", margin: "0.75rem 0" }} />

                            {/* Reset Password */}
                            <label className="toggle-row mb-1" style={{ fontSize: "0.85rem" }}>
                              <span className="fw-semibold" style={{ color: "var(--ink-700)" }}>Reset Password</span>
                              <input type="checkbox" className="form-check-input"
                                checked={formEdit.resetPassword}
                                onChange={(e) => setFormEdit({ ...formEdit, resetPassword: e.target.checked, passwordBaru: "" })} />
                            </label>
                            <div className={`field-group-collapse${formEdit.resetPassword ? " open" : ""}`}>
                              <input type="password" className="form-control form-control-sm mt-1"
                                placeholder="Password baru (min. 8 karakter)"
                                value={formEdit.passwordBaru}
                                onChange={(e) => setFormEdit({ ...formEdit, passwordBaru: e.target.value })}
                                required={formEdit.resetPassword} minLength={8} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={tutupEdit}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-primary px-4" disabled={loadingEdit}>
                      {loadingEdit
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
