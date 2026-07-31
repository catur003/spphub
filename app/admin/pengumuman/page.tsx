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
      {modal}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex animate-fade-in-up items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? "✅" : "⚠️"} {toast.msg}
        </div>
      )}

      <div className="w-full p-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-ink-900">Pengumuman Sekolah</h1>
          <p className="text-sm text-ink-500">Broadcast informasi penting ke dashboard seluruh siswa</p>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Form Tambah */}
          <div className="col-span-12 lg:col-span-4">
            <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm2">
              <div className="bg-accent px-4 py-3">
                <h2 className="text-sm font-bold text-white">📢 Tulis Pengumuman Baru</h2>
              </div>
              <div className="p-4">
                {error && !editItem && (
                  <div className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
                )}
                <form onSubmit={handleTambah} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Judul Pengumuman</label>
                    <input
                      className="w-full rounded-control border border-border-soft px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
                      value={judul}
                      onChange={(e) => setJudul(e.target.value)}
                      required
                      placeholder="Contoh: Pemberitahuan Libur"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Isi Pesan</label>
                    <textarea
                      className="w-full rounded-control border border-border-soft px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
                      rows={5}
                      value={isi}
                      onChange={(e) => setIsi(e.target.value)}
                      required
                      placeholder="Tulis pesan lengkap di sini..."
                    />
                  </div>
                  <button
                    className="w-full rounded-control bg-accent py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? "Menerbitkan..." : "🚀 Broadcast Sekarang"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Tabel Pengumuman */}
          <div className="col-span-12 lg:col-span-8">
            <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm2">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr>
                      <th className="w-1/5 border-b-2 border-border-soft bg-surface px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Tanggal</th>
                      <th className="w-3/5 border-b-2 border-border-soft bg-surface px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Pengumuman</th>
                      <th className="whitespace-nowrap border-b-2 border-border-soft bg-surface px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftar.map((p) => (
                      <tr key={p.id} className="border-b border-border-soft last:border-0">
                        <td className="px-4 py-3 align-middle">
                          <div className="text-sm font-semibold text-accent">
                            {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-xs text-ink-500">
                            {new Date(p.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="text-sm font-bold text-ink-900">{p.judul}</div>
                          <div className="mt-1 line-clamp-2 text-sm text-ink-500">{p.isi}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                          <div className="flex flex-nowrap items-center justify-end gap-1.5">
                            <button
                              className="rounded-full border border-accent px-3 py-1 text-xs font-semibold text-accent transition hover:bg-accent-soft"
                              onClick={() => bukaEdit(p)}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-full border border-red-500 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                              disabled={deletingId === p.id}
                              onClick={() => handleDelete(p.id)}
                            >
                              {deletingId === p.id ? "..." : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {daftar.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-ink-500">
                          <div className="mb-3 text-4xl">📭</div>
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
        <div
          className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4"
          onClick={tutupEdit}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-accent px-5 py-4">
              <h5 className="text-base font-bold text-white">📝 Edit Pengumuman</h5>
              <button
                type="button"
                aria-label="Tutup"
                className="text-xl leading-none text-white/80 hover:text-white"
                onClick={tutupEdit}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSimpanEdit}>
              <div className="space-y-3 p-5">
                {error && (
                  <div className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink-700">Judul Pengumuman</label>
                  <input
                    className="w-full rounded-control border border-border-soft px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
                    value={editItem.judul}
                    onChange={(e) => setEditItem({ ...editItem, judul: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink-700">Isi Pesan</label>
                  <textarea
                    className="w-full rounded-control border border-border-soft px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
                    rows={5}
                    value={editItem.isi}
                    onChange={(e) => setEditItem({ ...editItem, isi: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">
                <button type="button" className="rounded-control border border-border-soft px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface" onClick={tutupEdit}>
                  Batal
                </button>
                <button type="submit" className="rounded-control bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60" disabled={loading}>
                  {loading ? "Menyimpan..." : "💾 Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
