"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import StatCards from "@/app/admin/tagihan/components/StatCards";
import SiswaDetailModal from "@/app/admin/tagihan/components/SiswaDetailModal";
import { JenisTagihanLain, KelasOption, TahunAjaran, TagihanLain, SortField } from "./types";
import JenisManager from "./components/JenisManager";
import GenerateForm from "./components/GenerateForm";
import FilterToolbar from "./components/FilterToolbar";
import TagihanTable from "./components/TagihanTable";

export default function TagihanLainnyaPage() {
  const [daftarJenis, setDaftarJenis] = useState<JenisTagihanLain[]>([]);
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [daftar, setDaftar] = useState<TagihanLain[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter & Sort
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJenisId, setFilterJenisId] = useState("");
  const [filterKelasId, setFilterKelasId] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [sortField, setSortField] = useState<SortField>("tempo");
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [detailSiswa, setDetailSiswa] = useState<TagihanLain["siswa"] | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const [gen, setGen] = useState({
    jenisTagihanLainId: "",
    nominal: "",
    jatuhTempo: todayStr,
    tahunAjaranId: "",
    kelasId: "",
    keterangan: "",
  });
  const [genError, setGenError] = useState("");
  const [genResult, setGenResult] = useState<{ dibuat: number; dilewati: number } | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { confirm, alertMsg, modal } = useConfirmModal();

  async function muatJenis() {
    const res = await fetch("/api/tagihan-lain/jenis");
    if (res.ok) setDaftarJenis(await res.json());
  }

  async function muatKelas() {
    const res = await fetch("/api/kelas");
    if (res.ok) setKelasList(await res.json());
  }

  async function muatTahunAjaran() {
    const res = await fetch("/api/tahun-ajaran");
    if (res.ok) setTahunAjaranList(await res.json());
  }

  const muatTagihan = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingData(true);
      setFetchError(null);
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterJenisId) params.set("jenisTagihanLainId", filterJenisId);
      if (filterKelasId) params.set("kelasId", filterKelasId);
      if (filterQ) params.set("q", filterQ);

      try {
        const res = await fetch(`/api/tagihan-lain?${params.toString()}`, { signal });
        if (res.ok) {
          const data = await res.json();
          setDaftar(Array.isArray(data) ? data : []);
        } else {
          const errData = await res.json().catch(() => ({}));
          setFetchError(`Error ${res.status}: ${errData.error || res.statusText}`);
          setDaftar([]);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setFetchError("Gagal terhubung ke server: " + err.message);
        setDaftar([]);
      } finally {
        setLoadingData(false);
      }
    },
    [filterStatus, filterJenisId, filterKelasId, filterQ]
  );

  useEffect(() => {
    muatJenis();
    muatKelas();
    muatTahunAjaran();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => muatTagihan(controller.signal), 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [muatTagihan]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterJenisId, filterKelasId, filterQ, sortField, sortAsc]);

  async function handleCreateJenis(nama: string, nominalDefault: number): Promise<string | null> {
    const res = await fetch("/api/tagihan-lain/jenis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, nominalDefault }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Gagal membuat jenis tagihan";
    await muatJenis();
    return null;
  }

  async function handleUpdateJenis(
    id: string,
    data: Partial<Pick<JenisTagihanLain, "nama" | "nominalDefault" | "aktif">>
  ): Promise<string | null> {
    const res = await fetch(`/api/tagihan-lain/jenis/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) {
      await alertMsg(resData.error || "Gagal memperbarui jenis tagihan");
      return resData.error || "Gagal memperbarui jenis tagihan";
    }
    await muatJenis();
    return null;
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenError("");
    setGenResult(null);
    setGenLoading(true);
    try {
      const res = await fetch("/api/tagihan-lain/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gen),
      });
      const data = await res.json();
      setGenLoading(false);
      if (!res.ok) {
        setGenError(data.error || "Gagal generate tagihan");
        return;
      }
      setGenResult(data);
      muatTagihan();
    } catch (err: any) {
      setGenLoading(false);
      setGenError("Terjadi kesalahan koneksi saat generate tagihan.");
    }
  }

  async function handleVerifikasi(id: string) {
    if (
      !(await confirm("Tandai tagihan ini sebagai LUNAS (pembayaran manual)?", {
        confirmLabel: "Ya, Tandai Lunas",
      }))
    )
      return;
    setVerifyingId(id);
    const res = await fetch(`/api/tagihan-lain/${id}/verifikasi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metode: "transfer_bank" }),
    });
    setVerifyingId(null);
    if (!res.ok) {
      const data = await res.json();
      await alertMsg(data.error || "Gagal memperbarui status");
      return;
    }
    muatTagihan();
  }

  async function handleCekStatus(id: string) {
    const res = await fetch(`/api/tagihan-lain/${id}/cek-status`);
    const data = await res.json();
    if (data.status === "lunas") {
      await alertMsg("Status terverifikasi LUNAS via Midtrans!");
      muatTagihan();
    } else {
      await alertMsg(`Status Midtrans: ${data.status || "Belum ada transaksi"}`);
    }
  }

  const safeDaftar = Array.isArray(daftar) ? daftar : [];

  const sortedDaftar = useMemo(() => {
    return [...safeDaftar].sort((a, b) => {
      let comp = 0;
      if (sortField === "siswa") {
        comp = (a.siswa?.namaLengkap || "").localeCompare(b.siswa?.namaLengkap || "");
      } else if (sortField === "kelas") {
        comp = (a.siswa?.kelas?.namaKelas || "").localeCompare(b.siswa?.kelas?.namaKelas || "");
      } else if (sortField === "jenis") {
        comp = (a.jenisTagihanLain?.nama || "").localeCompare(b.jenisTagihanLain?.nama || "");
      } else if (sortField === "nominal") {
        comp = a.nominal - b.nominal;
      } else if (sortField === "status") {
        comp = (a.status || "").localeCompare(b.status || "");
      } else if (sortField === "tempo") {
        comp = new Date(a.jatuhTempo).getTime() - new Date(b.jatuhTempo).getTime();
      }
      return sortAsc ? comp : -comp;
    });
  }, [safeDaftar, sortField, sortAsc]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedDaftar.length / pageSize)), [sortedDaftar.length, pageSize]);
  const paginatedDaftar = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedDaftar.slice(startIndex, startIndex + pageSize);
  }, [sortedDaftar, currentPage, pageSize]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  const totalTagihan = safeDaftar.length;
  const totalLunas = useMemo(() => safeDaftar.filter((t) => t.status === "lunas").length, [safeDaftar]);
  const totalBelum = useMemo(
    () => safeDaftar.filter((t) => t.status === "belum_bayar" || t.status === "terlambat").length,
    [safeDaftar]
  );
  const totalNominal = useMemo(() => safeDaftar.reduce((acc, t) => acc + (t.nominal || 0), 0), [safeDaftar]);

  const isFilterActive = !!(filterStatus || filterJenisId || filterKelasId || filterQ);

  function resetFilter() {
    setFilterStatus("");
    setFilterJenisId("");
    setFilterKelasId("");
    setFilterQ("");
  }

  return (
    <>
      {modal}

      <div className="p-4">
        <div className="mb-4">
          <h1 className="mb-0 text-xl font-bold text-ink-900">Tagihan Lainnya</h1>
          <p className="mb-0 text-sm text-ink-500">
            Kelola tagihan di luar SPP bulanan — seragam, daftar ulang, dan jenis lain yang kamu
            tentukan sendiri.
          </p>
        </div>

        <StatCards
          totalTagihan={totalTagihan}
          totalLunas={totalLunas}
          totalBelum={totalBelum}
          totalNominal={totalNominal}
        />

        <JenisManager daftarJenis={daftarJenis} onCreate={handleCreateJenis} onUpdate={handleUpdateJenis} />

        <GenerateForm
          gen={gen}
          setGen={setGen}
          daftarJenis={daftarJenis}
          kelasList={kelasList}
          tahunAjaranList={tahunAjaranList}
          genError={genError}
          genResult={genResult}
          genLoading={genLoading}
          onSubmit={handleGenerate}
        />

        <FilterToolbar
          filterQ={filterQ}
          setFilterQ={setFilterQ}
          filterJenisId={filterJenisId}
          setFilterJenisId={setFilterJenisId}
          filterKelasId={filterKelasId}
          setFilterKelasId={setFilterKelasId}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          daftarJenis={daftarJenis}
          kelasList={kelasList}
          totalCount={sortedDaftar.length}
          isFilterActive={isFilterActive}
          onReset={resetFilter}
        />

        <TagihanTable
          loadingData={loadingData}
          fetchError={fetchError}
          paginatedDaftar={paginatedDaftar}
          sortField={sortField}
          sortAsc={sortAsc}
          toggleSort={toggleSort}
          onSiswaClick={setDetailSiswa}
          verifyingId={verifyingId}
          onVerifikasi={handleVerifikasi}
          onCekStatus={handleCekStatus}
          sortedCount={sortedDaftar.length}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          setPageSize={setPageSize}
          setCurrentPage={setCurrentPage}
        />
      </div>

      <SiswaDetailModal detailSiswa={detailSiswa || null} onClose={() => setDetailSiswa(null)} />
    </>
  );
}
