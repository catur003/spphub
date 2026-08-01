"use client";

import { useState } from "react";
import { IconPlus, IconEdit, IconSave, IconX, IconClipboard } from "@/components/admin/icons";
import { JenisTagihanLain, formatRupiah } from "../types";

type Props = {
  daftarJenis: JenisTagihanLain[];
  onCreate: (nama: string, nominalDefault: number) => Promise<string | null>;
  onUpdate: (id: string, data: Partial<Pick<JenisTagihanLain, "nama" | "nominalDefault" | "aktif">>) => Promise<string | null>;
};

export default function JenisManager({ daftarJenis, onCreate, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [nama, setNama] = useState("");
  const [nominal, setNominal] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editNominal, setEditNominal] = useState("");

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

  function startEdit(j: JenisTagihanLain) {
    setEditId(j.id);
    setEditNama(j.nama);
    setEditNominal(String(j.nominalDefault));
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await onUpdate(id, { nama: editNama.trim(), nominalDefault: Number(editNominal) || 0 });
    setSaving(false);
    setEditId(null);
  }

  const selectClass =
    "w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";

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
              {editId === j.id ? (
                <>
                  <input
                    className="w-28 rounded-control border border-border-soft px-1.5 py-1 text-xs"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-20 rounded-control border border-border-soft px-1.5 py-1 text-xs"
                    value={editNominal}
                    onChange={(e) => setEditNominal(e.target.value)}
                  />
                  <button onClick={() => saveEdit(j.id)} className="text-green-700" title="Simpan">
                    <IconSave width={14} height={14} />
                  </button>
                  <button onClick={() => setEditId(null)} className="text-ink-500" title="Batal">
                    <IconX width={14} height={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink-900">{j.nama}</span>
                  <span className="text-xs text-ink-500">{formatRupiah(j.nominalDefault)}</span>
                  <button onClick={() => startEdit(j)} className="text-ink-500 hover:text-accent" title="Edit">
                    <IconEdit width={13} height={13} />
                  </button>
                  <button
                    onClick={() => onUpdate(j.id, { aktif: !j.aktif })}
                    className={`rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${
                      j.aktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                    title={j.aktif ? "Klik untuk nonaktifkan" : "Klik untuk aktifkan"}
                  >
                    {j.aktif ? "Aktif" : "Nonaktif"}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
