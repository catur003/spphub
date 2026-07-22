"use client";

import { useEffect, useState, useCallback } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type TahunAjaran = { id: string; nama: string; aktif: boolean };
type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo: string;
  siswa: { namaLengkap: string; nis: string };
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

/** Warna avatar deterministik */
const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
function getAvatarColor(nama: string) {
  let h = 0;
  for (let i = 0; i < nama.length; i++) h = (h * 31 + nama.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function getInisial(nama: string) {
  return nama.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

export default function TagihanPage() {
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [daftar, setDaftar] = useState<Tagihan[]>([]);

  // Filter tabel
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");

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
  const { confirm, alertMsg, modal } = useConfirmModal();

  async function muatTahunAjaran() {
    const res = await fetch("/api/tahun-ajaran");
    if (res.ok) {
      const data: TahunAjaran[] = await res.json();
      setTahunAjaranList(data);
      const aktif = data.find((t) => t.aktif);
      if (aktif) setGen((g) => ({ ...g, tahunAjaranId: aktif.id }));
    }
  }

  const muatTagihan = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterBulan)  params.set("bulan", filterBulan);
    if (filterTahun)  params.set("tahun", filterTahun);
    const res = await fetch(`/api/tagihan?${params.toString()}`);
    if (res.ok) setDaftar(await res.json());
  }, [filterStatus, filterBulan, filterTahun]);

  useEffect(() => { muatTahunAjaran(); }, []);
  useEffect(() => { muatTagihan(); }, [muatTagihan]);

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
    if (!(await confirm("Tandai tagihan ini sebagai LUNAS (verifikasi manual)?",
      { confirmLabel: "Ya, Tandai Lunas", variant: "primary" }))) return;
    setVerifyingId(id);
    const res = await fetch(`/api/tagihan/${id}/verifikasi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metode: "transfer_bank" }),
    });
    setVerifyingId(null);
    if (!res.ok) {
      const data = await res.json();
      await alertMsg(data.error || "Gagal verifikasi");
      return;
    }
    muatTagihan();
  }

  const totalTagihan   = daftar.length;
  const totalLunas     = daftar.filter((t) => t.status === "lunas").length;
  const totalBelum     = daftar.filter((t) => t.status === "belum_bayar" || t.status === "terlambat").length;
  const totalNominal   = daftar.reduce((s, t) => s + t.nominal, 0);

  return (
    <>
      <style>{`
        /* ——— Stats cards ——— */
        .stat-card {
          border-radius: 14px; padding: 1rem 1.2rem;
          border: 1px solid var(--border-soft); background: white;
          box-shadow: var(--shadow-sm);
        }
        .stat-card__icon {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; margin-bottom: 0.5rem;
        }
        .stat-card__value { font-size: 1.45rem; font-weight: 800; color: var(--ink-900); line-height: 1; }
        .stat-card__label { font-size: 0.75rem; color: var(--ink-500); margin-top: 3px; }

        /* ——— Generate form card ——— */
        .gen-card { border-radius: 14px; border: 1px solid var(--border-soft); overflow: hidden; }
        .gen-card__header {
          background: linear-gradient(135deg,#4f46e5,#7c3aed);
          padding: 0.9rem 1.2rem; display: flex; align-items: center; gap: 0.6rem;
        }
        .gen-card__header h2 { color: #fff; font-size: 0.92rem; margin: 0; font-weight: 700; }
        .gen-card__body { padding: 1.2rem; background: white; }

        /* ——— Generate result ——— */
        .gen-result {
          display: flex; align-items: flex-start; gap: 0.85rem;
          padding: 1rem 1.1rem; border-radius: 12px;
          border: 1.5px solid #86efac; background: #f0fdf4; margin-bottom: 1rem;
        }
        .gen-result__icon {
          width: 36px; height: 36px; border-radius: 50%; background: #15803d;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 1rem; flex-shrink: 0;
        }
        .gen-result__count {
          font-size: 1.4rem; font-weight: 800; color: #15803d; line-height: 1;
        }
        .gen-result__label { font-size: 0.78rem; color: #166534; }

        /* ——— Filter bar ——— */
        .filter-bar {
          display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
          padding: 0.75rem 1rem; background: white;
          border: 1px solid var(--border-soft); border-radius: 12px;
          margin-bottom: 1rem;
        }
        .filter-bar label { font-size: 0.75rem; font-weight: 600; color: var(--ink-500); white-space: nowrap; }

        /* ——— Tagihan table ——— */
        .tagihan-table th {
          font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--ink-500); font-weight: 600; background: var(--surface);
          padding: 0.65rem 0.9rem; border-bottom: 2px solid var(--border-soft);
        }
        .tagihan-table td { padding: 0.7rem 0.9rem; vertical-align: middle; font-size: 0.86rem; }
        .tagihan-table tbody tr { transition: background 0.12s ease; }
        .tagihan-table tbody tr:hover { background: #f5f7ff; }

        /* ——— Status badge ——— */
        .status-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.73rem; font-weight: 600;
        }
        .status-chip::before {
          content:''; width:6px; height:6px; border-radius:50%; background:currentColor; opacity:0.65;
        }

        /* ——— Periode badge ——— */
        .periode-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: 8px;
          background: #eef2ff; color: #4338ca;
          font-size: 0.75rem; font-weight: 600;
        }

        /* ——— Avatar ——— */
        .siswa-avatar-sm {
          width:30px; height:30px; border-radius:8px;
          display:inline-flex; align-items:center; justify-content:center;
          font-size:0.68rem; font-weight:700; color:white; flex-shrink:0;
        }

        .nominal-text { font-family: monospace; font-weight: 600; font-size: 0.85rem; }
      `}</style>

      <div className="container-fluid p-4">
        <div className="mb-4">
          <h1 className="h4 mb-0 fw-bold" style={{ color: "var(--ink-900)" }}>Kelola Tagihan</h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
            Generate dan pantau tagihan SPP siswa
          </p>
        </div>

        {/* ——— Stats ——— */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: "#eef2ff" }}>📋</div>
              <div className="stat-card__value">{totalTagihan}</div>
              <div className="stat-card__label">Total Tagihan</div>
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

        {/* ——— Generate Form ——— */}
        <div className="gen-card mb-4">
          <div className="gen-card__header">
            <h2>⚡ Generate Tagihan Bulanan</h2>
          </div>
          <div className="gen-card__body">
            {genError && <div className="alert alert-danger py-2 small mb-3">{genError}</div>}

            {genResult && (
              <div className="gen-result mb-3">
                <div className="gen-result__icon">✓</div>
                <div>
                  <div className="d-flex align-items-baseline gap-3">
                    <div>
                      <div className="gen-result__count">{genResult.dibuat}</div>
                      <div className="gen-result__label">tagihan dibuat</div>
                    </div>
                    <div>
                      <div className="gen-result__count" style={{ color: "#6b7280" }}>{genResult.dilewati}</div>
                      <div className="gen-result__label" style={{ color: "#6b7280" }}>dilewati (sudah ada)</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleGenerate}>
              <div className="row g-2">
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Tahun Ajaran</label>
                  <select className="form-select form-select-sm" value={gen.tahunAjaranId}
                    onChange={(e) => setGen({ ...gen, tahunAjaranId: e.target.value })} required>
                    <option value="">— Pilih —</option>
                    {tahunAjaranList.map((t) => (
                      <option key={t.id} value={t.id}>{t.nama}{t.aktif ? " ✓" : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small fw-semibold">Bulan</label>
                  <select className="form-select form-select-sm" value={gen.bulan}
                    onChange={(e) => setGen({ ...gen, bulan: e.target.value })}>
                    {BULAN_LABEL.slice(1).map((b, i) => (
                      <option key={i + 1} value={i + 1}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small fw-semibold">Tahun</label>
                  <select className="form-select form-select-sm" value={gen.tahun}
                    onChange={(e) => setGen({ ...gen, tahun: e.target.value })}>
                    {TAHUN_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small fw-semibold">Nominal (Rp)</label>
                  <input type="number" className="form-control form-control-sm" value={gen.nominal}
                    onChange={(e) => setGen({ ...gen, nominal: e.target.value })}
                    placeholder="500000" required />
                </div>
                <div className="col-md-2">
                  <label className="form-label small fw-semibold">Jatuh Tempo</label>
                  <input type="date" className="form-control form-control-sm" value={gen.jatuhTempo}
                    onChange={(e) => setGen({ ...gen, jatuhTempo: e.target.value })} required />
                </div>
                <div className="col-md-1 d-flex align-items-end">
                  <button className="btn btn-primary btn-sm w-100" disabled={genLoading}>
                    {genLoading
                      ? <span className="spinner-border spinner-border-sm" />
                      : "Generate"}
                  </button>
                </div>
              </div>
              <p className="text-muted mt-2 mb-0" style={{ fontSize: "0.75rem" }}>
                Otomatis melewati siswa yang sudah punya tagihan di periode yang sama.
              </p>
            </form>
          </div>
        </div>

        {/* ——— Filter Bar ——— */}
        <div className="filter-bar">
          <label>Filter:</label>
          <select className="form-select form-select-sm" style={{ maxWidth: 150 }}
            value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}>
            <option value="">Semua Bulan</option>
            {BULAN_LABEL.slice(1).map((b, i) => (
              <option key={i + 1} value={i + 1}>{b}</option>
            ))}
          </select>
          <select className="form-select form-select-sm" style={{ maxWidth: 120 }}
            value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}>
            <option value="">Semua Tahun</option>
            {TAHUN_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select className="form-select form-select-sm" style={{ maxWidth: 180 }}
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            {Object.entries(STATUS_INFO).map(([val, info]) => (
              <option key={val} value={val}>{info.label}</option>
            ))}
          </select>
          {(filterBulan || filterTahun || filterStatus) && (
            <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8, fontSize: "0.78rem" }}
              onClick={() => { setFilterBulan(""); setFilterTahun(""); setFilterStatus(""); }}>
              ✕ Reset
            </button>
          )}
          <span className="ms-auto text-muted" style={{ fontSize: "0.78rem" }}>
            {daftar.length} tagihan
          </span>
        </div>

        {/* ——— Tabel Tagihan ——— */}
        <div className="card p-0 overflow-hidden">
          <div className="table-responsive">
            <table className="table tagihan-table mb-0">
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th>Periode</th>
                  <th>Nominal</th>
                  <th>Jatuh Tempo</th>
                  <th>Status</th>
                  <th style={{ width: 140 }}></th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((t) => {
                  const info = STATUS_INFO[t.status] || { label: t.status, bg: "#f3f4f6", color: "#374151" };
                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="siswa-avatar-sm" style={{ background: getAvatarColor(t.siswa.namaLengkap) }}>
                            {getInisial(t.siswa.namaLengkap)}
                          </div>
                          <div>
                            <div className="fw-semibold" style={{ fontSize: "0.86rem" }}>{t.siswa.namaLengkap}</div>
                            <div style={{ fontSize: "0.73rem", color: "var(--ink-500)", fontFamily: "monospace" }}>
                              {t.siswa.nis}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="periode-badge">
                          {BULAN_LABEL[t.bulan]} {t.tahun}
                        </span>
                      </td>
                      <td>
                        <span className="nominal-text">
                          Rp {t.nominal.toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--ink-500)" }}>
                        {new Date(t.jatuhTempo).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td>
                        <span className="status-chip"
                          style={{ background: info.bg, color: info.color }}>
                          {info.label}
                        </span>
                      </td>
                      <td>
                        {t.status === "lunas" ? (
                          <a href={`/kwitansi/${t.id}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8, fontSize: "0.78rem" }}>
                            Cetak Kwitansi
                          </a>
                        ) : (
                          <div className="d-flex flex-column gap-1">
                            <button
                              className="btn btn-sm btn-outline-success"
                              style={{ borderRadius: 8, fontSize: "0.78rem" }}
                              disabled={verifyingId === t.id}
                              onClick={() => handleVerifikasi(t.id)}>
                              {verifyingId === t.id
                                ? <span className="spinner-border spinner-border-sm" />
                                : "✓ Tandai Lunas"}
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              style={{ borderRadius: 8, fontSize: "0.75rem" }}
                              onClick={async () => {
                                const res = await fetch(`/api/tagihan/${t.id}/cek-status`);
                                const data = await res.json();
                                if (data.status === "lunas") {
                                  alert("Status terverifikasi LUNAS via Midtrans!");
                                  window.location.reload();
                                } else {
                                  alert(`Status Midtrans: ${data.status || "Belum ada transaksi"}`);
                                }
                              }}>
                              🔄 Cek Midtrans
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {daftar.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-5">
                      <div style={{ fontSize: "2rem", marginBottom: 8 }}>📄</div>
                      Belum ada tagihan{filterBulan || filterTahun || filterStatus ? " untuk filter ini" : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {modal}
    </>
  );
}
