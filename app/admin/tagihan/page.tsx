"use client";

import { useEffect, useState, useCallback } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";
import Link from "next/link";

type TahunAjaran = { id: string; nama: string; aktif: boolean };
type KelasOption = { id: string; namaKelas: string; tingkat?: number; nominalSpp?: number };
type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo: string;
  siswa?: { namaLengkap?: string; nis?: string; kelas?: { id?: string; namaKelas?: string; tingkat?: number } | null } | null;
};

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const STATUS_INFO: Record<string, { label: string; bg: string; color: string }> = {
  belum_bayar:          { label: "Belum Bayar",         bg: "#f3f4f6", color: "#374151" },
  menunggu_verifikasi:  { label: "Menunggu Verifikasi",  bg: "#fef9c3", color: "#854d0e" },
  lunas:                { label: "Lunas",                bg: "#dcfce7", color: "#15803d" },
  terlambat:            { label: "Terlambat",            bg: "#fee2e2", color: "#991b1b" },
};

const TAHUN_SEKARANG = new Date().getFullYear();
const TAHUN_OPTIONS = Array.from({ length: 5 }, (_, i) => TAHUN_SEKARANG - 1 + i);

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
function getAvatarColor(nama: string = "Siswa") {
  let h = 0;
  for (let i = 0; i < nama.length; i++) h = (h * 31 + nama.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function getInisial(nama: string = "Siswa") {
  return nama.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

export default function TagihanPage() {
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [daftar, setDaftar] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter tabel
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("");
  const [filterKelasId, setFilterKelasId] = useState("");
  const [filterQ, setFilterQ] = useState("");

  // Form generate
  const [gen, setGen] = useState({
    tahunAjaranId: "",
    bulan: String(new Date().getMonth() + 1),
    tahun: String(new Date().getFullYear()),
    nominal: "",
    jatuhTempo: "",
  });
  const [genError, setGenError] = useState("");
  const [genResult, setGenResult] = useState<{ dibuat: number; dilewati: number } | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);
  const { confirm, alertMsg, modal } = useConfirmModal();

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

  const muatTagihan = useCallback(async (signal?: AbortSignal) => {
    setLoadingData(true);
    setFetchError(null);
    const params = new URLSearchParams();
    if (filterStatus)  params.set("status", filterStatus);
    if (filterBulan)   params.set("bulan", filterBulan);
    if (filterTahun)   params.set("tahun", filterTahun);
    if (filterTingkat) params.set("tingkat", filterTingkat);
    if (filterKelasId) params.set("kelasId", filterKelasId);
    if (filterQ)       params.set("q", filterQ);

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
      if (err.name === "AbortError") return; // Cancelled — ignore
      setFetchError("Gagal terhubung ke server: " + err.message);
      setDaftar([]);
    } finally {
      setLoadingData(false);
    }
  }, [filterStatus, filterBulan, filterTahun, filterTingkat, filterKelasId, filterQ]);

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

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenError("");
    setGenResult(null);
    setGenLoading(true);
    const res = await fetch("/api/tagihan/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gen),
    });
    const data = await res.json();
    setGenLoading(false);
    if (!res.ok) { setGenError(data.error || "Gagal generate tagihan"); return; }
    setGenResult(data);
    muatTagihan();
  }

  async function handleVerifikasi(id: string) {
    if (!(await confirm("Tandai tagihan ini sebagai LUNAS (pembayaran tunai manual)?", { confirmLabel: "Ya, Tandai Lunas" }))) return;
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

  // Opsi Tingkat & Kelas yang ter-filter
  const tingkatOptions = Array.from(
    new Set(kelasList.map((k) => k.tingkat).filter(Boolean))
  ).sort((a, b) => Number(a) - Number(b));

  const filteredKelasList = filterTingkat
    ? kelasList.filter((k) => String(k.tingkat) === filterTingkat)
    : kelasList;

  const totalTagihan = daftar.length;
  const totalLunas   = daftar.filter((t) => t.status === "lunas").length;
  const totalBelum   = daftar.filter((t) => t.status === "belum_bayar" || t.status === "terlambat").length;
  const totalNominal = daftar.reduce((acc, t) => acc + t.nominal, 0);

  const kelasBelumSet = kelasList.filter((k) => !k.nominalSpp || k.nominalSpp === 0);
  const isFilterActive = !!(filterBulan || filterTahun || filterStatus || filterKelasId || filterTingkat || filterQ);

  return (
    <>
      <style>{`
        .stat-card {
          background: white; border-radius: 14px; padding: 1.1rem;
          border: 1px solid var(--border-soft); box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .stat-card__icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; margin-bottom: 0.5rem;
        }
        .stat-card__value { font-size: 1.4rem; font-weight: 800; color: var(--ink-900); }
        .stat-card__label { font-size: 0.76rem; color: var(--ink-500); font-weight: 500; }

        .gen-card {
          background: white; border-radius: 16px; border: 1px solid var(--border-soft);
          padding: 1.25rem 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }

        .filter-card {
          background: white; border-radius: 16px; border: 1px solid var(--border-soft);
          padding: 1rem 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }

        .tagihan-table-clean {
          width: 100%; border-collapse: separate; border-spacing: 0;
        }
        .tagihan-table-clean th {
          font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
          color: #64748b; font-weight: 700; background: #f8fafc;
          padding: 0.9rem 1.2rem; border-bottom: 2px solid #e2e8f0;
        }
        .tagihan-table-clean td {
          padding: 1rem 1.2rem; vertical-align: middle; border-bottom: 1px solid #f1f5f9;
          font-size: 0.88rem; background: white;
        }
        .tagihan-table-clean tr:last-child td { border-bottom: none; }
        .tagihan-table-clean tr:hover td { background: #faf5ff; }

        .status-chip {
          display: inline-flex; align-items: center; padding: 4px 12px;
          border-radius: 20px; font-size: 0.75rem; font-weight: 600;
        }
        .siswa-avatar-sm {
          width: 34px; height: 34px; border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700; color: white; flex-shrink: 0;
        }
      `}</style>

      {modal}

      <div className="container-fluid p-4">
        <div className="mb-4">
          <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Kelola Tagihan SPP</h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
            Generate tagihan massal otomatis berdasarkan Biaya SPP per Kelas masing-masing siswa.
          </p>
        </div>

        {/* Stats */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: "#eef2ff" }}>📋</div>
              <div className="stat-card__value">{totalTagihan}</div>
              <div className="stat-card__label">Total Tagihan (Tampil)</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: "#dcfce7" }}>✅</div>
              <div className="stat-card__value">{totalLunas}</div>
              <div className="stat-card__label">Sudah Lunas</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: "#fee2e2" }}>⏳</div>
              <div className="stat-card__value">{totalBelum}</div>
              <div className="stat-card__label">Belum / Terlambat</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: "#f0fdf4" }}>💰</div>
              <div className="stat-card__value" style={{ fontSize: "1.1rem" }}>
                {totalNominal.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
              </div>
              <div className="stat-card__label">Total Nominal</div>
            </div>
          </div>
        </div>

        {/* Generate Form */}
        <div className="gen-card mb-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap mb-2">
            <h2 className="h6 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>
              ⚡ Generate Tagihan Massal Otomatis
            </h2>
            <span className="badge bg-indigo-subtle text-indigo px-3 py-1 rounded-pill" style={{ fontSize: "0.75rem", background: "#e0e7ff", color: "#3730a3" }}>
              💡 Nominal sesuai Biaya SPP per Kelas
            </span>
          </div>
          <p className="text-muted mb-3" style={{ fontSize: "0.78rem" }}>
            Nominal tagihan setiap siswa akan diambil otomatis dari Biaya SPP Kelas siswa yang diatur pada menu <strong>Data Kelas</strong>.
          </p>

          {kelasBelumSet.length > 0 && (
            <div className="alert alert-warning py-2 px-3 small mb-3 border-warning d-flex align-items-center justify-content-between flex-wrap gap-2" style={{ borderRadius: 10 }}>
              <div>
                <strong>⚠️ Peringatan:</strong> Ada <strong>{kelasBelumSet.length} kelas</strong> ({kelasBelumSet.slice(0, 3).map((k) => k.namaKelas).join(", ")}) yang biaya SPP-nya belum diatur (masih Rp 0).
              </div>
              <Link href="/admin/kelas" className="btn btn-sm btn-warning fw-bold py-1 px-3 text-dark" style={{ fontSize: "0.76rem" }}>
                👉 Atur Biaya SPP per Kelas
              </Link>
            </div>
          )}

          {genError && <div className="alert alert-danger py-2 small mb-3">{genError}</div>}
          {genResult && (
            <div className="alert alert-success py-2 small mb-3">
              🎉 Berhasil membuat <strong>{genResult.dibuat}</strong> tagihan baru ({genResult.dilewati} siswa dilewati / sudah dibuat).
            </div>
          )}
          <form onSubmit={handleGenerate} className="row g-2 align-items-end">
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label small fw-semibold text-muted">Bulan Tagihan</label>
              <select className="form-select form-select-sm" value={gen.bulan}
                onChange={(e) => setGen({ ...gen, bulan: e.target.value })}>
                {BULAN_LABEL.slice(1).map((lbl, i) => (
                  <option key={i + 1} value={i + 1}>{lbl}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-semibold text-muted">Tahun</label>
              <select className="form-select form-select-sm" value={gen.tahun}
                onChange={(e) => setGen({ ...gen, tahun: e.target.value })}>
                {TAHUN_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label small fw-semibold text-muted">Tahun Ajaran</label>
              <select className="form-select form-select-sm" value={gen.tahunAjaranId}
                onChange={(e) => setGen({ ...gen, tahunAjaranId: e.target.value })} required>
                <option value="">-- Pilih Tahun Ajaran --</option>
                {tahunAjaranList.map((t) => (
                  <option key={t.id} value={t.id}>{t.nama}{t.aktif ? " (Aktif)" : ""}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-semibold text-muted">Jatuh Tempo</label>
              <input type="date" className="form-control form-control-sm" value={gen.jatuhTempo}
                onChange={(e) => setGen({ ...gen, jatuhTempo: e.target.value })} required />
            </div>
            <div className="col-12 col-md-2">
              <button type="submit" className="btn btn-primary btn-sm w-100 fw-bold py-2" disabled={genLoading}>
                {genLoading ? "Memproses..." : "⚡ Generate Massal"}
              </button>
            </div>
          </form>
        </div>

        {/* Filter Card Toolbar Multi-Level (Tingkat & Kelas Dropdown) */}
        <div className="filter-card mb-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="fw-bold small text-dark">🔍 Filter Data Tagihan</span>
            <span className="text-muted small">Total: <strong>{daftar.length}</strong> tagihan</span>
          </div>

          <div className="row g-2 align-items-center">
            {/* Cari Nama Siswa / NIS */}
            <div className="col-12 col-md-3">
              <input
                className="form-control form-control-sm"
                placeholder="🔍 Cari nama siswa / NIS..."
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
              />
            </div>

            {/* Filter Tingkat Dropdown */}
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm"
                value={filterTingkat}
                onChange={(e) => {
                  setFilterTingkat(e.target.value);
                  setFilterKelasId("");
                }}
              >
                <option value="">Semua Tingkat</option>
                {tingkatOptions.map((t) => (
                  <option key={t} value={t}>Tingkat {t}</option>
                ))}
              </select>
            </div>

            {/* Filter Kelas Dropdown */}
            <div className="col-6 col-md-3">
              <select
                className="form-select form-select-sm"
                value={filterKelasId}
                onChange={(e) => setFilterKelasId(e.target.value)}
              >
                <option value="">Semua Kelas {filterTingkat ? `(Tingkat ${filterTingkat})` : ""}</option>
                {filteredKelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.namaKelas} {k.nominalSpp ? `(Rp ${(k.nominalSpp / 1000).toFixed(0)}k)` : "(⚠️ Rp 0)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Bulan */}
            <div className="col-4 col-md-2">
              <select className="form-select form-select-sm"
                value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}>
                <option value="">Semua Bulan</option>
                {BULAN_LABEL.slice(1).map((lbl, i) => (
                  <option key={i + 1} value={i + 1}>{lbl}</option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div className="col-4 col-md-2">
              <select className="form-select form-select-sm"
                value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Semua Status</option>
                {Object.entries(STATUS_INFO).map(([val, info]) => (
                  <option key={val} value={val}>{info.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {isFilterActive && (
            <div className="d-flex align-items-center justify-content-between mt-3 pt-2 border-top flex-wrap gap-2">
              <div className="d-flex align-items-center gap-1 flex-wrap" style={{ fontSize: "0.75rem" }}>
                <span className="text-muted fw-semibold me-1">Filter Aktif:</span>
                {filterTingkat && <span className="badge bg-indigo-subtle text-indigo px-2 py-1 rounded-pill" style={{ background: "#e0e7ff", color: "#3730a3" }}>Tingkat {filterTingkat}</span>}
                {filterKelasId && <span className="badge bg-primary px-2 py-1 rounded-pill">Kelas {kelasList.find(k => k.id === filterKelasId)?.namaKelas}</span>}
                {filterBulan && <span className="badge bg-info text-dark px-2 py-1 rounded-pill">Bulan {BULAN_LABEL[Number(filterBulan)]}</span>}
                {filterStatus && <span className="badge bg-secondary px-2 py-1 rounded-pill">{STATUS_INFO[filterStatus]?.label}</span>}
                {filterQ && <span className="badge bg-dark px-2 py-1 rounded-pill">Cari: "{filterQ}"</span>}
              </div>
              <button className="btn btn-sm btn-outline-danger py-1 px-3 rounded-pill fw-semibold ms-auto" style={{ fontSize: "0.75rem" }}
                onClick={() => { setFilterBulan(""); setFilterTahun(""); setFilterStatus(""); setFilterKelasId(""); setFilterTingkat(""); setFilterQ(""); }}>
                ✕ Reset Filter
              </button>
            </div>
          )}
        </div>

        {/* Tabel Tagihan */}
        <div className="card p-0 border-0 shadow-sm overflow-hidden" style={{ borderRadius: 16 }}>
          <div className="table-responsive">
            <table className="tagihan-table-clean mb-0">
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Identitas Siswa</th>
                  <th style={{ width: "15%" }}>Kelas</th>
                  <th style={{ width: "18%" }}>Periode Tagihan</th>
                  <th style={{ width: "15%" }}>Nominal SPP</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "10%", textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" />
                      <span className="text-muted">Memuat data tagihan...</span>
                    </td>
                  </tr>
                ) : fetchError ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      <div className="alert alert-danger d-inline-block mb-0 small">
                        ⚠️ {fetchError}
                      </div>
                    </td>
                  </tr>
                ) : daftar.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-5">
                      <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📄</div>
                      Belum ada data tagihan untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  daftar.map((t) => {
                    const namaSiswa = t.siswa?.namaLengkap || "Siswa Tidak Ditemukan";
                    const nisSiswa = t.siswa?.nis || "-";
                    const namaKelas = t.siswa?.kelas?.namaKelas || "-";
                    const info = STATUS_INFO[t.status] || { label: t.status, bg: "#f3f4f6", color: "#374151" };

                    return (
                      <tr key={t.id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div className="siswa-avatar-sm" style={{ background: getAvatarColor(namaSiswa) }}>
                              {getInisial(namaSiswa)}
                            </div>
                            <div>
                              <div className="fw-bold text-dark">{namaSiswa}</div>
                              <div className="text-muted small" style={{ fontFamily: "monospace" }}>NIS: {nisSiswa}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border px-2 py-1">
                            {namaKelas}
                          </span>
                        </td>
                        <td>
                          <div className="fw-semibold text-primary">
                            {BULAN_LABEL[t.bulan]} {t.tahun}
                          </div>
                          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            Tempo: {new Date(t.jatuhTempo).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold" style={{ color: "#0f172a" }}>
                            Rp {t.nominal.toLocaleString("id-ID")}
                          </div>
                        </td>
                        <td>
                          <span className="status-chip" style={{ background: info.bg, color: info.color }}>
                            {info.label}
                          </span>
                        </td>
                        <td className="text-end" style={{ whiteSpace: "nowrap" }}>
                          <div className="d-flex gap-1 justify-content-end align-items-center flex-nowrap">
                            <button
                              className="btn btn-sm btn-outline-success rounded-pill px-2 py-1 fw-semibold"
                              style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                              disabled={sendingWaId === t.id}
                              onClick={() => handleKirimWa(t.id)}
                              title="Kirim Pengingat WA Wali Siswa"
                            >
                              {sendingWaId === t.id ? <span className="spinner-border spinner-border-sm" /> : "📲 Kirim WA"}
                            </button>
                            {t.status === "lunas" ? (
                              <a href={`/kwitansi/${t.id}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-semibold" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                                Kwitansi
                              </a>
                            ) : (
                              <>
                                <button
                                  className="btn btn-sm btn-success rounded-pill px-2 py-1 fw-semibold"
                                  style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                                  disabled={verifyingId === t.id}
                                  onClick={() => handleVerifikasi(t.id)}>
                                  ✓ Tandai Lunas
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary rounded-circle"
                                  style={{ width: 28, height: 28, padding: 0 }}
                                  title="Cek Status Midtrans"
                                  onClick={async () => {
                                    const res = await fetch(`/api/tagihan/${t.id}/cek-status`);
                                    const data = await res.json();
                                    if (data.status === "lunas") {
                                      alert("Status terverifikasi LUNAS via Midtrans!");
                                      muatTagihan();
                                    } else {
                                      alert(`Status Midtrans: ${data.status || "Belum ada transaksi"}`);
                                    }
                                  }}>
                                  🔄
                                </button>
                              </>
                            )}
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
    </>
  );
}
