"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import ConfirmHapusLunasModal from "@/components/admin/ConfirmHapusLunasModal";
import StatCards from "@/app/admin/tagihan/components/StatCards";
import SiswaDetailModal from "@/components/admin/SiswaDetailModal";
import { JenisTagihanLain, KelasOption, TahunAjaran, TagihanLain, SortField } from "./types";
import { STATUS_SISWA_NONAKTIF } from "@/app/admin/tagihan/types";
import { IconSync } from "@/components/admin/icons";
import JenisManager from "./components/JenisManager";
import GenerateForm, { JatuhTempoPreset } from "./components/GenerateForm";
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
  const [filterPresetId, setFilterPresetId] = useState("");
  const [filterPresetList, setFilterPresetList] = useState<JatuhTempoPreset[]>([]);
  const [includeNonAktif, setIncludeNonAktif] = useState(false);
  const [sortField, setSortField] = useState<SortField>("tempo");
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [detailSiswaId, setDetailSiswaId] = useState<string | null>(null);

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [syncingNominal, setSyncingNominal] = useState(false);
  const [hapusLunasModal, setHapusLunasModal] = useState<{
    ids: string[];
    single?: boolean;
    label?: string;
    jumlahLunas: number;
    totalNominal: number;
    jumlahLain: number;
  } | null>(null);
  const [presetList, setPresetList] = useState<JatuhTempoPreset[]>([]);

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

  const muatPreset = useCallback(async (tahunAjaranId: string) => {
    const params = new URLSearchParams({ jenis: "lainnya" });
    if (tahunAjaranId) params.set("tahunAjaranId", tahunAjaranId);
    const res = await fetch(`/api/jatuh-tempo?${params.toString()}`);
    if (res.ok) setPresetList(await res.json());
  }, []);

  const muatFilterPresetList = useCallback(async () => {
    const res = await fetch(`/api/jatuh-tempo?jenis=lainnya`);
    if (res.ok) setFilterPresetList(await res.json());
  }, []);

  const muatTagihan = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingData(true);
      setFetchError(null);
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterJenisId) params.set("jenisTagihanLainId", filterJenisId);
      if (filterKelasId) params.set("kelasId", filterKelasId);
      if (filterQ) params.set("q", filterQ);
      if (includeNonAktif) params.set("includeNonAktif", "1");
      const presetTerpilih = filterPresetList.find((p) => p.id === filterPresetId);
      if (presetTerpilih) {
        params.set("jatuhTempoStart", presetTerpilih.tanggalAwal.split("T")[0]);
        params.set("jatuhTempoEnd", presetTerpilih.tanggalAkhir.split("T")[0]);
      }

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
    [filterStatus, filterJenisId, filterKelasId, filterQ, filterPresetId, filterPresetList, includeNonAktif]
  );

  useEffect(() => {
    muatJenis();
    muatKelas();
    muatTahunAjaran();
    muatFilterPresetList();
  }, []);

  useEffect(() => {
    muatPreset(gen.tahunAjaranId);
  }, [gen.tahunAjaranId, muatPreset]);

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
  }, [filterStatus, filterJenisId, filterKelasId, filterQ, filterPresetId, includeNonAktif, sortField, sortAsc]);

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

  async function handleSyncNominal() {
    setSyncingNominal(true);
    try {
      const res = await fetch("/api/tagihan-lain/sync-nominal", { method: "POST" });
      const data = await res.json();
      setSyncingNominal(false);
      if (res.ok) {
        await alertMsg(`${data.message}`);
        muatTagihan();
      } else {
        await alertMsg(data.error || "Gagal menyinkronkan nominal");
      }
    } catch (err: any) {
      setSyncingNominal(false);
      await alertMsg("Gagal terhubung ke server: " + err.message);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenError("");
    setGenResult(null);

    const jenisTerpilih = daftarJenis.find((j) => j.id === gen.jenisTagihanLainId);
    const targetKelas = gen.kelasId ? kelasList.find((k) => k.id === gen.kelasId)?.namaKelas : null;
    const ok = await confirm(
      `Generate tagihan "${jenisTerpilih?.nama || "-"}" sebesar Rp ${Number(gen.nominal || 0).toLocaleString("id-ID")} untuk ${
        targetKelas ? `siswa kelas ${targetKelas}` : "SEMUA siswa aktif"
      }? Tagihan baru akan langsung dibuat untuk siswa yang belum punya tagihan aktif jenis ini.`,
      { title: "Generate Tagihan Massal", confirmLabel: "Ya, Generate" }
    );
    if (!ok) return;

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

  async function handleHapus(id: string, label: string) {
    const t = safeDaftar.find((x) => x.id === id);
    const butuhKonfirmasiHapusLunas =
      t?.status === "lunas" && t.siswa?.status && STATUS_SISWA_NONAKTIF.includes(t.siswa.status);

    if (butuhKonfirmasiHapusLunas) {
      setHapusLunasModal({
        ids: [id],
        single: true,
        label,
        jumlahLunas: 1,
        totalNominal: t?.nominal || 0,
        jumlahLain: 0,
      });
      return;
    }

    if (
      !(await confirm(`Hapus tagihan "${label}" ini? Aksi ini gak bisa dibatalin.`, {
        title: "Hapus Tagihan",
        confirmLabel: "Ya, Hapus",
      }))
    )
      return;
    await eksekusiHapusSatuan(id);
  }

  async function eksekusiHapusSatuan(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/tagihan-lain/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmHapusLunas: true }),
    });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      await alertMsg(data.error || "Gagal menghapus tagihan");
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    muatTagihan();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleHapusMassal() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const dipilih = safeDaftar.filter((t) => selectedIds.has(t.id));
    const lunasNonAktif = dipilih.filter(
      (t) => t.status === "lunas" && t.siswa?.status && STATUS_SISWA_NONAKTIF.includes(t.siswa.status)
    );

    if (lunasNonAktif.length > 0) {
      setHapusLunasModal({
        ids,
        jumlahLunas: lunasNonAktif.length,
        totalNominal: lunasNonAktif.reduce((acc, t) => acc + (t.nominal || 0), 0),
        jumlahLain: ids.length - lunasNonAktif.length,
      });
      return;
    }

    if (
      !(await confirm(
        `Hapus ${ids.length} tagihan terpilih? Aksi ini gak bisa dibatalin. Tagihan yang udah punya pembayaran sukses otomatis gak akan dihapus (dilindungi sistem).`,
        { title: "Hapus Tagihan Massal", confirmLabel: `Ya, Hapus ${ids.length} Tagihan` }
      ))
    )
      return;

    await eksekusiHapusMassal(ids);
  }

  async function eksekusiHapusMassal(ids: string[]) {
    setBulkDeleting(true);
    let berhasil = 0;
    let gagal = 0;
    for (const id of ids) {
      const res = await fetch(`/api/tagihan-lain/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmHapusLunas: true }),
      });
      if (res.ok) berhasil++;
      else gagal++;
    }
    setBulkDeleting(false);
    setSelectedIds(new Set());
    await alertMsg(
      gagal > 0
        ? `${berhasil} tagihan berhasil dihapus, ${gagal} gagal (kemungkinan sudah punya pembayaran sukses / dilindungi sistem).`
        : `${berhasil} tagihan berhasil dihapus.`
    );
    muatTagihan();
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
  const tagihanRpNolCount = useMemo(
    () => safeDaftar.filter((t) => t.nominal === 0 && t.status !== "lunas").length,
    [safeDaftar]
  );

  const isFilterActive = !!(filterStatus || filterJenisId || filterKelasId || filterQ || filterPresetId);

  function resetFilter() {
    setFilterStatus("");
    setFilterJenisId("");
    setFilterKelasId("");
    setFilterQ("");
    setFilterPresetId("");
    setIncludeNonAktif(false);
  }

  return (
    <>
      {modal}

      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="mb-0 text-xl font-bold text-ink-900">Tagihan Lainnya</h1>
            <p className="mb-0 text-sm text-ink-500">
              Kelola tagihan di luar SPP bulanan — seragam, daftar ulang, dan jenis lain yang kamu
              tentukan sendiri.
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

        <JenisManager daftarJenis={daftarJenis} onCreate={handleCreateJenis} onUpdate={handleUpdateJenis} confirm={confirm} />

        <GenerateForm
          gen={gen}
          setGen={setGen}
          daftarJenis={daftarJenis}
          kelasList={kelasList}
          tahunAjaranList={tahunAjaranList}
          presetList={presetList}
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
          filterPresetId={filterPresetId}
          setFilterPresetId={setFilterPresetId}
          filterPresetList={filterPresetList}
          daftarJenis={daftarJenis}
          kelasList={kelasList}
          totalCount={sortedDaftar.length}
          isFilterActive={isFilterActive}
          onReset={resetFilter}
          includeNonAktif={includeNonAktif}
          setIncludeNonAktif={setIncludeNonAktif}
        />

        <TagihanTable
          loadingData={loadingData}
          fetchError={fetchError}
          paginatedDaftar={paginatedDaftar}
          sortField={sortField}
          sortAsc={sortAsc}
          toggleSort={toggleSort}
          onSiswaClick={(s) => setDetailSiswaId(s?.id || null)}
          verifyingId={verifyingId}
          onVerifikasi={handleVerifikasi}
          onCekStatus={handleCekStatus}
          deletingId={deletingId}
          onHapus={handleHapus}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          onHapusMassal={handleHapusMassal}
          bulkDeleting={bulkDeleting}
          sortedCount={sortedDaftar.length}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          setPageSize={setPageSize}
          setCurrentPage={setCurrentPage}
        />
      </div>

      <SiswaDetailModal siswaId={detailSiswaId} onClose={() => setDetailSiswaId(null)} />

      <ConfirmHapusLunasModal
        show={!!hapusLunasModal}
        jumlahTagihan={hapusLunasModal?.jumlahLunas || 0}
        totalNominal={hapusLunasModal?.totalNominal || 0}
        jumlahTagihanLain={hapusLunasModal?.jumlahLain || 0}
        loading={bulkDeleting || !!deletingId}
        onClose={() => setHapusLunasModal(null)}
        onConfirm={async () => {
          const m = hapusLunasModal;
          setHapusLunasModal(null);
          if (!m) return;
          if (m.single) {
            await eksekusiHapusSatuan(m.ids[0]);
          } else {
            await eksekusiHapusMassal(m.ids);
          }
        }}
      />
    </>
  );
}
