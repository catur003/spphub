"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import {
  Kelas,
  Siswa,
  SortField,
  HasilImport,
  FormTambah,
  FormEdit,
  FORM_TAMBAH_KOSONG,
  FORM_EDIT_KOSONG,
  uploadFotoFile,
} from "./types";
import SiswaImportExport from "./components/SiswaImportExport";
import SiswaFormTambah from "./components/SiswaFormTambah";
import SiswaFilterBar from "./components/SiswaFilterBar";
import SiswaTable from "./components/SiswaTable";
import SiswaDetailModal from "@/components/admin/SiswaDetailModal";
import SiswaEditModal from "./components/SiswaEditModal";
import NaikKelasModal from "./components/NaikKelasModal";
import ConfirmHapusLunasModal from "@/components/admin/ConfirmHapusLunasModal";
import { IconCheck, IconX, IconRefresh } from "@/components/admin/icons";

export default function SiswaPage() {
  const router = useRouter();
  const [daftar, setDaftar] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [q, setQ] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("");
  const [filterKelasId, setFilterKelasId] = useState("");
  const [sortField, setSortField] = useState<SortField>("nama");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [formTambah, setFormTambah] = useState<FormTambah>(FORM_TAMBAH_KOSONG);
  const [loadingTambah, setLoadingTambah] = useState(false);
  const [errorTambah, setErrorTambah] = useState("");

  const [editSiswa, setEditSiswa] = useState<Siswa | null>(null);
  const [formEdit, setFormEdit] = useState<FormEdit>(FORM_EDIT_KOSONG);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState("");

  const [detailSiswaId, setDetailSiswaId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hapusLunasSiswaModal, setHapusLunasSiswaModal] = useState<{
    id: string;
    jumlahLunas: number;
    totalNominal: number;
  } | null>(null);

  const [fileImport, setFileImport] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [hasilImport, setHasilImport] = useState<HasilImport | null>(null);
  const [importError, setImportError] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { confirm, alertMsg, modal } = useConfirmModal();

  const [showNaikKelasModal, setShowNaikKelasModal] = useState(false);
  const [naikKelasAsal, setNaikKelasAsal] = useState("");
  const [naikKelasTujuan, setNaikKelasTujuan] = useState("");
  const [loadingNaikKelas, setLoadingNaikKelas] = useState(false);

  async function handleEksekusiNaikKelas() {
    if (!naikKelasAsal || !naikKelasTujuan) {
      await alertMsg("Pilih kelas asal dan kelas tujuan (atau status Lulus)");
      return;
    }
    const asalName = kelasList.find((k) => k.id === naikKelasAsal)?.namaKelas || "Kelas Asal";
    const tujuanName =
      naikKelasTujuan === "lulus"
        ? "Status LULUS"
        : `Kelas ${kelasList.find((k) => k.id === naikKelasTujuan)?.namaKelas}`;

    if (
      !(await confirm(`Yakin ingin menaikkan seluruh siswa aktif dari ${asalName} ke ${tujuanName}?`, {
        confirmLabel: "Ya, Naikkan Massal",
      }))
    )
      return;

    setLoadingNaikKelas(true);
    try {
      const res = await fetch("/api/siswa/naik-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelasAsalId: naikKelasAsal, kelasTujuanId: naikKelasTujuan }),
      });
      const data = await res.json();
      setLoadingNaikKelas(false);
      if (res.ok) {
        await alertMsg(`${data.message}`);
        setShowNaikKelasModal(false);
        setNaikKelasAsal("");
        setNaikKelasTujuan("");
        muatData();
      } else {
        await alertMsg(data.error || "Gagal memproses naik kelas");
      }
    } catch (err: any) {
      setLoadingNaikKelas(false);
      await alertMsg("Gagal terhubung ke server: " + err.message);
    }
  }

  const muatData = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (filterTingkat) params.set("tingkat", filterTingkat);
      if (filterKelasId) params.set("kelasId", filterKelasId);
      const qs = params.toString();
      try {
        const res = await fetch(`/api/siswa${qs ? `?${qs}` : ""}`, { signal });
        if (res.ok) setDaftar(await res.json());
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("[muatData] error:", err);
      }
    },
    [q, filterTingkat, filterKelasId]
  );

  async function muatKelas() {
    const res = await fetch("/api/kelas");
    if (res.ok) setKelasList(await res.json());
  }

  function tampilToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    muatKelas();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => muatData(controller.signal), 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [muatData]);

  async function handleFileFotoTambah(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const url = await uploadFotoFile(file);
      setFormTambah((prev) => ({ ...prev, fotoUrl: url }));
      tampilToast("Foto berhasil diunggah!");
    } catch (err: any) {
      await alertMsg(err.message);
    } finally {
      setUploadingFoto(false);
    }
  }

  async function handleFileFotoEdit(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const url = await uploadFotoFile(file);
      setFormEdit((prev) => ({ ...prev, fotoUrl: url }));
      tampilToast("Foto berhasil diunggah!");
    } catch (err: any) {
      await alertMsg(err.message);
    } finally {
      setUploadingFoto(false);
    }
  }

  // ——— Form Tambah ———
  async function handleTambah(e: React.FormEvent) {
    e.preventDefault();
    setErrorTambah("");
    setLoadingTambah(true);
    const res = await fetch("/api/siswa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formTambah),
    });
    setLoadingTambah(false);
    if (!res.ok) {
      const data = await res.json();
      setErrorTambah(data.error || "Gagal menyimpan");
      return;
    }
    const siswaBaru: Siswa = await res.json();
    setFormTambah(FORM_TAMBAH_KOSONG);
    tampilToast("Siswa berhasil ditambahkan");
    muatData();
    cekTagihanSppSiswaBaru(siswaBaru);
  }

  // Siswa baru gak otomatis punya tagihan SPP (itu tugas Generate Massal di
  // halaman Tagihan, terpisah dari nambah data siswa) — gampang kelupaan
  // kalau nambah siswa satu-satu di luar sesi generate massal bulanan.
  // Popup modal (bukan cuma badge kecil) dipilih supaya beneran kelihatan,
  // tapi tetap non-blocking: admin bisa pilih "Nanti Saja".
  async function cekTagihanSppSiswaBaru(siswa: Siswa) {
    try {
      const res = await fetch(`/api/tagihan?siswaId=${siswa.id}`);
      if (!res.ok) return;
      const daftarTagihan = await res.json();
      if (Array.isArray(daftarTagihan) && daftarTagihan.length === 0) {
        const bukaHalamanTagihan = await confirm(
          `Siswa "${siswa.namaLengkap}" berhasil ditambahkan, tapi belum punya tagihan SPP sama sekali. Buka halaman Tagihan SPP buat generate sekarang?`,
          {
            title: "Belum Ada Tagihan SPP",
            confirmLabel: "Buka Halaman Tagihan",
            cancelLabel: "Nanti Saja",
            variant: "primary",
          }
        );
        if (bukaHalamanTagihan) router.push("/admin/tagihan");
      }
    } catch {
      // Diam-diam gagal — jangan sampai pengecekan reminder ini ganggu flow
      // utama nambah siswa yang udah sukses.
    }
  }

  // ——— Modal Edit ———
  function bukaEdit(s: Siswa) {
    setEditSiswa(s);
    setFormEdit({
      ...FORM_EDIT_KOSONG,
      namaLengkap: s.namaLengkap,
      nis: s.nis,
      nisn: s.nisn || "",
      jenisKelamin: s.jenisKelamin,
      kelasId: s.kelas?.id || "",
      tanggalLahir: s.tanggalLahir ? new Date(s.tanggalLahir).toISOString().slice(0, 10) : "",
      namaWali: s.namaWali || "",
      kontakWali: s.kontakWali || "",
      fotoUrl: s.fotoUrl || "",
      status: s.status,
    });
    setErrorEdit("");
  }

  function tutupEdit() {
    setEditSiswa(null);
    setFormEdit(FORM_EDIT_KOSONG);
    setErrorEdit("");
  }

  async function handleSimpanEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editSiswa) return;
    setErrorEdit("");
    setLoadingEdit(true);

    const res = await fetch(`/api/siswa/${editSiswa.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formEdit),
    });
    setLoadingEdit(false);

    if (!res.ok) {
      const data = await res.json();
      setErrorEdit(data.error || "Gagal menyimpan");
      return;
    }

    tutupEdit();
    tampilToast("Data siswa berhasil disimpan");
    muatData();
  }

  // ——— Modal Detail Siswa ———
  function bukaDetailSiswa(id: string) {
    setDetailSiswaId(id);
  }

  // ——— Hapus ———
  async function handleDelete(id: string) {
    const yakin = await confirm("Hapus siswa ini secara permanen beserta seluruh riwayat tagihannya?", {
      title: "Hapus Siswa",
      confirmLabel: "Ya, Hapus Permanen",
    });
    if (!yakin) return;
    await eksekusiHapusSiswa(id, false);
  }

  async function eksekusiHapusSiswa(id: string, confirmHapusLunas: boolean) {
    setDeletingId(id);
    const res = await fetch(`/api/siswa/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmHapusLunas }),
    });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.butuhKonfirmasi) {
        setHapusLunasSiswaModal({
          id,
          jumlahLunas: data.jumlahLunas || 0,
          totalNominal: data.totalNominal || 0,
        });
        return;
      }
      await alertMsg(data.error || "Gagal menghapus");
      return;
    }
    setHapusLunasSiswaModal(null);
    tampilToast("Siswa berhasil dihapus");
    muatData();
  }

  // ——— Import ———
  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!fileImport) return;
    setImportError("");
    setHasilImport(null);
    setImportLoading(true);

    const formData = new FormData();
    formData.append("file", fileImport);

    const res = await fetch("/api/siswa/import", { method: "POST", body: formData });
    const data = await res.json();
    setImportLoading(false);

    if (!res.ok) {
      setImportError(data.error || "Gagal import");
      return;
    }
    setHasilImport(data);
    setFileImport(null);
    muatData();
    if (data.berhasil > 0) {
      const bukaHalamanTagihan = await confirm(
        `${data.berhasil} siswa baru berhasil diimport. Mereka belum punya tagihan SPP — buka halaman Tagihan SPP buat Generate Massal sekarang?`,
        {
          title: "Belum Ada Tagihan SPP",
          confirmLabel: "Buka Halaman Tagihan",
          cancelLabel: "Nanti Saja",
          variant: "primary",
        }
      );
      if (bukaHalamanTagihan) router.push("/admin/tagihan");
    }
  }

  const safeDaftar = Array.isArray(daftar) ? daftar : [];
  const sortedDaftar = useMemo(() => {
    return [...safeDaftar].sort((a, b) => {
      let comp = 0;
      if (sortField === "nama") comp = (a.namaLengkap || "").localeCompare(b.namaLengkap || "");
      else if (sortField === "nis") comp = (a.nis || "").localeCompare(b.nis || "");
      else if (sortField === "kelas") comp = (a.kelas?.namaKelas || "").localeCompare(b.kelas?.namaKelas || "");
      else if (sortField === "status") comp = (a.status || "").localeCompare(b.status || "");
      return sortAsc ? comp : -comp;
    });
  }, [safeDaftar, sortField, sortAsc]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [q, filterTingkat, filterKelasId, sortField, sortAsc]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedDaftar.length / pageSize)),
    [sortedDaftar.length, pageSize]
  );

  // Jaring pengaman: kalau jumlah halaman menyusut (data kehapus, filter
  // dipersempit dari tempat lain), currentPage bisa nyangkut di angka yang
  // udah gak ada — tabelnya kosong melompong padahal datanya ada di halaman
  // sebelumnya. Tarik balik ke halaman terakhir yang valid.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const paginatedDaftar = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedDaftar.slice(startIndex, startIndex + pageSize);
  }, [sortedDaftar, currentPage, pageSize]);

  return (
    <>
      {modal}
      <ConfirmHapusLunasModal
        show={!!hapusLunasSiswaModal}
        jumlahTagihan={hapusLunasSiswaModal?.jumlahLunas || 0}
        totalNominal={hapusLunasSiswaModal?.totalNominal || 0}
        loading={deletingId === hapusLunasSiswaModal?.id}
        onClose={() => setHapusLunasSiswaModal(null)}
        onConfirm={() => {
          if (hapusLunasSiswaModal) eksekusiHapusSiswa(hapusLunasSiswaModal.id, true);
        }}
      />

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex animate-toast-in items-center gap-2.5 rounded-card bg-white px-4 py-3 text-sm font-medium shadow-lg2 ${
            toast.type === "success"
              ? "border-l-4 border-status-lunas text-emerald-800"
              : "border-l-4 border-status-terlambat text-red-800"
          }`}
        >
          {toast.type === "success" ? <IconCheck className="inline h-4 w-4" /> : <IconX className="inline h-4 w-4" />} {toast.msg}
        </div>
      )}

      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="mb-0 text-xl font-bold text-ink-900">Data Siswa</h1>
            <p className="mb-0 text-sm text-ink-500">
              {daftar.length} siswa ditampilkan (Cari untuk melihat hasil spesifik)
            </p>
          </div>
          <button
            className="rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-bold text-white shadow-sm2"
            onClick={() => setShowNaikKelasModal(true)}
          >
            <span className="inline-flex items-center gap-1.5"><IconRefresh className="h-3.5 w-3.5" /> Naik Kelas Massal</span>
          </button>
        </div>

        <SiswaImportExport
          fileImport={fileImport}
          setFileImport={setFileImport}
          importLoading={importLoading}
          importError={importError}
          hasilImport={hasilImport}
          onSubmit={handleImport}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SiswaFormTambah
              formTambah={formTambah}
              setFormTambah={setFormTambah}
              kelasList={kelasList}
              errorTambah={errorTambah}
              loadingTambah={loadingTambah}
              uploadingFoto={uploadingFoto}
              onFileFoto={handleFileFotoTambah}
              onSubmit={handleTambah}
            />
          </div>

          <div className="lg:col-span-8">
            <SiswaFilterBar
              q={q}
              setQ={setQ}
              filterTingkat={filterTingkat}
              setFilterTingkat={setFilterTingkat}
              filterKelasId={filterKelasId}
              setFilterKelasId={setFilterKelasId}
              kelasList={kelasList}
            />

            <SiswaTable
              paginatedDaftar={paginatedDaftar}
              sortField={sortField}
              sortAsc={sortAsc}
              toggleSort={toggleSort}
              onDetail={bukaDetailSiswa}
              onEdit={bukaEdit}
              onDelete={handleDelete}
              deletingId={deletingId}
              sortedCount={sortedDaftar.length}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              setPageSize={setPageSize}
              setCurrentPage={setCurrentPage}
            />
          </div>
        </div>
      </div>

      <SiswaDetailModal siswaId={detailSiswaId} onClose={() => setDetailSiswaId(null)} />

      <SiswaEditModal
        editSiswa={editSiswa}
        formEdit={formEdit}
        setFormEdit={setFormEdit}
        kelasList={kelasList}
        errorEdit={errorEdit}
        loadingEdit={loadingEdit}
        uploadingFoto={uploadingFoto}
        onFileFoto={handleFileFotoEdit}
        onSubmit={handleSimpanEdit}
        onClose={tutupEdit}
      />

      <NaikKelasModal
        show={showNaikKelasModal}
        kelasList={kelasList}
        naikKelasAsal={naikKelasAsal}
        setNaikKelasAsal={setNaikKelasAsal}
        naikKelasTujuan={naikKelasTujuan}
        setNaikKelasTujuan={setNaikKelasTujuan}
        loadingNaikKelas={loadingNaikKelas}
        onClose={() => setShowNaikKelasModal(false)}
        onEksekusi={handleEksekusiNaikKelas}
      />
    </>
  );
}
