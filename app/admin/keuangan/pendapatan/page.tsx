"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import { IconMoney, IconPlus, IconSave, IconClipboard, IconSearch } from "@/components/admin/icons";

type Pendapatan = {
  id: string;
  judul: string;
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan: string | null;
  penerima: string | null;
};

const KATEGORI_OPTIONS = [
  "Uang Pangkal / Gedung",
  "Uang Seragam & Atribut",
  "Buku / LKS",
  "Pendaftaran",
  "Sewa Kantin / Fasilitas",
  "Infak / Sumbangan Sukarela",
  "Kegiatan / Event",
  "Lain-lain",
];

const inputClass =
  "w-full rounded-control border border-border-soft px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft";

export default function PendapatanPage() {
  const [daftar, setDaftar] = useState<Pendapatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");

  const [form, setForm] = useState({
    judul: "",
    kategori: "Uang Pangkal / Gedung",
    nominal: "",
    tanggal: new Date().toISOString().split("T")[0],
    penerima: "",
    keterangan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { alertMsg, modal } = useConfirmModal();

  async function muatData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (kategoriFilter) params.set("kategori", kategoriFilter);

    try {
      const res = await fetch(`/api/pendapatan?${params.toString()}`);
      if (res.ok) {
        setDaftar(await res.json());
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    muatData();
  }, [q, kategoriFilter]);

  async function handleTambah(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/pendapatan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setError(data.error || "Gagal mencatat pendapatan");
        return;
      }

      setForm({
        judul: "",
        kategori: "Uang Pangkal / Gedung",
        nominal: "",
        tanggal: new Date().toISOString().split("T")[0],
        penerima: "",
        keterangan: "",
      });
      await alertMsg("Pendapatan berhasil dicatat ke sistem!");
      muatData();
    } catch (err: any) {
      setSubmitting(false);
      setError("Gagal terhubung ke server: " + err.message);
    }
  }

  const totalPendapatan = daftar.reduce((acc, curr) => acc + curr.nominal, 0);

  return (
    <>
      {modal}
      <div className="w-full p-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900"><IconMoney className="h-5 w-5" /> Kelola Pendapatan Non-SPP</h1>
            <p className="text-sm text-ink-500">
              Pencatatan Pemasukan Kas Sekolah dari Uang Gedung, Seragam, Pendaftaran, dan Pemasukan Lainnya.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Form Catat Pendapatan */}
          <div className="col-span-12 lg:col-span-4">
            <div className="overflow-hidden rounded-2xl border border-border-soft bg-white shadow-sm2">
              <div className="bg-accent p-3">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-white"><IconPlus className="h-4 w-4" /> Catat Pemasukan Baru</h2>
              </div>
              <div className="p-4">
                {error && <div className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                <form onSubmit={handleTambah} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Judul Pemasukan</label>
                    <input
                      className={inputClass}
                      value={form.judul}
                      onChange={(e) => setForm({ ...form, judul: e.target.value })}
                      placeholder="Contoh: Uang Seragam & Atribut Siswa A"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Kategori Pemasukan</label>
                    <select
                      className={inputClass}
                      value={form.kategori}
                      onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    >
                      {KATEGORI_OPTIONS.map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Nominal Pemasukan (Rp)</label>
                    <div className="flex items-stretch">
                      <span className="flex items-center rounded-l-control border border-r-0 border-border-soft bg-surface px-3 text-sm font-semibold text-ink-500">Rp</span>
                      <input
                        type="number"
                        className="w-full rounded-r-control border border-border-soft px-3 py-2 text-sm font-bold text-status-lunas outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
                        value={form.nominal}
                        onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                        placeholder="Contoh: 750000"
                        min={1}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Tanggal Pemasukan</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={form.tanggal}
                      onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Penerima / Kasir (Opsional)</label>
                    <input
                      className={inputClass}
                      value={form.penerima}
                      onChange={(e) => setForm({ ...form, penerima: e.target.value })}
                      placeholder="Nama Petugas / Kasir"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Keterangan / Catatan</label>
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={form.keterangan}
                      onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                      placeholder="Catatan tambahan..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-control bg-accent py-2.5 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover disabled:opacity-60"
                    disabled={submitting}
                  >
                    {submitting ? "Menyimpan..." : <span className="inline-flex items-center gap-1.5"><IconSave className="h-4 w-4" /> Simpan Pendapatan</span>}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Tabel Daftar Pendapatan */}
          <div className="col-span-12 lg:col-span-8">
            <div className="rounded-2xl border border-border-soft bg-white p-4 shadow-sm2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h6 className="flex items-center gap-1.5 font-bold text-ink-900"><IconClipboard className="h-4 w-4" /> Riwayat Pemasukan Kas</h6>
                  <small className="text-ink-500">
                    Total: <strong>Rp {totalPendapatan.toLocaleString("id-ID")}</strong> ({daftar.length} transaksi)
                  </small>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500/50" />
                    <input
                      className="rounded-control border border-border-soft py-1.5 pl-8 pr-3 text-sm outline-none focus:border-accent"
                      placeholder="Cari transaksi..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                  <select
                    className="rounded-control border border-border-soft px-3 py-1.5 text-sm outline-none focus:border-accent"
                    value={kategoriFilter}
                    onChange={(e) => setKategoriFilter(e.target.value)}
                  >
                    <option value="">Semua Kategori</option>
                    {KATEGORI_OPTIONS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-surface text-ink-500">
                    <tr>
                      <th className="px-2 py-2 font-medium">Pemasukan</th>
                      <th className="px-2 py-2 font-medium">Kategori</th>
                      <th className="px-2 py-2 font-medium">Tanggal</th>
                      <th className="px-2 py-2 font-medium">Nominal</th>
                      <th className="px-2 py-2 font-medium">Penerima</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-ink-500">Memuat data pendapatan...</td>
                      </tr>
                    ) : daftar.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-ink-500">Belum ada catatan pendapatan non-SPP.</td>
                      </tr>
                    ) : (
                      daftar.map((item) => (
                        <tr key={item.id} className="border-t border-border-soft hover:bg-surface">
                          <td className="px-2 py-2">
                            <div className="font-bold text-ink-900">{item.judul}</div>
                            {item.keterangan && <div className="text-xs text-ink-500">{item.keterangan}</div>}
                          </td>
                          <td className="px-2 py-2">
                            <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                              {item.kategori}
                            </span>
                          </td>
                          <td className="px-2 py-2">{new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                          <td className="px-2 py-2 font-bold text-status-lunas">Rp {item.nominal.toLocaleString("id-ID")}</td>
                          <td className="px-2 py-2">{item.penerima || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
