"use client";

import { useEffect, useState } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import { Kelas, DetailKelasResponse } from "./types";
import KelasFormTambah from "./components/KelasFormTambah";
import KelasTable from "./components/KelasTable";
import KelasEditModal from "./components/KelasEditModal";
import KelasDetailModal from "./components/KelasDetailModal";

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

  useEffect(() => {
    muatData();
  }, []);

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
      setNamaKelas("");
      setTingkat("");
      setNominalSpp("");
      setWaliKelas("");
      setError("");
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
    if (
      !(await confirm("Hapus kelas ini? Siswa yang terdaftar tidak akan ikut terhapus.", {
        confirmLabel: "Ya, Hapus",
      }))
    )
      return;
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
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex animate-toast-in items-center gap-2.5 rounded-card bg-white px-4 py-3 text-sm font-medium shadow-lg2 ${
            toast.type === "success"
              ? "border-l-4 border-status-lunas text-emerald-800"
              : "border-l-4 border-status-terlambat text-red-800"
          }`}
        >
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div className="p-4">
        <div className="mb-4">
          <h1 className="mb-0 text-xl font-bold text-ink-900">Data Kelas &amp; Biaya SPP</h1>
          <p className="mb-0 text-sm text-ink-500">
            {daftar.length} kelas terdaftar | Atur Biaya SPP per kelas untuk generate tagihan
            massal presisi
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <KelasFormTambah
              kelasBelumSet={kelasBelumSet}
              namaKelas={namaKelas}
              setNamaKelas={setNamaKelas}
              tingkat={tingkat}
              setTingkat={setTingkat}
              waliKelas={waliKelas}
              setWaliKelas={setWaliKelas}
              nominalSpp={nominalSpp}
              setNominalSpp={setNominalSpp}
              error={error}
              editKelas={editKelas}
              loading={loading}
              onSubmit={handleTambah}
            />
          </div>

          <div className="lg:col-span-8">
            <KelasTable
              daftar={daftar}
              deletingId={deletingId}
              onDetail={bukaDetail}
              onEdit={bukaEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>

      <KelasEditModal
        editKelas={editKelas}
        setEditKelas={setEditKelas}
        error={error}
        loading={loading}
        onClose={tutupEdit}
        onSubmit={handleSimpanEdit}
      />

      <KelasDetailModal
        detailLoading={detailLoading}
        detailKelasData={detailKelasData}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
        onClose={() => setDetailKelasData(null)}
      />

      {modal}
    </>
  );
}
