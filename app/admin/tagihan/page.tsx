"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import { IconSync } from "@/components/admin/icons";
import { TahunAjaran, KelasOption, SiswaDetail, Tagihan, SortField } from "./types";
import StatCards from "./components/StatCards";
import GenerateForm from "./components/GenerateForm";
import FilterToolbar from "./components/FilterToolbar";
import TagihanTable from "./components/TagihanTable";
import SiswaDetailModal from "./components/SiswaDetailModal";

export default function TagihanPage() {
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [daftar, setDaftar] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter & Sort tabel
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("");
  const [filterKelasId, setFilterKelasId] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [sortField, setSortField] = useState<SortField>("periode");
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Detail Modal Siswa
  const [detailSiswa, setDetailSiswa] = useState<SiswaDetail | null>(null);

  // Form generate massal
  const todayStr = new Date().toISOString().split("T")[0];
  const [gen, setGen] = useState({
    tahunAjaranId: "",
    bulan: String(new Date().getMonth() + 1),
    tahun: String(new Date().getFullYear()),
    nominal: "",
    jatuhTempo: todayStr,
  });
  const [genError, setGenError] = useState("");
  const [genResult, setGenResult] = useState<{ dibuat: number; dilewati: number } | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [syncingNominal, setSyncingNominal] = useState(false);

  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);

  const { confirm, alertMsg, modal } = useConfirmModal();

  async function handleSyncNominal() {
    setSyncingNominal(true);
    try {
      const res = await fetch("/api/tagihan/sync-nominal", { method: "POST" });
      const data = await res.json();
      setSyncingNominal(false);
      if (res.ok) {
        await alertMsg(`✅ ${data.message}`);
        muatTagihan();
      } else {
        await alertMsg(data.error || "Gagal menyinkronkan nominal");
      }
    } catch (err: any) {
      setSyncingNominal(false);
      await alertMsg("Gagal terhubung ke server: " + err.message);
    }
  }

  async function handleKirimWa(id: string) {
    setSendingWaId(id);
    try {
      const res = await fetch(`/api/tagihan/${id}/kirim-wa`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        await alertMsg(data.error || "Gagal mengirim pengingat WA");
        return;
      }
      if (data.method === "wa_link" && data.waUrl) {
        window.open(data.waUrl, "_blank");
      } else {
        await alertMsg(`✅ ${data.message || "Pesan WA berhasil dikirim via Fonnte!"}`);
      }
    } catch (err: any) {
      await alertMsg("Gagal mengirim WA: " + err.message);
    } finally {
      setSendingWaId(null);
    }
  }

  async function muatTahunAjaran() {
    const res = await fetch("/api/tahun-ajaran");
    if (res.ok) {
      const data: TahunAjaran[] = await res.json();
      setTahunAjaranList(data);
      const aktif = data.find((t) => t.aktif);
      if (aktif) setGen((g) => ({ ...g, tahunAjaranId: aktif.id }));
    }
  }

  async function muatKelas() {
    const res = await fetch("/api/kelas");
    if (res.ok) setKelasList(await res.json());
  }

  const muatTagihan = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingData(true);
      setFetchError(null);
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterBulan) params.set("bulan", filterBulan);
      if (filterTahun) params.set("tahun", filterTahun);
      if (filterTingkat) params.set("tingkat", filterTingkat);
      if (filterKelasId) params.set("kelasId", filterKelasId);
      if (filterQ) params.set("q", filterQ);

      try {
        const res = await fetch(`/api/tagihan?${params.toString()}`, { signal });
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
    [filterStatus, filterBulan, filterTahun, filterTingkat, filterKelasId, filterQ]
  );

  useEffect(() => {
    muatTahunAjaran();
    muatKelas();
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
  }, [filterStatus, filterBulan, filterTahun, filterTingkat, filterKelasId, filterQ, sortField, sortAsc]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenError("");
    setGenResult(null);
    setGenLoading(true);
    try {
      const res = await fetch("/api/tagihan/generate", {
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
      !(await confirm("Tandai tagihan ini sebagai LUNAS (pembayaran tunai manual)?", {
        confirmLabel: "Ya, Tandai Lunas",
      }))
    )
      return;
    setVerifyingId(id);
    const res = await fetch(`/api/tagihan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "lunas" }),
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
    const res = await fetch(`/api/tagihan/${id}/cek-status`);
    const data = await res.json();
    if (data.status === "lunas") {
      await alertMsg("Status terverifikasi LUNAS via Midtrans!");
      muatTagihan();
    } else {
      await alertMsg(`Status Midtrans: ${data.status || "Belum ada transaksi"}`);
    }
  }

  const tingkatOptions = Array.from(new Set(kelasList.map((k) => k.tingkat).filter(Boolean))).sort(
    (a, b) => Number(a) - Number(b)
  );

  const safeDaftar = Array.isArray(daftar) ? daftar : [];
  const filteredKelasList = useMemo(() => {
    return filterTingkat ? kelasList.filter((k) => String(k.tingkat) === filterTingkat) : kelasList;
  }, [kelasList, filterTingkat]);

  const sortedDaftar = useMemo(() => {
    return [...safeDaftar].sort((a, b) => {
      let comp = 0;
      if (sortField === "siswa") {
        const namaA = a.siswa?.namaLengkap || "";
        const namaB = b.siswa?.namaLengkap || "";
        comp = namaA.localeCompare(namaB);
      } else if (sortField === "kelas") {
        const kelasA = a.siswa?.kelas?.namaKelas || "";
        const kelasB = b.siswa?.kelas?.namaKelas || "";
        comp = kelasA.localeCompare(kelasB);
      } else if (sortField === "periode") {
        const tA = a.tahun * 100 + a.bulan;
        const tB = b.tahun * 100 + b.bulan;
        comp = tA - tB;
      } else if (sortField === "nominal") {
        comp = a.nominal - b.nominal;
      } else if (sortField === "status") {
        comp = (a.status || "").localeCompare(b.status || "");
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

  const kelasBelumSet = useMemo(() => kelasList.filter((k) => !k.nominalSpp || k.nominalSpp === 0), [kelasList]);
  const tagihanRpNolCount = useMemo(
    () => safeDaftar.filter((t) => t.nominal === 0 && t.status !== "lunas").length,
    [safeDaftar]
  );
  const isFilterActive = !!(filterBulan || filterTahun || filterStatus || filterKelasId || filterTingkat || filterQ);

  function resetFilter() {
    setFilterBulan("");
    setFilterTahun("");
    setFilterStatus("");
    setFilterKelasId("");
    setFilterTingkat("");
    setFilterQ("");
  }

  return (
    <>
      {modal}

      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="mb-0 text-xl font-bold text-ink-900">Kelola Tagihan SPP</h1>
            <p className="mb-0 text-sm text-ink-500">
              Generate tagihan massal otomatis berdasarkan Biaya SPP per Kelas masing-masing siswa.
            </p>
          </div>
          {tagihanRpNolCount > 0 && (
            <button
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-400 px-3 py-1.5 text-sm font-bold text-ink-900 shadow-sm2 hover:bg-amber-500 disabled:opacity-60"
              onClick={handleSyncNominal}
              disabled={syncingNominal}
            >
              {syncingNominal ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-100 border-t-ink-900" />
              ) : (
                <IconSync width={16} height={16} />
              )}
              Perbaiki {tagihanRpNolCount} Tagihan Rp 0
            </button>
          )}
        </div>

        <StatCards
          totalTagihan={totalTagihan}
          totalLunas={totalLunas}
          totalBelum={totalBelum}
          totalNominal={totalNominal}
        />

        <GenerateForm
          gen={gen}
          setGen={setGen}
          tahunAjaranList={tahunAjaranList}
          kelasBelumSet={kelasBelumSet}
          genError={genError}
          genResult={genResult}
          genLoading={genLoading}
          syncingNominal={syncingNominal}
          onSubmit={handleGenerate}
          onSyncNominal={handleSyncNominal}
        />

        <FilterToolbar
          filterQ={filterQ}
          setFilterQ={setFilterQ}
          filterTingkat={filterTingkat}
          setFilterTingkat={setFilterTingkat}
          filterKelasId={filterKelasId}
          setFilterKelasId={setFilterKelasId}
          filterBulan={filterBulan}
          setFilterBulan={setFilterBulan}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          tingkatOptions={tingkatOptions}
          filteredKelasList={filteredKelasList}
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
          sendingWaId={sendingWaId}
          verifyingId={verifyingId}
          onKirimWa={handleKirimWa}
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

      <SiswaDetailModal detailSiswa={detailSiswa} onClose={() => setDetailSiswa(null)} />
    </>
  );
}
