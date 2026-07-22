"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type SiswaOption = { id: string; namaLengkap: string; nis: string };

type Arsip = {
  id: string;
  judul: string;
  kategori: string;
  fileUrl: string;
  fileType: string;
  tanggal: string;
  keterangan: string | null;
  siswa: { id: string; namaLengkap: string; nis: string } | null;
};

const KATEGORI_LABEL: Record<string, { label: string; badge: string }> = {
  bukti_transfer: { label: "Bukti Transfer", badge: "bg-success" },
  kwitansi:       { label: "Kwitansi",       badge: "bg-primary" },
  surat:          { label: "Surat / Berkas", badge: "bg-info text-dark" },
  dokumen_siswa:  { label: "Dokumen Siswa",  badge: "bg-warning text-dark" },
};

export default function ArsipDigitalPage() {
  const [daftar, setDaftar] = useState<Arsip[]>([]);
  const [daftarSiswa, setDaftarSiswa] = useState<SiswaOption[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  
  // Modal Upload & Preview
  const [modalOpen, setModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<Arsip | null>(null);

  // Form State
  const [judul, setJudul] = useState("");
  const [kategori, setKategori] = useState("bukti_transfer");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("pdf");
  const [siswaId, setSiswaId] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [keterangan, setKeterangan] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { confirm, alertMsg, modal: confirmModal } = useConfirmModal();

  async function muatData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (kategoriFilter) params.set("kategori", kategoriFilter);

    const res = await fetch(`/api/arsip?${params.toString()}`);
    if (res.ok) {
      setDaftar(await res.json());
    }
    setLoading(false);
  }

  async function muatSiswa() {
    const res = await fetch("/api/siswa");
    if (res.ok) {
      const data = await res.json();
      setDaftarSiswa(Array.isArray(data) ? data : data.data || []);
    }
  }

  useEffect(() => {
    muatData();
    muatSiswa();
  }, [kategoriFilter]);

  function tampilToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    muatData();
  }

  async function handleSimpan(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);

    const res = await fetch("/api/arsip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        judul,
        kategori,
        fileUrl,
        fileType,
        siswaId: siswaId || null,
        tanggal,
        keterangan,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Gagal menyimpan arsip digital");
      return;
    }

    setModalOpen(false);
    setJudul(""); setFileUrl(""); setKeterangan(""); setSiswaId("");
    tampilToast("Arsip digital berhasil ditambahkan!");
    muatData();
  }

  async function handleHapus(id: string) {
    if (!(await confirm("Hapus berkas arsip ini dari sistem?", { confirmLabel: "Ya, Hapus" }))) return;
    
    const res = await fetch(`/api/arsip/${id}`, { method: "DELETE" });
    if (!res.ok) {
      await alertMsg("Gagal menghapus arsip digital");
      return;
    }
    tampilToast("Arsip berhasil dihapus");
    muatData();
  }

  return (
    <>
      <style>{`
        .arsip-card {
          background: white; border-radius: 16px; border: 1px solid var(--border-soft);
          padding: 1.25rem; transition: transform 0.2s, box-shadow 0.2s;
          display: flex; flex-direction: column; justify-content: space-between;
          height: 100%;
        }
        .arsip-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .arsip-icon {
          width: 46px; height: 46px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; flex-shrink: 0;
        }
        .toast-snack-arsip {
          position:fixed; bottom:1.5rem; right:1.5rem; z-index:9999;
          display:flex; align-items:center; gap:10px;
          padding:0.75rem 1.1rem; border-radius:12px;
          font-size:0.88rem; font-weight:500;
          box-shadow:0 8px 24px rgba(15,23,42,.18);
          background: #fff; border-left: 4px solid #10b981; color: #065f46;
        }
      `}</style>

      {confirmModal}
      {toast && <div className="toast-snack-arsip">✅ {toast.msg}</div>}

      <div className="container-fluid p-4">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>🗂️ Arsip Digital Sekolah</h1>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>Pusat penyimpanan & pencarian bukti transfer, kuitansi, dan berkas siswa</p>
          </div>
          <button className="btn btn-primary fw-bold px-4 rounded-pill shadow-sm" onClick={() => setModalOpen(true)}>
            + Tambah Berkas Arsip
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="card p-3 mb-4 border-0 shadow-sm" style={{ borderRadius: 16 }}>
          <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
            <div className="col-md-5">
              <input
                type="text" className="form-control"
                placeholder="🔍 Cari nama berkas, catatan, atau siswa..."
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select className="form-select" value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)}>
                <option value="">Semua Kategori</option>
                <option value="bukti_transfer">Bukti Transfer</option>
                <option value="kwitansi">Kwitansi Pembayaran</option>
                <option value="surat">Surat / Berkas Resmi</option>
                <option value="dokumen_siswa">Dokumen Siswa</option>
              </select>
            </div>
            <div className="col-md-3">
              <button type="submit" className="btn btn-secondary w-100 fw-semibold">
                Cari Berkas
              </button>
            </div>
          </form>
        </div>

        {/* Grid Card Arsip */}
        {loading ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border text-primary mb-2" />
            <p>Memuat arsip digital...</p>
          </div>
        ) : daftar.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-4 border">
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>📂</div>
            <h5 className="fw-bold">Belum Ada Berkas Arsip</h5>
            <p className="text-muted small">Silakan tambah berkas baru untuk mulai mengarsipkan dokumen sekolah.</p>
          </div>
        ) : (
          <div className="row g-3">
            {daftar.map((item) => {
              const kat = KATEGORI_LABEL[item.kategori] || { label: item.kategori, badge: "bg-secondary" };
              const isPdf = item.fileType === "pdf" || item.fileUrl.endsWith(".pdf");

              return (
                <div key={item.id} className="col-md-6 col-lg-4">
                  <div className="arsip-card">
                    <div>
                      <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                        <div className="arsip-icon" style={{ background: isPdf ? "#fee2e2" : "#e0e7ff", color: isPdf ? "#dc2626" : "#4338ca" }}>
                          {isPdf ? "📄" : "🖼️"}
                        </div>
                        <span className={`badge ${kat.badge} rounded-pill px-3`}>{kat.label}</span>
                      </div>

                      <h2 className="h6 fw-bold mb-1" style={{ color: "var(--ink-900)" }}>{item.judul}</h2>
                      
                      {item.siswa && (
                        <div className="text-primary small fw-semibold mb-1">
                          👤 {item.siswa.namaLengkap} ({item.siswa.nis})
                        </div>
                      )}

                      <div className="text-muted small mb-2">
                        📅 {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </div>

                      {item.keterangan && (
                        <p className="text-muted small mb-3" style={{ fontSize: "0.8rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {item.keterangan}
                        </p>
                      )}
                    </div>

                    <div className="d-flex gap-2 pt-2 border-top">
                      <button className="btn btn-sm btn-outline-primary w-100 fw-semibold" onClick={() => setPreviewItem(item)}>
                        👁️ Pratinjau
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleHapus(item.id)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Upload Berkas */}
      {modalOpen && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} onClick={() => setModalOpen(false)}>
            <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content" style={{ borderRadius: 18, border: "none" }}>
                <div className="modal-header bg-primary text-white" style={{ borderRadius: "18px 18px 0 0" }}>
                  <h5 className="modal-title fw-bold">📤 Tambah Berkas Arsip Digital</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setModalOpen(false)} />
                </div>
                <form onSubmit={handleSimpan}>
                  <div className="modal-body p-4">
                    {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

                    <div className="row g-3">
                      <div className="col-md-8">
                        <label className="form-label small fw-semibold">Judul / Nama Berkas *</label>
                        <input type="text" className="form-control" required placeholder="Contoh: Bukti Transfer SPP Ahmad" value={judul} onChange={(e) => setJudul(e.target.value)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Kategori *</label>
                        <select className="form-select" value={kategori} onChange={(e) => setKategori(e.target.value)}>
                          <option value="bukti_transfer">Bukti Transfer</option>
                          <option value="kwitansi">Kwitansi</option>
                          <option value="surat">Surat / Berkas</option>
                          <option value="dokumen_siswa">Dokumen Siswa</option>
                        </select>
                      </div>

                      <div className="col-md-8">
                        <label className="form-label small fw-semibold">Link File / URL Berkas *</label>
                        <input type="text" className="form-control" required placeholder="https://... atau /uploads/..." value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Tipe Format File</label>
                        <select className="form-select" value={fileType} onChange={(e) => setFileType(e.target.value)}>
                          <option value="pdf">PDF Document</option>
                          <option value="image">Gambar (JPG/PNG)</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Terkait Siswa (Opsional)</label>
                        <select className="form-select" value={siswaId} onChange={(e) => setSiswaId(e.target.value)}>
                          <option value="">-- Pilih Siswa (Opsional) --</option>
                          {daftarSiswa.map(s => (
                            <option key={s.id} value={s.id}>{s.namaLengkap} ({s.nis})</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Tanggal Berkas</label>
                        <input type="date" className="form-control" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-semibold">Catatan / Keterangan Tambahan</label>
                        <textarea className="form-control" rows={3} placeholder="Tuliskan nomor referensi, nama bank, atau keterangan..." value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer" style={{ borderTop: "1px solid var(--border-soft)" }}>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setModalOpen(false)}>Batal</button>
                    <button type="submit" className="btn btn-primary px-4 fw-bold" disabled={saving}>
                      {saving ? "Menyimpan..." : "🚀 Simpan Arsip"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Preview PDF / Image */}
      {previewItem && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} onClick={() => setPreviewItem(null)}>
            <div className="modal-dialog modal-dialog-centered modal-xl" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content" style={{ borderRadius: 18, border: "none" }}>
                <div className="modal-header bg-dark text-white" style={{ borderRadius: "18px 18px 0 0" }}>
                  <h5 className="modal-title fw-bold">👁️ Pratinjau: {previewItem.judul}</h5>
                  <div className="d-flex gap-2 align-items-center">
                    <a href={previewItem.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-light">
                      Buka di Tab Baru
                    </a>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setPreviewItem(null)} />
                  </div>
                </div>
                <div className="modal-body p-0 text-center bg-light" style={{ minHeight: "500px", maxHeight: "80vh", overflow: "auto" }}>
                  {previewItem.fileType === "pdf" || previewItem.fileUrl.endsWith(".pdf") ? (
                    <iframe src={previewItem.fileUrl} style={{ width: "100%", height: "70vh", border: "none" }} title="Preview PDF" />
                  ) : (
                    <img src={previewItem.fileUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", padding: "20px" }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
