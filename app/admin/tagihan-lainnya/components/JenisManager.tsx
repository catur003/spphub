"use client";

import { useState } from "react";
import { IconPlus, IconEdit, IconClipboard, IconX } from "@/components/admin/icons";
import { JenisTagihanLain, formatRupiah } from "../types";

type Props = {
  daftarJenis: JenisTagihanLain[];
  onCreate: (nama: string, nominalDefault: number) => Promise<string | null>;
  onUpdate: (id: string, data: Partial<Pick<JenisTagihanLain, "nama" | "nominalDefault" | "aktif">>) => Promise<string | null>;
  confirm: (message: string, opts?: { title?: string; variant?: "danger" | "primary"; confirmLabel?: string; cancelLabel?: string }) => Promise<boolean>;
};

const selectClass =
  "w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";

export default function JenisManager({ daftarJenis, onCreate, onUpdate, confirm }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [nama, setNama] = useState("");
  const [nominal, setNominal] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<JenisTagihanLain | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editNominal, setEditNominal] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama jenis tagihan wajib diisi");
      return;
    }
    setSaving(true);
    const err = await onCreate(nama.trim(), Number(nominal) || 0);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setNama("");
    setNominal("");
    setError("");
    setShowForm(false);
  }

  function openEdit(j: JenisTagihanLain) {
    setEditTarget(j);
    setEditNama(j.nama);
    setEditNominal(String(j.nominalDefault));
    setEditError("");
  }

  function closeEdit() {
    setEditTarget(null);
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (!editNama.trim()) {
      setEditError("Nama jenis tagihan wajib diisi");
      return;
    }
    setEditSaving(true);
    const err = await onUpdate(editTarget.id, { nama: editNama.trim(), nominalDefault: Number(editNominal) || 0 });
    setEditSaving(false);
    if (err) {
      setEditError(err);
      return;
    }
    setEditTarget(null);
  }

  async function toggleAktif(j: JenisTagihanLain) {
    if (j.aktif) {
      const ok = await confirm(
        `Nonaktifkan "${j.nama}"? Jenis ini gak akan muncul lagi di pilihan Generate Tagihan Massal. Tagihan yang sudah ada gak akan berubah / gak akan dihapus.`,
        { title: "Nonaktifkan Jenis Tagihan", confirmLabel: "Ya, Nonaktifkan", variant: "danger" }
      );
      if (!ok) return;
    }
    await onUpdate(j.id, { aktif: !j.aktif });
  }

  return (
    <div className="mb-4 rounded-card border border-border-soft bg-white p-5 shadow-sm2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 flex items-center gap-2 text-base font-bold text-ink-900">
          <IconClipboard className="h-4 w-4" /> Jenis Tagihan Lainnya
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-sm2 hover:bg-accent-hover"
          onClick={() => setShowForm((s) => !s)}
        >
          <IconPlus width={14} height={14} /> {showForm ? "Batal" : "Tambah Jenis"}
        </button>
      </div>
      <p className="mb-3 text-xs text-ink-500">
        Master jenis tagihan di luar SPP bulanan — misalnya Seragam, Daftar Ulang, dll. Nonaktifkan
        jenis yang sudah tidak dipakai, jangan dihapus kalau sudah punya riwayat tagihan.
      </p>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-3 grid grid-cols-1 items-end gap-2 sm:grid-cols-2 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="mb-1 block text-xs font-semibold text-ink-500">Nama Jenis</label>
            <input
              className={selectClass}
              placeholder="Misal: Seragam"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-semibold text-ink-500">Nominal Default (Rp)</label>
            <input
              type="number"
              min={0}
              className={selectClass}
              placeholder="0"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-control bg-accent px-3 py-2 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan Jenis"}
            </button>
          </div>
          {error && <div className="md:col-span-12 text-sm text-red-600">{error}</div>}
        </form>
      )}

      {daftarJenis.length === 0 ? (
        <div className="rounded-control border border-dashed border-border-soft px-3 py-6 text-center text-sm text-ink-500">
          Belum ada jenis tagihan. Tambah dulu sebelum bisa generate tagihan massal.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {daftarJenis.map((j) => (
            <div
              key={j.id}
              className={`flex items-center gap-2 rounded-control border px-3 py-2 text-sm ${
                j.aktif ? "border-border-soft bg-surface" : "border-border-soft bg-slate-50 opacity-60"
              }`}
            >
              <span className="font-semibold text-ink-900">{j.nama}</span>
              <span className="text-xs text-ink-500">{formatRupiah(j.nominalDefault)}</span>
              <button onClick={() => openEdit(j)} className="text-ink-500 hover:text-accent" title="Edit">
                <IconEdit width={13} height={13} />
              </button>
              <button
                onClick={() => toggleAktif(j)}
                className={`rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${
                  j.aktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                }`}
                title={j.aktif ? "Klik untuk nonaktifkan" : "Klik untuk aktifkan"}
              >
                {j.aktif ? "Aktif" : "Nonaktif"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Edit Jenis Tagihan */}
      {editTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={closeEdit}>
          <div
            className="w-full max-w-md rounded-card bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink-900">Edit Jenis Tagihan</h3>
              <button onClick={closeEdit} className="text-ink-500 hover:text-ink-900" title="Tutup">
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-semibold text-ink-700">Nama Jenis</label>
              <input
                className={selectClass}
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold text-ink-700">Nominal Default (Rp)</label>
              <input
                type="number"
                min={0}
                className={selectClass}
                value={editNominal}
                onChange={(e) => setEditNominal(e.target.value)}
              />
              <p className="mt-1 text-xs text-ink-500">
                Perubahan ini gak mengubah nominal tagihan yang udah pernah dibuat sebelumnya —
                cuma jadi nilai default buat generate tagihan baru berikutnya.
              </p>
            </div>

            {editError && (
              <div className="mb-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {editError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-control border border-border-soft px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-surface"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={editSaving}
                className="rounded-control bg-accent px-4 py-2 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover disabled:opacity-60"
              >
                {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
