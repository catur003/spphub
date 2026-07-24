"use client";

import { useEffect, useState, useCallback } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type Kelas = { id: string; namaKelas: string; tingkat?: number };
type Siswa = {
  id: string;
  nis: string;
  nisn: string | null;
  namaLengkap: string;
  jenisKelamin: "L" | "P";
  tanggalLahir?: string | null;
  namaWali?: string | null;
  kontakWali?: string | null;
  fotoUrl?: string | null;
  status: string;
  kelas: Kelas | null;
  akun: { email: string } | null;
  tagihan?: { id: string; bulan: number; tahun: number; nominal: number; status: string; updatedAt: string }[];
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

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

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
  tanggalLahir: "",
  namaWali: "",
  kontakWali: "",
  fotoUrl: "",
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
  tanggalLahir: string;
  namaWali: string;
  kontakWali: string;
  fotoUrl: string;
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
  tanggalLahir: "",
  namaWali: "",
  kontakWali: "",
  fotoUrl: "",
  status: "aktif",
  buatAkun: false,
  email: "",
  password: "",
  gantiEmail: false,
  emailBaru: "",
  resetPassword: false,
  passwordBaru: "",
};

function getInisial(nama: string): string {
  return nama
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

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
  const [filterTingkat, setFilterTingkat] = useState("");
  const [filterKelasId, setFilterKelasId] = useState("");
  const [formTambah, setFormTambah] = useState(FORM_TAMBAH_KOSONG);
  const [loadingTambah, setLoadingTambah] = useState(false);
  const [errorTambah, setErrorTambah] = useState("");

  const [editSiswa, setEditSiswa] = useState<Siswa | null>(null);
  const [formEdit, setFormEdit] = useState<FormEdit>(FORM_EDIT_KOSONG);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState("");

  const [detailSiswa, setDetailSiswa] = useState<Siswa | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [fileImport, setFileImport] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [hasilImport, setHasilImport] = useState<HasilImport | null>(null);
  const [importError, setImportError] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { confirm, alertMsg, modal } = useConfirmModal();

  const muatData = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filterTingkat) params.set("tingkat", filterTingkat);
    if (filterKelasId) params.set("kelasId", filterKelasId);
    const qs = params.toString();
    try {
      const res = await fetch(`/api/siswa${qs ? `?${qs}` : ""}`, { signal });
      if (res.ok) setDaftar(await res.json());
    } catch (err: any) {
      if (err.name !== "AbortError") console.error("[muatData] error:", err);
    }
  }, [q, filterTingkat, filterKelasId]);

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
    const controller = new AbortController();
    const timeout = setTimeout(() => muatData(controller.signal), 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [muatData]);

  function kompresGambar(file: File, maxPx = 400): Promise<Blob> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let w = img.width;
          let h = img.height;
          if (w > maxPx || h > maxPx) {
            if (w > h) {
              h = Math.round((h * maxPx) / w);
              w = maxPx;
            } else {
              w = Math.round((w * maxPx) / h);
              h = maxPx;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.82);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  // Upload foto file (ke Cloudinary / Base64 fallback)
  async function uploadFotoFile(file: File): Promise<string> {
    const blobKompres = await kompresGambar(file);
    const formData = new FormData();
    formData.append("file", blobKompres, "foto_siswa.jpg");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto");
    return data.url;
  }

  async function handleFileFotoTambah(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const url = await uploadFotoFile(file);
      setFormTambah((prev) => ({ ...prev, fotoUrl: url }));
      tampilToast("Foto berhasil diunggah!");
    } catch (err: any) {
      await alertMsg(err.message);
    } finally {
      setUploadingFoto(false);
    }
  }

  async function handleFileFotoEdit(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const url = await uploadFotoFile(file);
      setFormEdit((prev) => ({ ...prev, fotoUrl: url }));
      tampilToast("Foto berhasil diunggah!");
    } catch (err: any) {
      await alertMsg(err.message);
    } finally {
      setUploadingFoto(false);
    }
  }

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
      tanggalLahir: s.tanggalLahir ? new Date(s.tanggalLahir).toISOString().slice(0, 10) : "",
      namaWali: s.namaWali || "",
      kontakWali: s.kontakWali || "",
      fotoUrl: s.fotoUrl || "",
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

  // ——— Modal Detail Siswa ———
  async function bukaDetailSiswa(id: string) {
    setLoadingDetail(true);
    setDetailSiswa(null);
    try {
      const res = await fetch(`/api/siswa/${id}`);
      if (res.ok) {
        setDetailSiswa(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
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

  return (
    <>
      <style>{`
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

        .siswa-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 700; color: white; flex-shrink: 0;
          overflow: hidden;
        }

        .siswa-table th {
          font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--ink-500); font-weight: 600; background: var(--surface);
          padding: 0.75rem 0.9rem; border-bottom: 2px solid var(--border-soft);
        }
        .siswa-table td { padding: 0.75rem 0.9rem; vertical-align: middle; }

        .toast-snack {
          position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
          display: flex; align-items: center; gap: 10px;
          padding: 0.75rem 1.1rem; border-radius: 12px;
          font-size: 0.88rem; font-weight: 500;
          box-shadow: 0 8px 24px rgba(15,23,42,.18);
        }
        .toast-snack--success { background:#fff; border-left:4px solid #10b981; color:#065f46; }

        .card-form-tambah .card-header {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border-radius: 14px 14px 0 0; padding: 0.9rem 1.1rem; border-bottom: none;
        }
        .card-form-tambah .card-header h2 { color: #fff; font-size: 0.92rem; margin: 0; font-weight: 700; }
      `}</style>

      {modal}

      {toast && (
        <div className={`toast-snack toast-snack--${toast.type}`}>
          ✓ {toast.msg}
        </div>
      )}

      <div className="container-fluid p-4">
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Data Siswa</h1>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
              {daftar.length} siswa ditampilkan (Cari untuk melihat hasil spesifik)
            </p>
          </div>
        </div>

        {/* ——— Import / Export ——— */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
          <div className="card-body p-4">
            <h2 className="h6 fw-bold mb-3" style={{ color: "var(--ink-800)" }}>
              📥 Import / Export Excel Siswa
            </h2>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <a className="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-semibold" href="/api/siswa/template" target="_blank" download>
                ⬇ Download Template (.xlsx)
              </a>
              <a className="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-semibold" href="/api/siswa/export">
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
              <button className="btn btn-sm btn-primary rounded-pill px-4 fw-bold" disabled={!fileImport || importLoading}>
                {importLoading ? "Mengimpor..." : "Import Siswa"}
              </button>
            </form>
            {importError && <div className="alert alert-danger py-2 mt-3 mb-0 small">{importError}</div>}
            {hasilImport && (
              <div className="mt-3">
                <div className="alert alert-success py-2 small mb-2">
                  ✓ <strong>{hasilImport.berhasil}</strong> dari <strong>{hasilImport.total}</strong> baris berhasil diimport.
                </div>
                {hasilImport.gagal.length > 0 && (
                  <div className="table-responsive border rounded p-2" style={{ maxHeight: 180, overflowY: "auto" }}>
                    <table className="table table-sm mb-0 small">
                      <thead><tr><th>Baris</th><th>Nama</th><th>Alasan</th></tr></thead>
                      <tbody>
                        {hasilImport.gagal.map((g, idx) => (
                          <tr key={idx}>
                            <td>{g.baris}</td>
                            <td>{g.nama || "-"}</td>
                            <td className="text-danger">{g.alasan}</td>
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
          {/* ——— Form Tambah ——— */}
          <div className="col-lg-4 mb-4">
            <div className="card card-form-tambah shadow-sm border-0" style={{ borderRadius: 16 }}>
              <div className="card-header">
                <h2>✚ Tambah Siswa Baru</h2>
              </div>
              <div className="card-body p-4">
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
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Jenis Kelamin</label>
                      <select className="form-select form-select-sm" value={formTambah.jenisKelamin}
                        onChange={(e) => setFormTambah({ ...formTambah, jenisKelamin: e.target.value })}>
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Kelas</label>
                      <select className="form-select form-select-sm" value={formTambah.kelasId}
                        onChange={(e) => setFormTambah({ ...formTambah, kelasId: e.target.value })}>
                        <option value="">— Pilih Kelas —</option>
                        {kelasList.map((k) => <option key={k.id} value={k.id}>{k.namaKelas}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Upload Foto Siswa (Cloudinary / File / URL) */}
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Foto Profile Siswa (Opsional)</label>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control form-control-sm"
                        onChange={handleFileFotoTambah}
                        disabled={uploadingFoto}
                      />
                      {uploadingFoto && <span className="spinner-border spinner-border-sm text-primary" />}
                    </div>
                    {formTambah.fotoUrl && (
                      <div className="mt-2 d-flex align-items-center gap-2">
                        <img src={formTambah.fotoUrl} alt="Preview" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                        <span className="text-success small fw-semibold">✓ Foto Terpilih</span>
                      </div>
                    )}
                  </div>

                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Nama Wali</label>
                      <input className="form-control form-control-sm" value={formTambah.namaWali}
                        onChange={(e) => setFormTambah({ ...formTambah, namaWali: e.target.value })} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Kontak Wali</label>
                      <input className="form-control form-control-sm" value={formTambah.kontakWali}
                        onChange={(e) => setFormTambah({ ...formTambah, kontakWali: e.target.value })} />
                    </div>
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

                  <button className="btn btn-primary w-100 fw-bold py-2" disabled={loadingTambah || uploadingFoto}>
                    {loadingTambah ? "Menyimpan..." : "Simpan Data Siswa"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* ——— Tabel Siswa ——— */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm p-3 mb-3" style={{ borderRadius: 16 }}>
              <div className="row g-2">
                <div className="col-md-5">
                  <input
                    className="form-control form-control-sm"
                    placeholder="🔍 Cari nama siswa / NIS / NISN (Maks 20)..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select form-select-sm"
                    value={filterTingkat}
                    onChange={(e) => {
                      setFilterTingkat(e.target.value);
                      setFilterKelasId("");
                    }}
                  >
                    <option value="">Semua Tingkat</option>
                    {Array.from(new Set(kelasList.map((k) => k.tingkat).filter(Boolean)))
                      .sort((a, b) => Number(a) - Number(b))
                      .map((t) => (
                        <option key={t} value={t}>Tingkat {t}</option>
                      ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <select className="form-select form-select-sm" value={filterKelasId} onChange={(e) => setFilterKelasId(e.target.value)}>
                    <option value="">Semua Kelas {filterTingkat ? `(Tingkat ${filterTingkat})` : ""}</option>
                    {(filterTingkat ? kelasList.filter((k) => String(k.tingkat) === filterTingkat) : kelasList).map((k) => (
                      <option key={k.id} value={k.id}>{k.namaKelas}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card p-0 border-0 shadow-sm overflow-hidden" style={{ borderRadius: 16 }}>
              <div className="table-responsive">
                <table className="table siswa-table align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="sort-th" onClick={() => toggleSort("nama")}>
                        Identitas Siswa {sortField === "nama" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th className="sort-th" onClick={() => toggleSort("nis")}>
                        NIS {sortField === "nis" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th className="sort-th" onClick={() => toggleSort("kelas")}>
                        Kelas {sortField === "kelas" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th className="sort-th" onClick={() => toggleSort("status")}>
                        Status {sortField === "status" ? (sortAsc ? "▲" : "▼") : ""}
                      </th>
                      <th style={{ width: "1%", whiteSpace: "nowrap", textAlign: "right" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDaftar.map((s) => (
                      <tr key={s.id}>
                        <td style={{ cursor: "pointer" }} onClick={() => bukaDetailSiswa(s.id)}>
                          <div className="d-flex align-items-center gap-2">
                            <div className="siswa-avatar" style={{ background: getAvatarColor(s.namaLengkap) }}>
                              {s.fotoUrl ? (
                                <img src={s.fotoUrl} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                getInisial(s.namaLengkap)
                              )}
                            </div>
                            <div>
                              <div className="fw-bold text-dark text-decoration-none hover-primary" style={{ fontSize: "0.88rem" }}>
                                {s.namaLengkap}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--ink-500)" }}>
                                {s.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"} {s.namaWali ? `• Wali: ${s.namaWali}` : ""}
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
                        <td className="text-end" style={{ whiteSpace: "nowrap" }}>
                          <div className="d-flex gap-1 justify-content-end align-items-center flex-nowrap">
                            <button className="btn btn-sm btn-outline-info rounded-pill px-2 py-1 fw-semibold" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                              onClick={() => bukaDetailSiswa(s.id)}>
                              👁️ Profil
                            </button>
                            <button className="btn btn-sm btn-outline-primary rounded-pill px-2 py-1 fw-semibold" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                              onClick={() => bukaEdit(s)}>
                              Edit
                            </button>
                            <button className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fw-semibold" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                              disabled={deletingId === s.id}
                              onClick={() => handleDelete(s.id)}>
                              {deletingId === s.id ? "..." : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {daftar.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-5">
                          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🎓</div>
                          Belum ada data siswa yang cocok dengan kriteria.
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

      {/* ——— MODAL DETAIL PROFIL SISWA ——— */}
      {(loadingDetail || detailSiswa) && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" onClick={() => setDetailSiswa(null)}>
            <div className="modal-dialog modal-dialog-centered modal-lg" role="document" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 20 }}>
                {loadingDetail ? (
                  <div className="p-5 text-center text-muted">
                    <div className="spinner-border text-primary mb-2" />
                    <p className="mb-0 fw-semibold">Memuat profil lengkap siswa...</p>
                  </div>
                ) : detailSiswa && (
                  <>
                    <div className="modal-header bg-primary text-white" style={{ borderRadius: "20px 20px 0 0", padding: "1.2rem 1.6rem" }}>
                      <div className="d-flex align-items-center gap-3">
                        <div className="siswa-avatar" style={{ width: 48, height: 48, background: getAvatarColor(detailSiswa.namaLengkap) }}>
                          {detailSiswa.fotoUrl ? (
                            <img src={detailSiswa.fotoUrl} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            getInisial(detailSiswa.namaLengkap)
                          )}
                        </div>
                        <div>
                          <h5 className="modal-title fw-bold text-white mb-0">{detailSiswa.namaLengkap}</h5>
                          <span className="badge bg-light text-primary fw-bold" style={{ fontSize: "0.75rem" }}>
                            {detailSiswa.kelas?.namaKelas ? `Kelas ${detailSiswa.kelas.namaKelas}` : "Belum Ada Kelas"}
                          </span>
                        </div>
                      </div>
                      <button type="button" className="btn-close btn-close-white" onClick={() => setDetailSiswa(null)} />
                    </div>
                    <div className="modal-body p-4">
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <div className="p-3 bg-light rounded-3">
                            <h6 className="fw-bold mb-2 text-dark">📋 Data Identitas</h6>
                            <div className="small mb-1"><strong>NIS:</strong> <span style={{ fontFamily: "monospace" }}>{detailSiswa.nis}</span></div>
                            <div className="small mb-1"><strong>NISN:</strong> <span style={{ fontFamily: "monospace" }}>{detailSiswa.nisn || "-"}</span></div>
                            <div className="small mb-1"><strong>Jenis Kelamin:</strong> {detailSiswa.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</div>
                            <div className="small mb-1"><strong>Status Siswa:</strong> <span className={`badge-status ${STATUS_COLOR[detailSiswa.status] || ""}`}>{detailSiswa.status}</span></div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="p-3 bg-light rounded-3">
                            <h6 className="fw-bold mb-2 text-dark">👨‍👩‍👧 Data Orang Tua / Wali</h6>
                            <div className="small mb-1"><strong>Nama Wali:</strong> {detailSiswa.namaWali || "-"}</div>
                            <div className="small mb-1"><strong>Kontak Wali:</strong> {detailSiswa.kontakWali || "-"}</div>
                            <div className="small mb-1"><strong>Email Login Akun:</strong> {detailSiswa.akun?.email || "Belum Dibuatkan"}</div>
                          </div>
                        </div>
                      </div>

                      {/* Riwayat Tagihan SPP Siswa */}
                      <h6 className="fw-bold mb-2">📜 Riwayat Tagihan SPP Siswa</h6>
                      <div className="table-responsive" style={{ maxHeight: 220 }}>
                        <table className="table table-sm table-hover mb-0" style={{ fontSize: "0.84rem" }}>
                          <thead className="table-light">
                            <tr>
                              <th>Periode</th>
                              <th>Nominal</th>
                              <th>Status</th>
                              <th>Tanggal Terakhir</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailSiswa.tagihan?.map((t) => (
                              <tr key={t.id}>
                                <td>{BULAN_LABEL[t.bulan]} {t.tahun}</td>
                                <td className="fw-semibold">Rp {t.nominal.toLocaleString("id-ID")}</td>
                                <td>
                                  <span className={`badge ${t.status === "lunas" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"}`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td className="text-muted small">
                                  {new Date(t.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                </td>
                              </tr>
                            ))}
                            {(!detailSiswa.tagihan || detailSiswa.tagihan.length === 0) && (
                              <tr>
                                <td colSpan={4} className="text-center text-muted py-3">Belum ada riwayat tagihan SPP untuk siswa ini.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="modal-footer bg-light" style={{ borderRadius: "0 0 20px 20px" }}>
                      <button className="btn btn-secondary rounded-pill px-4" onClick={() => setDetailSiswa(null)}>
                        Tutup
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ——— MODAL EDIT SISWA ——— */}
      {editSiswa && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" onClick={tutupEdit}>
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 20 }}>
                <div className="modal-header bg-dark text-white" style={{ borderRadius: "20px 20px 0 0" }}>
                  <h5 className="modal-title fw-bold text-white">✏️ Edit Data Siswa: {editSiswa.namaLengkap}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={tutupEdit} />
                </div>
                <form onSubmit={handleSimpanEdit}>
                  <div className="modal-body p-4">
                    {errorEdit && <div className="alert alert-danger py-2 small mb-3">{errorEdit}</div>}
                    <div className="row g-2 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Nama Lengkap</label>
                        <input className="form-control" value={formEdit.namaLengkap}
                          onChange={(e) => setFormEdit({ ...formEdit, namaLengkap: e.target.value })} required />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-semibold">NIS</label>
                        <input className="form-control" value={formEdit.nis}
                          onChange={(e) => setFormEdit({ ...formEdit, nis: e.target.value })} required />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-semibold">NISN</label>
                        <input className="form-control" value={formEdit.nisn}
                          onChange={(e) => setFormEdit({ ...formEdit, nisn: e.target.value })} />
                      </div>
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Jenis Kelamin</label>
                        <select className="form-select" value={formEdit.jenisKelamin}
                          onChange={(e) => setFormEdit({ ...formEdit, jenisKelamin: e.target.value })}>
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Kelas</label>
                        <select className="form-select" value={formEdit.kelasId}
                          onChange={(e) => setFormEdit({ ...formEdit, kelasId: e.target.value })}>
                          <option value="">— Belum Ada Kelas —</option>
                          {kelasList.map((k) => <option key={k.id} value={k.id}>{k.namaKelas}</option>)}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Status</label>
                        <select className="form-select" value={formEdit.status}
                          onChange={(e) => setFormEdit({ ...formEdit, status: e.target.value })}>
                          {Object.entries(STATUS_LABEL).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Upload Foto Siswa (Cloudinary / File / URL) */}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Foto Profile Siswa (Opsional)</label>
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="form-control"
                          onChange={handleFileFotoEdit}
                          disabled={uploadingFoto}
                        />
                        {uploadingFoto && <span className="spinner-border spinner-border-sm text-primary" />}
                      </div>
                      {formEdit.fotoUrl && (
                        <div className="mt-2 d-flex align-items-center gap-2">
                          <img src={formEdit.fotoUrl} alt="Preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
                          <span className="text-success small fw-semibold">✓ Foto Profile Tersimpan</span>
                        </div>
                      )}
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Nama Wali</label>
                        <input className="form-control" value={formEdit.namaWali}
                          onChange={(e) => setFormEdit({ ...formEdit, namaWali: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Kontak Wali</label>
                        <input className="form-control" value={formEdit.kontakWali}
                          onChange={(e) => setFormEdit({ ...formEdit, kontakWali: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer bg-light" style={{ borderRadius: "0 0 20px 20px" }}>
                    <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={tutupEdit}>Batal</button>
                    <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold" disabled={loadingEdit || uploadingFoto}>
                      {loadingEdit ? "Memproses..." : "💾 Simpan Perubahan"}
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
