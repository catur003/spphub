"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import {
  IconCheckCircle, IconFolder, IconFileText, IconImage, IconUser, IconCalendar,
  IconEye, IconTrash, IconUpload, IconSave,
} from "@/components/admin/icons";

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
  bukti_transfer: { label: "Bukti Transfer", badge: "bg-status-lunas" },
  kwitansi:       { label: "Kwitansi",       badge: "bg-accent" },
  surat:          { label: "Surat / Berkas", badge: "bg-sky-500" },
  dokumen_siswa:  { label: "Dokumen Siswa",  badge: "bg-status-belum" },
};

const inputClass =
  "w-full rounded-control border border-border-soft px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft";

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
      {confirmModal}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex animate-fade-in-up items-center gap-2.5 rounded-xl border-l-4 border-status-lunas bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
          <IconCheckCircle className="inline h-4 w-4" /> {toast.msg}
        </div>
      )}

      <div className="w-full p-4">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900"><IconFolder className="h-5 w-5" /> Arsip Digital Sekolah</h1>
            <p className="text-sm text-ink-500">Pusat penyimpanan & pencarian bukti transfer, kuitansi, dan berkas siswa</p>
          </div>
          <button
            className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover"
            onClick={() => setModalOpen(true)}
          >
            + Tambah Berkas Arsip
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="mb-6 rounded-card border border-border-soft bg-white p-4 shadow-sm2">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-12 items-center gap-2">
            <div className="col-span-12 md:col-span-5">
              <input
                type="text"
                className={inputClass}
                placeholder="Cari nama berkas, catatan, atau siswa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <select className={inputClass} value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)}>
                <option value="">Semua Kategori</option>
                <option value="bukti_transfer">Bukti Transfer</option>
                <option value="kwitansi">Kwitansi Pembayaran</option>
                <option value="surat">Surat / Berkas Resmi</option>
                <option value="dokumen_siswa">Dokumen Siswa</option>
              </select>
            </div>
            <div className="col-span-12 md:col-span-3">
              <button type="submit" className="w-full rounded-control bg-ink-700 py-2 text-sm font-semibold text-white transition hover:bg-ink-900">
                Cari Berkas
              </button>
            </div>
          </form>
        </div>

        {/* Grid Card Arsip */}
        {loading ? (
          <div className="py-16 text-center text-ink-500">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p>Memuat arsip digital...</p>
          </div>
        ) : daftar.length === 0 ? (
          <div className="rounded-2xl border border-border-soft bg-white py-16 text-center">
            <IconFolder className="mx-auto mb-3 h-10 w-10 text-ink-500/50" />
            <h5 className="font-bold text-ink-900">Belum Ada Berkas Arsip</h5>
            <p className="text-sm text-ink-500">Silakan tambah berkas baru untuk mulai mengarsipkan dokumen sekolah.</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3">
            {daftar.map((item) => {
              const kat = KATEGORI_LABEL[item.kategori] || { label: item.kategori, badge: "bg-ink-500" };
              const isPdf = item.fileType === "pdf" || item.fileUrl.endsWith(".pdf");

              return (
                <div key={item.id} className="col-span-12 md:col-span-6 lg:col-span-4">
                  <div className="flex h-full flex-col justify-between rounded-card border border-border-soft bg-white p-5 transition hover:-translate-y-1 hover:shadow-md2">
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div
                          className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl text-xl ${
                            isPdf ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {isPdf ? <IconFileText className="h-5 w-5" /> : <IconImage className="h-5 w-5" />}
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${kat.badge}`}>{kat.label}</span>
                      </div>

                      <h2 className="mb-1 text-sm font-bold text-ink-900">{item.judul}</h2>

                      {item.siswa && (
                        <div className="mb-1 text-sm font-semibold text-accent">
                          <IconUser className="mr-1 inline h-3.5 w-3.5" /> {item.siswa.namaLengkap} ({item.siswa.nis})
                        </div>
                      )}

                      <div className="mb-2 text-xs text-ink-500">
                        <IconCalendar className="mr-1 inline h-3.5 w-3.5" /> {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </div>

                      {item.keterangan && (
                        <p className="mb-3 line-clamp-2 text-xs text-ink-500">{item.keterangan}</p>
                      )}
                    </div>

                    <div className="flex gap-2 border-t border-border-soft pt-3">
                      <button
                        className="w-full rounded-control border border-accent py-1.5 text-sm font-semibold text-accent transition hover:bg-accent-soft"
                        onClick={() => setPreviewItem(item)}
                      >
                        <span className="inline-flex items-center gap-1"><IconEye className="h-3.5 w-3.5" /> Pratinjau</span>
                      </button>
                      <button
                        className="rounded-control border border-red-500 px-3 py-1.5 text-sm text-red-500 transition hover:bg-red-50"
                        onClick={() => handleHapus(item.id)}
                      >
                        <IconTrash className="h-4 w-4" />
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
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-accent px-5 py-4">
              <h5 className="flex items-center gap-1.5 text-base font-bold text-white"><IconUpload className="h-4 w-4" /> Tambah Berkas Arsip Digital</h5>
              <button type="button" aria-label="Tutup" className="text-xl leading-none text-white/80 hover:text-white" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSimpan}>
              <div className="max-h-[70vh] overflow-y-auto p-5">
                {error && <div className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-8">
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Judul / Nama Berkas *</label>
                    <input type="text" className={inputClass} required placeholder="Contoh: Bukti Transfer SPP Ahmad" value={judul} onChange={(e) => setJudul(e.target.value)} />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Kategori *</label>
                    <select className={inputClass} value={kategori} onChange={(e) => setKategori(e.target.value)}>
                      <option value="bukti_transfer">Bukti Transfer</option>
                      <option value="kwitansi">Kwitansi</option>
                      <option value="surat">Surat / Berkas</option>
                      <option value="dokumen_siswa">Dokumen Siswa</option>
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-8">
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Link File / URL Berkas *</label>
                    <input type="text" className={inputClass} required placeholder="https://... atau /uploads/..." value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Tipe Format File</label>
                    <select className={inputClass} value={fileType} onChange={(e) => setFileType(e.target.value)}>
                      <option value="pdf">PDF Document</option>
                      <option value="image">Gambar (JPG/PNG)</option>
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Terkait Siswa (Opsional)</label>
                    <select className={inputClass} value={siswaId} onChange={(e) => setSiswaId(e.target.value)}>
                      <option value="">-- Pilih Siswa (Opsional) --</option>
                      {daftarSiswa.map(s => (
                        <option key={s.id} value={s.id}>{s.namaLengkap} ({s.nis})</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Tanggal Berkas</label>
                    <input type="date" className={inputClass} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                  </div>

                  <div className="col-span-12">
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Catatan / Keterangan Tambahan</label>
                    <textarea className={inputClass} rows={3} placeholder="Tuliskan nomor referensi, nama bank, atau keterangan..." value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">
                <button type="button" className="rounded-control border border-border-soft px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface" onClick={() => setModalOpen(false)}>Batal</button>
                <button type="submit" className="rounded-control bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60" disabled={saving}>
                  {saving ? "Menyimpan..." : <span className="inline-flex items-center gap-1.5"><IconSave className="h-4 w-4" /> Simpan Arsip</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview PDF / Image */}
      {previewItem && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4" onClick={() => setPreviewItem(null)}>
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-ink-900 px-5 py-4">
              <h5 className="flex items-center gap-1.5 text-base font-bold text-white"><IconEye className="h-4 w-4" /> Pratinjau: {previewItem.judul}</h5>
              <div className="flex items-center gap-2">
                <a
                  href={previewItem.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-control border border-white/30 px-3 py-1.5 text-xs font-medium text-white no-underline hover:bg-white/10"
                >
                  Buka di Tab Baru
                </a>
                <button type="button" aria-label="Tutup" className="text-xl leading-none text-white/80 hover:text-white" onClick={() => setPreviewItem(null)}>×</button>
              </div>
            </div>
            <div className="max-h-[80vh] min-h-[500px] overflow-auto bg-surface text-center">
              {previewItem.fileType === "pdf" || previewItem.fileUrl.endsWith(".pdf") ? (
                <iframe src={previewItem.fileUrl} className="h-[70vh] w-full border-none" title="Preview PDF" />
              ) : (
                <img src={previewItem.fileUrl} alt="Preview" className="mx-auto max-h-[70vh] max-w-full object-contain p-5" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
