"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { IconFileText } from "@/components/admin/icons";
import { BULAN_LABEL, STATUS_INFO as STATUS_INFO_SPP, formatTanggalPanjang } from "@/app/admin/tagihan/types";
import { STATUS_INFO as STATUS_INFO_LAIN } from "@/app/admin/tagihan-lainnya/types";
import { formatTingkat } from "@/app/admin/siswa/types";

type TabKey = "spp" | "lainnya";
const PAGE_SIZE = 20;

type SiswaRingkas = {
  id: string;
  namaLengkap: string;
  nis: string;
  kelas: { namaKelas?: string; tingkat?: number } | null;
};

type RowSpp = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo: string;
};

type RowLain = {
  id: string;
  nominal: number;
  status: string;
  jatuhTempo: string;
  jenisTagihanLain?: { nama: string } | null;
};

function rupiah(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function RiwayatSiswaPage() {
  const params = useParams();
  const router = useRouter();
  const siswaId = params?.id as string;

  const [tab, setTab] = useState<TabKey>("spp");
  const [siswa, setSiswa] = useState<SiswaRingkas | null>(null);
  const [daftarSpp, setDaftarSpp] = useState<RowSpp[]>([]);
  const [daftarLain, setDaftarLain] = useState<RowLain[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("tab");
    if (q === "spp" || q === "lainnya") setTab(q);
  }, []);

  useEffect(() => {
    fetch(`/api/siswa/${siswaId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setSiswa(data));
  }, [siswaId]);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const [resSpp, resLain] = await Promise.all([
        fetch(`/api/tagihan?siswaId=${siswaId}`),
        fetch(`/api/tagihan-lain?siswaId=${siswaId}`),
      ]);
      if (resSpp.ok) setDaftarSpp(await resSpp.json());
      if (resLain.ok) setDaftarLain(await resLain.json());
    } finally {
      setLoading(false);
    }
  }, [siswaId]);

  useEffect(() => {
    muat();
  }, [muat]);

  useEffect(() => {
    setPage(1);
  }, [tab, filterStatus]);

  function gantiTab(t: TabKey) {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState({}, "", url.toString());
  }

  const daftarAktif = tab === "spp" ? daftarSpp : daftarLain;
  const daftarTerfilter = filterStatus ? daftarAktif.filter((t: any) => t.status === filterStatus) : daftarAktif;
  const totalPages = Math.max(1, Math.ceil(daftarTerfilter.length / PAGE_SIZE));
  const daftarHalaman = daftarTerfilter.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const statusOptions = tab === "spp" ? STATUS_INFO_SPP : STATUS_INFO_LAIN;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          className="rounded-full border border-border-soft px-3 py-1.5 text-sm text-ink-700 transition hover:bg-surface"
          onClick={() => router.back()}
        >
          ← Kembali
        </button>
      </div>

      <div className="mb-4 rounded-card border border-border-soft bg-white p-4">
        <h3 className="text-lg font-bold text-ink-900">
          Riwayat Tagihan — {siswa?.namaLengkap || "Memuat..."}
        </h3>
        {siswa && (
          <p className="text-sm text-ink-500">
            NIS: {siswa.nis} · Kelas {formatTingkat(siswa.kelas?.tingkat)}
            {siswa.kelas?.namaKelas ? ` · Jurusan ${siswa.kelas.namaKelas}` : ""}
          </p>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2 border-b border-border-soft">
        <button
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
            tab === "spp" ? "border-accent text-accent" : "border-transparent text-ink-500 hover:text-ink-900"
          }`}
          onClick={() => gantiTab("spp")}
        >
          Tagihan SPP ({daftarSpp.length})
        </button>
        <button
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
            tab === "lainnya" ? "border-accent text-accent" : "border-transparent text-ink-500 hover:text-ink-900"
          }`}
          onClick={() => gantiTab("lainnya")}
        >
          Tagihan Lainnya ({daftarLain.length})
        </button>
      </div>

      <div className="mb-3">
        <select
          className="rounded-control border border-border-soft px-3 py-2 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Semua Status</option>
          {Object.entries(statusOptions).map(([val, info]: any) => (
            <option key={val} value={val}>
              {info.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-auto rounded-card border border-border-soft bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface">
            <tr className="text-left text-ink-500">
              <th className="px-4 py-3 font-semibold">{tab === "spp" ? "Periode" : "Jenis"}</th>
              <th className="px-4 py-3 font-semibold">Nominal</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Jatuh Tempo</th>
              <th className="px-4 py-3 font-semibold">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  Memuat riwayat...
                </td>
              </tr>
            )}
            {!loading && daftarHalaman.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  Belum ada riwayat tagihan {tab === "spp" ? "SPP" : "lainnya"} untuk siswa ini.
                </td>
              </tr>
            )}
            {!loading &&
              daftarHalaman.map((t: any) => {
                const info = statusOptions[t.status] || { label: t.status, className: "bg-gray-100 text-gray-700" };
                return (
                  <tr key={t.id} className="border-t border-border-soft">
                    <td className="px-4 py-3">
                      {tab === "spp" ? `${BULAN_LABEL[t.bulan]} ${t.tahun}` : t.jenisTagihanLain?.nama || "Tagihan"}
                    </td>
                    <td className="px-4 py-3 font-semibold">{rupiah(t.nominal)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${info.className}`}>
                        {info.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">{formatTanggalPanjang(t.jatuhTempo)}</td>
                    <td className="px-4 py-3">
                      <a
                        href={tab === "spp" ? `/invoice/${t.id}` : `/invoice-lain/${t.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        <IconFileText className="h-3.5 w-3.5" /> Invoice
                      </a>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            className="rounded-control border border-border-soft bg-white px-3 py-1 text-xs font-semibold text-ink-700 transition hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ‹ Prev
          </button>
          <span className="text-xs text-ink-500">
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
          </span>
          <button
            className="rounded-control border border-border-soft bg-white px-3 py-1 text-xs font-semibold text-ink-700 transition hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
