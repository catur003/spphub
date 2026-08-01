"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import { IconCheck, IconX, IconPlus, IconCalendar, IconSave } from "@/components/admin/icons";

type TahunAjaran = {
  id: string;
  nama: string;
  aktif: boolean;
};

function ToggleAktifRow({
  checked, onChange,
}: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded-control border-[1.5px] px-4 py-3 transition ${
        checked ? "border-accent bg-accent-soft" : "border-border-soft"
      }`}
    >
      <div>
        <div className="text-sm font-semibold text-ink-900">Jadikan Aktif</div>
        <div className="text-xs text-ink-500">Hanya satu tahun ajaran yang bisa aktif sekaligus</div>
      </div>
      <input
        type="checkbox"
        className="ml-2 h-4 w-4 accent-accent"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

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
      {modal}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex animate-fade-in-up items-center gap-2.5 rounded-xl border-l-4 bg-white px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success" ? "border-status-lunas text-emerald-800" : "border-red-500 text-red-800"
          }`}
        >
          {toast.type === "success" ? <IconCheck className="inline h-4 w-4" /> : <IconX className="inline h-4 w-4" />} {toast.msg}
        </div>
      )}

      <div className="w-full p-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-ink-900">Tahun Ajaran</h1>
          <p className="text-sm text-ink-500">{daftar.length} tahun ajaran terdaftar</p>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Form Tambah */}
          <div className="col-span-12 lg:col-span-4">
            <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm2">
              <div className="bg-gradient-to-br from-accent to-purple-600 px-4 py-3.5">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-white"><IconPlus className="h-4 w-4" /> Tambah Tahun Ajaran</h2>
              </div>
              <div className="p-4">
                {error && !editTahun && <div className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                <form onSubmit={handleTambah} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Nama Tahun Ajaran</label>
                    <input
                      className="w-full rounded-control border border-border-soft px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      required
                      placeholder="Contoh: 2025/2026"
                    />
                  </div>
                  <ToggleAktifRow checked={aktif} onChange={setAktif} />
                  <button className="w-full rounded-control bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60" disabled={loading}>
                    {loading ? "Menyimpan..." : "Tambah Tahun Ajaran"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Tabel */}
          <div className="col-span-12 lg:col-span-8">
            <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm2">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr>
                      <th className="border-b-2 border-border-soft bg-surface px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Tahun Ajaran</th>
                      <th className="border-b-2 border-border-soft bg-surface px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Status</th>
                      <th className="whitespace-nowrap border-b-2 border-border-soft bg-surface px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftar.map((t) => (
                      <tr key={t.id} className="border-b border-border-soft transition last:border-0 hover:bg-accent-soft/40">
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-control bg-gradient-to-br from-accent-soft to-indigo-100">
                              <IconCalendar className="h-4 w-4 text-accent-hover" />
                            </div>
                            <span className="text-sm font-semibold text-ink-900">{t.nama}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {t.aktif
                            ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"><IconCheck className="h-3 w-3" /> Aktif</span>
                            : <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">Nonaktif</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                          <div className="flex flex-nowrap items-center justify-end gap-1.5">
                            <button
                              className="rounded-full border border-accent px-3 py-1 text-xs font-semibold text-accent transition hover:bg-accent-soft"
                              onClick={() => bukaEdit(t)}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-full border border-red-500 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                              disabled={deletingId === t.id}
                              onClick={() => handleDelete(t.id)}
                            >
                              {deletingId === t.id ? "..." : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {daftar.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-ink-500">
                          <IconCalendar className="mx-auto mb-2 h-8 w-8 text-ink-500/50" />
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
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4" onClick={tutupEdit}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-gradient-to-br from-accent to-purple-600 px-5 py-4">
              <h5 className="text-base font-bold text-white">Edit Tahun Ajaran</h5>
              <button type="button" aria-label="Tutup" className="text-xl leading-none text-white/80 hover:text-white" onClick={tutupEdit}>×</button>
            </div>
            <form onSubmit={handleSimpanEdit}>
              <div className="space-y-3 p-5">
                {error && <div className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink-700">Nama Tahun Ajaran</label>
                  <input
                    className="w-full rounded-control border border-border-soft px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
                    value={editTahun.nama}
                    onChange={(e) => setEditTahun({ ...editTahun, nama: e.target.value })}
                    required
                    placeholder="Contoh: 2025/2026"
                  />
                </div>
                <ToggleAktifRow
                  checked={editTahun.aktif}
                  onChange={(v) => setEditTahun({ ...editTahun, aktif: v })}
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">
                <button type="button" className="rounded-control border border-border-soft px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface" onClick={tutupEdit}>Batal</button>
                <button type="submit" className="rounded-control bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-60" disabled={loading}>
                  {loading ? "Menyimpan..." : <span className="inline-flex items-center gap-1.5"><IconSave className="h-4 w-4" /> Simpan Perubahan</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
