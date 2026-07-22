"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type Kelas = {
  id: string;
  namaKelas: string;
  tingkat: number;
  nominalSpp?: number;
  waliKelas?: string | null;
  _count: { siswa: number };
};

type SiswaDetail = {
  id: string;
  namaLengkap: string;
  nis: string;
  nisn: string | null;
  jenisKelamin: "L" | "P";
  status: string;
  fotoUrl: string | null;
  namaWali: string | null;
  kontakWali: string | null;
  tagihan: { id: string; nominal: number; status: string }[];
};

type DetailKelasResponse = Kelas & {
  siswa: SiswaDetail[];
  rekap: {
    totalSiswa: number;
    totalNominalTagihan: number;
    totalNominalLunas: number;
    totalNominalTunggakan: number;
    jumlahLunasCount: number;
    jumlahBelumCount: number;
  };
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
  const [nominalSpp, setNominalSpp] = useState("");
  const [waliKelas, setWaliKelas] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const { confirm, alertMsg, modal } = useConfirmModal();

  // State Modal Detail & Rekap Kelas
  const [detailKelasData, setDetailKelasData] = useState<DetailKelasResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"siswa" | "rekap">("siswa");

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
        body: JSON.stringify({
          namaKelas,
          tingkat: Number(tingkat),
          nominalSpp: Number(nominalSpp) || 0,
          waliKelas,
        }),
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Gagal menyimpan kelas (Status ${res.status})`);
        return;
      }
      setNamaKelas(""); setTingkat(""); setNominalSpp(""); setWaliKelas(""); setError("");
      tampilToast("Kelas berhasil ditambahkan");
      muatData();
    } catch (err: any) {
      setLoading(false);
      setError("Gagal terhubung ke server: " + err.message);
    }
  }

  // ——— Edit (modal) ———
  function bukaEdit(k: Kelas) {
    setEditKelas({
      ...k,
      nominalSpp: k.nominalSpp || 0,
      waliKelas: k.waliKelas || "",
    });
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
        body: JSON.stringify({
          namaKelas: editKelas.namaKelas,
          tingkat: Number(editKelas.tingkat),
          nominalSpp: Number(editKelas.nominalSpp) || 0,
          waliKelas: editKelas.waliKelas,
        }),
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

  // ——— Detail & Rekap Kelas ———
  async function bukaDetail(id: string) {
    setDetailLoading(true);
    setDetailKelasData(null);
    try {
      const res = await fetch(`/api/kelas/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailKelasData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  const kelasBelumSet = daftar.filter((k) => !k.nominalSpp || k.nominalSpp === 0);

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
      `}</style>

      {toast && (
        <div className={`toast-snack toast-snack--${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div className="container-fluid p-4">
        <div className="mb-4">
          <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Data Kelas & Biaya SPP</h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
            {daftar.length} kelas terdaftar | Atur Biaya SPP per kelas untuk generate tagihan massal presisi
          </p>
        </div>

        {/* Top Warning Banner untuk Kelas yang Belum Set SPP */}
        {kelasBelumSet.length > 0 && (
          <div className="alert alert-warning border-warning d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4" style={{ borderRadius: 14 }}>
            <div>
              <strong className="text-dark">⚠️ Peringatan SPP:</strong> Terdapat <strong>{kelasBelumSet.length} kelas</strong> ({kelasBelumSet.slice(0, 3).map((k) => k.namaKelas).join(", ")}) yang biaya SPP-nya belum diatur (masih Rp 0).
              <div className="small text-muted">Klik tombol <strong>Edit</strong> di sebelah kanan baris kelas untuk mengatur tarif SPP agar tagihan massal akurat.</div>
            </div>
          </div>
        )}

        <div className="row">
          {/* Form Tambah */}
          <div className="col-lg-4 mb-4">
            <div className="card card-tambah">
              <div className="card-header"><h2>✚ Tambah Kelas Baru</h2></div>
              <div className="card-body">
                {error && !editKelas && <div className="alert alert-danger py-2 small">{error}</div>}
                <form onSubmit={handleTambah}>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Nama Kelas</label>
                    <input className="form-control" value={namaKelas}
                      onChange={(e) => setNamaKelas(e.target.value)} required
                      placeholder="Contoh: 10 IPA 1, 7A" />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Tingkat / Jenjang</label>
                    <input
                      type="number"
                      className="form-control"
                      value={tingkat}
                      onChange={(e) => setTingkat(e.target.value)}
                      placeholder="Contoh: 7, 8, 9, 10, 11, 12"
                      required
                      min={1}
                      max={15}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Wali Kelas (Opsional)</label>
                    <input
                      className="form-control"
                      value={waliKelas}
                      onChange={(e) => setWaliKelas(e.target.value)}
                      placeholder="Nama Guru Wali Kelas"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Biaya SPP per Bulan (Rp)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted fw-semibold">Rp</span>
                      <input
                        type="number"
                        className="form-control"
                        value={nominalSpp}
                        onChange={(e) => setNominalSpp(e.target.value)}
                        placeholder="Contoh: 350000"
                        required
                        min={0}
                      />
                    </div>
                  </div>
                  <button className="btn btn-primary w-100 fw-bold" disabled={loading}>
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
            <div className="card p-0 overflow-hidden shadow-sm border-0" style={{ borderRadius: 16 }}>
              <div className="table-responsive">
                <table className="table kelas-table mb-0">
                  <thead>
                    <tr>
                      <th>Nama Kelas</th>
                      <th>Wali Kelas</th>
                      <th>Biaya SPP / Bulan</th>
                      <th>Jumlah Siswa</th>
                      <th style={{ width: "1%", whiteSpace: "nowrap", textAlign: "right" }}>Aksi</th>
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
                            <div>
                              <div className="fw-bold text-dark">{k.namaKelas}</div>
                              <span className="badge bg-light text-dark border px-2 py-0" style={{ fontSize: "0.7rem" }}>
                                Tingkat {k.tingkat}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark" style={{ fontSize: "0.85rem" }}>
                            {k.waliKelas || <span className="text-muted fst-italic">Belum diatur</span>}
                          </div>
                        </td>
                        <td>
                          {!k.nominalSpp || k.nominalSpp === 0 ? (
                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning px-2 py-1" style={{ fontSize: "0.78rem" }}>
                              ⚠️ Rp 0 (Belum Diatur)
                            </span>
                          ) : (
                            <div className="fw-bold text-success">
                              {k.nominalSpp.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="siswa-count-badge">
                            👥 {k._count.siswa} siswa
                          </span>
                        </td>
                        <td className="text-end" style={{ whiteSpace: "nowrap" }}>
                          <div className="d-flex gap-1 justify-content-end align-items-center flex-nowrap">
                            <button className="btn btn-sm btn-outline-info rounded-pill px-2 py-1 fw-semibold" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                              onClick={() => bukaDetail(k.id)}>
                              👥 Detail & Rekap
                            </button>
                            <button className="btn btn-sm btn-outline-primary rounded-pill px-2 py-1 fw-semibold" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                              onClick={() => bukaEdit(k)}>
                              {!k.nominalSpp || k.nominalSpp === 0 ? "✏️ Set SPP" : "Edit"}
                            </button>
                            <button className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 fw-semibold" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                              disabled={deletingId === k.id}
                              onClick={() => handleDelete(k.id)}>
                              {deletingId === k.id ? "..." : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {daftar.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-5">
                          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🏫</div>
                          Belum ada data kelas. Silakan tambah kelas baru di samping.
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
            <div className="modal-dialog modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <div className="d-flex align-items-center gap-3">
                    <div className="kelas-badge" style={{ background: kelasColor(editKelas.namaKelas) }}>
                      {editKelas.namaKelas.slice(0, 2).toUpperCase()}
                    </div>
                    <h5 className="modal-title">Edit Biaya SPP & Kelas {editKelas.namaKelas}</h5>
                  </div>
                  <button type="button" className="btn-close" onClick={tutupEdit} />
                </div>
                <form onSubmit={handleSimpanEdit}>
                  <div className="modal-body">
                    {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Biaya SPP per Bulan (Rp)</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted fw-semibold">Rp</span>
                        <input type="number" className="form-control form-control-lg fw-bold text-success" value={editKelas.nominalSpp || 0}
                          onChange={(e) => setEditKelas({ ...editKelas, nominalSpp: Number(e.target.value) })} required min={0} placeholder="Contoh: 350000" />
                      </div>
                      <div className="form-text text-muted" style={{ fontSize: "0.78rem" }}>
                        Nominal ini akan otomatis dipakai saat generate tagihan massal untuk siswa di kelas ini.
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Nama Kelas</label>
                      <input className="form-control" value={editKelas.namaKelas}
                        onChange={(e) => setEditKelas({ ...editKelas, namaKelas: e.target.value })} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Tingkat / Jenjang</label>
                      <input type="number" className="form-control" value={editKelas.tingkat}
                        onChange={(e) => setEditKelas({ ...editKelas, tingkat: Number(e.target.value) })} required min={1} max={15} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-semibold">Wali Kelas</label>
                      <input className="form-control" value={editKelas.waliKelas || ""}
                        onChange={(e) => setEditKelas({ ...editKelas, waliKelas: e.target.value })}
                        placeholder="Nama Guru Wali Kelas" />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={tutupEdit}>Batal</button>
                    <button type="submit" className="btn btn-primary px-4 fw-bold" disabled={loading}>
                      {loading ? "Menyimpan..." : "💾 Simpan Biaya SPP & Kelas"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Detail & Rekap Kelas */}
      {(detailLoading || detailKelasData) && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" onClick={() => setDetailKelasData(null)}>
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 20 }}>
                {detailLoading ? (
                  <div className="p-5 text-center text-muted">
                    <div className="spinner-border text-primary mb-2" />
                    <p className="mb-0 fw-semibold">Memuat detail & rekap pembayaran kelas...</p>
                  </div>
                ) : detailKelasData && (
                  <>
                    <div className="modal-header bg-dark text-white" style={{ borderRadius: "20px 20px 0 0", padding: "1.2rem 1.6rem" }}>
                      <div>
                        <h5 className="modal-title fw-bold text-white mb-1">
                          🏫 Detail Kelas {detailKelasData.namaKelas} (Tingkat {detailKelasData.tingkat})
                        </h5>
                        <p className="mb-0 text-white-50 small">
                          Wali Kelas: <strong>{detailKelasData.waliKelas || "Belum diatur"}</strong> | Biaya SPP: <strong>Rp {(detailKelasData.nominalSpp || 0).toLocaleString("id-ID")}</strong>
                        </p>
                      </div>
                      <button type="button" className="btn-close btn-close-white" onClick={() => setDetailKelasData(null)} />
                    </div>
                    <div className="modal-body p-4">
                      {/* Nav Tab Detail */}
                      <ul className="nav nav-pills mb-3 gap-2">
                        <li className="nav-item">
                          <button
                            className={`nav-link fw-bold px-3 py-2 ${detailTab === "siswa" ? "active bg-primary" : "bg-light text-dark"}`}
                            onClick={() => setDetailTab("siswa")}>
                            👥 Daftar Siswa ({detailKelasData.siswa.length})
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link fw-bold px-3 py-2 ${detailTab === "rekap" ? "active bg-primary" : "bg-light text-dark"}`}
                            onClick={() => setDetailTab("rekap")}>
                            📊 Rekap Pembayaran Kelas
                          </button>
                        </li>
                      </ul>

                      {detailTab === "siswa" ? (
                        <div className="table-responsive" style={{ maxHeight: 380 }}>
                          <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.86rem" }}>
                            <thead className="table-light">
                              <tr>
                                <th>No</th>
                                <th>Nama Siswa</th>
                                <th>NIS / NISN</th>
                                <th>Gender</th>
                                <th>Orang Tua / Wali</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailKelasData.siswa.map((s, idx) => (
                                <tr key={s.id}>
                                  <td>{idx + 1}</td>
                                  <td>
                                    <div className="fw-bold text-dark">{s.namaLengkap}</div>
                                  </td>
                                  <td>
                                    <div style={{ fontFamily: "monospace" }}>NIS: {s.nis}</div>
                                    {s.nisn && <div className="text-muted small">NISN: {s.nisn}</div>}
                                  </td>
                                  <td>{s.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</td>
                                  <td>{s.namaWali || "-"} ({s.kontakWali || "-"})</td>
                                  <td>
                                    <span className={`badge ${s.status === "aktif" ? "bg-success-subtle text-success" : "bg-secondary"}`}>
                                      {s.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {detailKelasData.siswa.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="text-center text-muted py-4">Belum ada siswa terdaftar di kelas ini.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div>
                          <div className="row g-3 mb-4">
                            <div className="col-md-4">
                              <div className="p-3 bg-light rounded-3 text-center border">
                                <div className="text-muted small fw-semibold">Total Tagihan Kelas</div>
                                <div className="h5 fw-bold mb-0 text-dark">
                                  {detailKelasData.rekap.totalNominalTagihan.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
                                </div>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="p-3 bg-success-subtle rounded-3 text-center border border-success">
                                <div className="text-success small fw-semibold">Total Terbayar (Lunas)</div>
                                <div className="h5 fw-bold mb-0 text-success">
                                  {detailKelasData.rekap.totalNominalLunas.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
                                </div>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="p-3 bg-danger-subtle rounded-3 text-center border border-danger">
                                <div className="text-danger small fw-semibold">Total Tunggakan</div>
                                <div className="h5 fw-bold mb-0 text-danger">
                                  {detailKelasData.rekap.totalNominalTunggakan.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-white border rounded-3">
                            <h6 className="fw-bold mb-2">Ringkasan Tagihan Siswa</h6>
                            <div className="d-flex justify-content-between text-muted small py-1 border-bottom">
                              <span>Jumlah Tagihan Lunas</span>
                              <strong className="text-success">{detailKelasData.rekap.jumlahLunasCount} transaksi</strong>
                            </div>
                            <div className="d-flex justify-content-between text-muted small py-1">
                              <span>Jumlah Tagihan Belum/Terlambat</span>
                              <strong className="text-danger">{detailKelasData.rekap.jumlahBelumCount} transaksi</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="modal-footer bg-light" style={{ borderRadius: "0 0 20px 20px" }}>
                      <button className="btn btn-secondary px-4 rounded-pill" onClick={() => setDetailKelasData(null)}>
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

      {modal}
    </>
  );
}
