"use client";

import { useEffect, useState, useMemo } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import { IconClock, IconPlus, IconEdit, IconTrash, IconX, IconWarning, IconCalendar } from "@/components/admin/icons";
import { TahunAjaran, JenisPreset, JatuhTempoPreset } from "./types";
import { formatTanggalPanjang } from "@/app/admin/tagihan/types";

const selectClass =
  "w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";
const labelClass = "mb-1 block text-xs font-semibold text-ink-500";

const TAB_INFO: Record<JenisPreset, { label: string; desc: string }> = {
  spp: {
    label: "Preset SPP",
    desc: "Dipakai di dropdown \"Jatuh Tempo\" pas Generate Tagihan SPP.",
  },
  lainnya: {
    label: "Preset Tagihan Lainnya",
    desc: "Dipakai di dropdown \"Jatuh Tempo\" pas Generate Tagihan Lainnya (seragam, daftar ulang, dll).",
  },
};

export default function JatuhTempoPage() {
  const [tab, setTab] = useState<JenisPreset>("spp");
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [daftar, setDaftar] = useState<JatuhTempoPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [nama, setNama] = useState("");
  const [tanggalAwal, setTanggalAwal] = useState(new Date().toISOString().split("T")[0]);
  const [tanggalAkhir, setTanggalAkhir] = useState(new Date().toISOString().split("T")[0]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<JatuhTempoPreset | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editTanggalAwal, setEditTanggalAwal] = useState("");
  const [editTanggalAkhir, setEditTanggalAkhir] = useState("");
  const [editTahunAjaranId, setEditTahunAjaranId] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { confirm, alertMsg, modal } = useConfirmModal();

  async function muatTahunAjaran() {
    const res = await fetch("/api/tahun-ajaran");
    if (res.ok) {
      const data: TahunAjaran[] = await res.json();
      setTahunAjaranList(data);
      const aktif = data.find((t) => t.aktif);
      if (aktif) setTahunAjaranId(aktif.id);
    }
  }

  async function muatPreset() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/jatuh-tempo?jenis=${tab}`);
      if (res.ok) {
        setDaftar(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        setFetchError(data.error || "Gagal memuat preset");
        setDaftar([]);
      }
    } catch (err: any) {
      setFetchError("Gagal terhubung ke server: " + err.message);
      setDaftar([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    muatTahunAjaran();
  }, []);

  useEffect(() => {
    muatPreset();
    setShowForm(false);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama preset wajib diisi");
      return;
    }
    if (!tahunAjaranId) {
      setError("Tahun ajaran wajib dipilih");
      return;
    }
    if (tanggalAkhir < tanggalAwal) {
      setError("Tanggal akhir gak boleh sebelum tanggal awal");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/jatuh-tempo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: nama.trim(), tanggalAwal, tanggalAkhir, jenis: tab, tahunAjaranId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat preset");
        return;
      }
      setNama("");
      setShowForm(false);
      muatPreset();
    } catch (err: any) {
      setError("Gagal terhubung ke server: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(p: JatuhTempoPreset) {
    setEditTarget(p);
    setEditNama(p.nama);
    setEditTanggalAwal(p.tanggalAwal.split("T")[0]);
    setEditTanggalAkhir(p.tanggalAkhir.split("T")[0]);
    setEditTahunAjaranId(p.tahunAjaranId);
    setEditError("");
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (!editNama.trim()) {
      setEditError("Nama preset wajib diisi");
      return;
    }
    if (editTanggalAkhir < editTanggalAwal) {
      setEditError("Tanggal akhir gak boleh sebelum tanggal awal");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/jatuh-tempo/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: editNama.trim(),
          tanggalAwal: editTanggalAwal,
          tanggalAkhir: editTanggalAkhir,
          tahunAjaranId: editTahunAjaranId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Gagal menyimpan perubahan");
        return;
      }
      setEditTarget(null);
      muatPreset();
    } catch (err: any) {
      setEditError("Gagal terhubung ke server: " + err.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleHapus(p: JatuhTempoPreset) {
    if (!(await confirm(`Hapus preset "${p.nama}"? Tagihan yang sudah pernah dibuat pakai preset ini gak akan berubah.`, {
      title: "Hapus Preset Jatuh Tempo",
      confirmLabel: "Ya, Hapus",
      variant: "danger",
    })))
      return;
    setDeletingId(p.id);
    const res = await fetch(`/api/jatuh-tempo/${p.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      await alertMsg(data.error || "Gagal menghapus preset");
      return;
    }
    muatPreset();
  }

  const sortedDaftar = useMemo(
    () => [...daftar].sort((a, b) => new Date(a.tanggalAkhir).getTime() - new Date(b.tanggalAkhir).getTime()),
    [daftar]
  );

  return (
    <>
      {modal}
      <div className="p-4">
        <div className="mb-4">
          <h1 className="mb-0 flex items-center gap-2 text-xl font-bold text-ink-900">
            <IconClock className="h-5 w-5" /> Kelola Jatuh Tempo
          </h1>
          <p className="mb-0 text-sm text-ink-500">
            Bikin daftar preset tanggal jatuh tempo bernama (misal "Seragam Gel.1 - 30 Agt"), biar tinggal
            dipilih pas Generate Tagihan Massal — gak perlu ketik tanggal manual tiap kali.
          </p>
        </div>

        <div className="mb-4 flex gap-2 border-b border-border-soft">
          {(Object.keys(TAB_INFO) as JenisPreset[]).map((j) => (
            <button
              key={j}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition ${
                tab === j ? "border-accent text-accent" : "border-transparent text-ink-500 hover:text-ink-900"
              }`}
              onClick={() => setTab(j)}
            >
              {TAB_INFO[j].label}
            </button>
          ))}
        </div>

        <div className="mb-4 rounded-card border border-border-soft bg-white p-5 shadow-sm2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-xs text-ink-500">{TAB_INFO[tab].desc}</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-sm2 hover:bg-accent-hover"
              onClick={() => setShowForm((s) => !s)}
            >
              <IconPlus width={14} height={14} /> {showForm ? "Batal" : "Tambah Preset"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="mt-3 grid grid-cols-1 items-end gap-2 sm:grid-cols-2 md:grid-cols-12">
              <div className="md:col-span-4">
                <label className={labelClass}>Nama Preset</label>
                <input
                  className={selectClass}
                  placeholder='Misal: "Seragam Gel.1 - 30 Agt"'
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Tanggal Awal</label>
                <input
                  type="date"
                  className={selectClass}
                  value={tanggalAwal}
                  onChange={(e) => setTanggalAwal(e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Tanggal Akhir</label>
                <input
                  type="date"
                  className={selectClass}
                  value={tanggalAkhir}
                  onChange={(e) => setTanggalAkhir(e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Tahun Ajaran</label>
                <select className={selectClass} value={tahunAjaranId} onChange={(e) => setTahunAjaranId(e.target.value)} required>
                  <option value="">-- Pilih --</option>
                  {tahunAjaranList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama}
                      {t.aktif ? " (Aktif)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-control bg-accent px-3 py-2 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
              {error && <div className="md:col-span-12 text-sm text-red-600">{error}</div>}
            </form>
          )}
        </div>

        {loading ? (
          <div className="rounded-card border border-border-soft bg-white px-3 py-10 text-center text-sm text-ink-500 shadow-sm2">
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-soft border-t-accent align-middle" />
            Memuat preset...
          </div>
        ) : fetchError ? (
          <div className="rounded-card border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-700 shadow-sm2">
            <IconWarning className="mr-1 inline h-4 w-4" />{fetchError}
          </div>
        ) : sortedDaftar.length === 0 ? (
          <div className="rounded-card border border-dashed border-border-soft bg-white px-3 py-10 text-center text-sm text-ink-500 shadow-sm2">
            Belum ada preset {TAB_INFO[tab].label.toLowerCase()}. Tambah dulu di atas.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedDaftar.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2.5 rounded-card border border-border-soft bg-white p-4 shadow-sm2 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold leading-snug text-ink-900">{p.nama}</span>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => openEdit(p)} className="text-ink-500 hover:text-accent" title="Edit">
                      <IconEdit width={14} height={14} />
                    </button>
                    <button
                      onClick={() => handleHapus(p)}
                      disabled={deletingId === p.id}
                      className="text-ink-500 hover:text-red-600 disabled:opacity-60"
                      title="Hapus"
                    >
                      {deletingId === p.id ? (
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
                      ) : (
                        <IconTrash width={14} height={14} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-control bg-accent-soft px-2.5 py-1.5 text-xs font-semibold text-accent-hover">
                  <IconCalendar width={13} height={13} />
                  {formatTanggalPanjang(p.tanggalAwal)} &ndash; {formatTanggalPanjang(p.tanggalAkhir)}
                </div>

                <div className="text-xs text-ink-500">Tahun Ajaran: {p.tahunAjaran?.nama || "-"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={() => setEditTarget(null)}>
          <div className="w-full max-w-md rounded-card bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink-900">Edit Preset Jatuh Tempo</h3>
              <button onClick={() => setEditTarget(null)} className="text-ink-500 hover:text-ink-900" title="Tutup">
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-3">
              <label className={labelClass}>Nama Preset</label>
              <input className={selectClass} value={editNama} onChange={(e) => setEditNama(e.target.value)} autoFocus />
            </div>
            <div className="mb-3">
              <label className={labelClass}>Tanggal Awal</label>
              <input type="date" className={selectClass} value={editTanggalAwal} onChange={(e) => setEditTanggalAwal(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className={labelClass}>Tanggal Akhir</label>
              <input type="date" className={selectClass} value={editTanggalAkhir} onChange={(e) => setEditTanggalAkhir(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className={labelClass}>Tahun Ajaran</label>
              <select className={selectClass} value={editTahunAjaranId} onChange={(e) => setEditTahunAjaranId(e.target.value)}>
                {tahunAjaranList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama}
                    {t.aktif ? " (Aktif)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {editError && (
              <div className="mb-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
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
    </>
  );
}
