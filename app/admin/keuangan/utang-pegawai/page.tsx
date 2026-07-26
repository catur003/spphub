"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type Utang = {
  id: string;
  namaPegawai: string;
  jabatan: string | null;
  nominalPinjaman: number;
  nominalTerbayar: number;
  status: string;
  tanggalPinjam: string;
  keterangan: string | null;
};

const inputClass =
  "w-full rounded-control border border-border-soft px-3 py-2 text-sm outline-none focus:border-ink-900 focus:ring-4 focus:ring-ink-900/10";

export default function UtangPegawaiPage() {
  const [daftar, setDaftar] = useState<Utang[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [form, setForm] = useState({
    namaPegawai: "",
    jabatan: "",
    nominalPinjaman: "",
    tanggalPinjam: new Date().toISOString().split("T")[0],
    keterangan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { confirm, alertMsg, modal } = useConfirmModal();

  async function muatData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/utang-pegawai?${params.toString()}`);
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
  }, [q, statusFilter]);

  async function handleTambah(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/utang-pegawai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setError(data.error || "Gagal mencatat pinjaman pegawai");
        return;
      }

      setForm({
        namaPegawai: "",
        jabatan: "",
        nominalPinjaman: "",
        tanggalPinjam: new Date().toISOString().split("T")[0],
        keterangan: "",
      });
      await alertMsg("🎉 Pinjaman kasbon pegawai berhasil dicatat!");
      muatData();
    } catch (err: any) {
      setSubmitting(false);
      setError("Gagal terhubung ke server: " + err.message);
    }
  }

  async function handleBayarLunas(id: string, nama: string) {
    if (!(await confirm(`Tandai pinjaman kasbon atas nama "${nama}" sebagai LUNAS?`, { confirmLabel: "Ya, Tandai Lunas" }))) return;
    try {
      const res = await fetch(`/api/utang-pegawai/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tandaiLunas: true }),
      });
      if (res.ok) {
        await alertMsg(`✅ Kasbon atas nama ${nama} berhasil dilunasi!`);
        muatData();
      }
    } catch (err: any) {
      await alertMsg("Gagal: " + err.message);
    }
  }

  async function handleHapus(id: string, nama: string) {
    if (!(await confirm(`Hapus catatan kasbon atas nama "${nama}"?`, { confirmLabel: "Ya, Hapus" }))) return;
    try {
      const res = await fetch(`/api/utang-pegawai/${id}`, { method: "DELETE" });
      if (res.ok) {
        await alertMsg("Catatan kasbon berhasil dihapus.");
        muatData();
      }
    } catch (err: any) {
      await alertMsg("Gagal menghapus: " + err.message);
    }
  }

  const totalSisaKasbon = daftar.reduce((acc, item) => acc + Math.max(0, item.nominalPinjaman - item.nominalTerbayar), 0);
  const pegawaiAktifCount = daftar.filter((item) => item.status === "aktif").length;

  return (
    <>
      {modal}
      <div className="w-full p-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-ink-900">💳 Kelola Utang Pegawai (Kasbon Staf & Guru)</h1>
            <p className="text-sm text-ink-500">
              Pencatatan Pinjaman Kasbon Guru dan Staf Sekolah beserta Pengembalian & Pelunasan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Form Tambah Kasbon */}
          <div className="col-span-12 lg:col-span-4">
            <div className="overflow-hidden rounded-2xl border border-border-soft bg-white shadow-sm2">
              <div className="bg-ink-900 p-3">
                <h2 className="text-sm font-bold text-white">✚ Catat Pinjaman / Kasbon Baru</h2>
              </div>
              <div className="p-4">
                {error && <div className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                <form onSubmit={handleTambah} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Nama Pegawai / Guru</label>
                    <input
                      className={inputClass}
                      value={form.namaPegawai}
                      onChange={(e) => setForm({ ...form, namaPegawai: e.target.value })}
                      placeholder="Contoh: Pak Budi Santoso"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Jabatan (Opsional)</label>
                    <input
                      className={inputClass}
                      value={form.jabatan}
                      onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                      placeholder="Contoh: Guru Matematika / Staf TU"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Nominal Pinjaman (Rp)</label>
                    <div className="flex items-stretch">
                      <span className="flex items-center rounded-l-control border border-r-0 border-border-soft bg-surface px-3 text-sm font-semibold text-ink-500">Rp</span>
                      <input
                        type="number"
                        className="w-full rounded-r-control border border-border-soft px-3 py-2 text-sm font-bold text-ink-900 outline-none focus:border-ink-900 focus:ring-4 focus:ring-ink-900/10"
                        value={form.nominalPinjaman}
                        onChange={(e) => setForm({ ...form, nominalPinjaman: e.target.value })}
                        placeholder="Contoh: 500000"
                        min={1}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Tanggal Pinjaman</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={form.tanggalPinjam}
                      onChange={(e) => setForm({ ...form, tanggalPinjam: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-ink-700">Keterangan / Keperluan</label>
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={form.keterangan}
                      onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                      placeholder="Catatan keperluan pinjaman..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-control bg-ink-900 py-2.5 text-sm font-bold text-white shadow-sm2 transition hover:bg-black disabled:opacity-60"
                    disabled={submitting}
                  >
                    {submitting ? "Menyimpan..." : "💾 Simpan Kasbon Pegawai"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Tabel Daftar Utang Pegawai */}
          <div className="col-span-12 lg:col-span-8">
            <div className="rounded-2xl border border-border-soft bg-white p-4 shadow-sm2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h6 className="font-bold text-ink-900">📋 Daftar Pinjaman Pegawai (Kasbon)</h6>
                  <small className="text-ink-500">
                    Total Sisa Kasbon: <strong className="text-red-600">Rp {totalSisaKasbon.toLocaleString("id-ID")}</strong> ({pegawaiAktifCount} pegawai aktif)
                  </small>
                </div>
                <div className="flex gap-2">
                  <input
                    className="rounded-control border border-border-soft px-3 py-1.5 text-sm outline-none focus:border-ink-900"
                    placeholder="🔍 Cari nama pegawai..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <select
                    className="rounded-control border border-border-soft px-3 py-1.5 text-sm outline-none focus:border-ink-900"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Semua Status</option>
                    <option value="aktif">Aktif (Belum Lunas)</option>
                    <option value="lunas">Lunas</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface text-ink-500">
                    <tr>
                      <th className="px-2 py-2 font-medium">Nama Pegawai</th>
                      <th className="px-2 py-2 font-medium">Pinjaman Initial</th>
                      <th className="px-2 py-2 font-medium">Sisa Utang</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="whitespace-nowrap px-2 py-2 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-ink-500">Memuat data kasbon...</td>
                      </tr>
                    ) : daftar.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-ink-500">Belum ada catatan utang pegawai.</td>
                      </tr>
                    ) : (
                      daftar.map((item) => {
                        const sisa = Math.max(0, item.nominalPinjaman - item.nominalTerbayar);
                        return (
                          <tr key={item.id} className="border-t border-border-soft hover:bg-surface">
                            <td className="px-2 py-2">
                              <div className="font-bold text-ink-900">{item.namaPegawai}</div>
                              <div className="text-xs text-ink-500">{item.jabatan || "Pegawai/Guru"} • {new Date(item.tanggalPinjam).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</div>
                            </td>
                            <td className="px-2 py-2 font-semibold">Rp {item.nominalPinjaman.toLocaleString("id-ID")}</td>
                            <td className="px-2 py-2 font-bold text-red-600">Rp {sisa.toLocaleString("id-ID")}</td>
                            <td className="px-2 py-2">
                              {item.status === "lunas" ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-status-lunas">✓ Lunas</span>
                              ) : (
                                <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-status-belum">⏳ Aktif</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.status !== "lunas" && (
                                  <button
                                    className="rounded-full border border-status-lunas px-2.5 py-1 text-xs font-bold text-status-lunas transition hover:bg-emerald-50"
                                    onClick={() => handleBayarLunas(item.id, item.namaPegawai)}
                                  >
                                    ✓ Pelunasan
                                  </button>
                                )}
                                <button
                                  className="rounded-full border border-red-500 px-2.5 py-1 text-xs font-bold text-red-500 transition hover:bg-red-50"
                                  onClick={() => handleHapus(item.id, item.namaPegawai)}
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
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
