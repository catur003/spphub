"use client";

import { useEffect, useState, useCallback } from "react";
import { useConfirmModal } from "@/components/admin/ConfirmModal";

type TahunAjaran = { id: string; nama: string; aktif: boolean };
type KelasOption = { id: string; namaKelas: string };
type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo: string;
  siswa?: { namaLengkap?: string; nis?: string; kelas?: { id?: string; namaKelas?: string } | null } | null;
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

  // Filter tabel
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterKelasId, setFilterKelasId] = useState("");

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

  async function muatKelas() {
    const res = await fetch("/api/kelas");
    if (res.ok) setKelasList(await res.json());
  }

  const muatTagihan = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus)  params.set("status", filterStatus);
    if (filterBulan)   params.set("bulan", filterBulan);
    if (filterTahun)   params.set("tahun", filterTahun);
    if (filterKelasId) params.set("kelasId", filterKelasId);
    
    const res = await fetch(`/api/tagihan?${params.toString()}`);
    if (res.ok) setDaftar(await res.json());
  }, [filterStatus, filterBulan, filterTahun, filterKelasId]);

  useEffect(() => {
    muatTahunAjaran();
    muatKelas();
  }, []);

  useEffect(() => {
    muatTagihan();
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

  const totalTagihan = daftar.length;
  const totalLunas   = daftar.filter((t) => t.status === "lunas").length;
  const totalBelum   = daftar.filter((t) => t.status === "belum_bayar" || t.status === "terlambat").length;
  const totalNominal = daftar.reduce((acc, t) => acc + t.nominal, 0);

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

        .class-tab-bar {
          display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.5rem;
          margin-bottom: 1.25rem; border-bottom: 1px solid #e2e8f0;
        }
        .class-tab-btn {
          padding: 0.5rem 1.1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600;
          border: 1px solid #e2e8f0; background: white; color: #64748b;
          white-space: nowrap; cursor: pointer; transition: all 0.2s;
        }
        .class-tab-btn:hover { background: #f8fafc; color: #4338ca; border-color: #cbd5e1; }
        .class-tab-btn.active {
          background: #4338ca; color: white; border-color: #4338ca; box-shadow: 0 4px 12px rgba(67, 56, 202, 0.2);
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
            Generate tagihan massal berdasar Billing Rules kelas & penuhi monitoring pembayaran.
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
          <h2 className="h6 mb-3 fw-bold" style={{ color: "var(--ink-900)" }}>
            ⚡ Generate Tagihan Massal (Billing Rules Otomatis)
          </h2>
          {genError && <div className="alert alert-danger py-2 small mb-3">{genError}</div>}
          {genResult && (
            <div className="alert alert-success py-2 small mb-3">
              🎉 Berhasil membuat <strong>{genResult.dibuat}</strong> tagihan baru ({genResult.dilewati} siswa dilewati).
            </div>
          )}
          <form onSubmit={handleGenerate} className="row g-2 align-items-end">
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-semibold text-muted">Bulan</label>
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
                <option value="">-- Pilih --</option>
                {tahunAjaranList.map((t) => (
                  <option key={t.id} value={t.id}>{t.nama}{t.aktif ? " (Aktif)" : ""}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label small fw-semibold text-muted">Jatuh Tempo</label>
              <input type="date" className="form-control form-control-sm" value={gen.jatuhTempo}
                onChange={(e) => setGen({ ...gen, jatuhTempo: e.target.value })} required />
            </div>
            <div className="col-12 col-md-2">
              <button type="submit" className="btn btn-primary btn-sm w-100 fw-bold" disabled={genLoading}>
                {genLoading ? "Memproses..." : "⚡ Generate Massal"}
              </button>
            </div>
          </form>
        </div>

        {/* Tab Navigasi Per Kelas */}
        <div className="class-tab-bar">
          <button
            className={`class-tab-btn ${filterKelasId === "" ? "active" : ""}`}
            onClick={() => setFilterKelasId("")}
          >
            🏫 Semua Kelas
          </button>
          {kelasList.map((k) => (
            <button
              key={k.id}
              className={`class-tab-btn ${filterKelasId === k.id ? "active" : ""}`}
              onClick={() => setFilterKelasId(k.id)}
            >
              Kelas {k.namaKelas}
            </button>
          ))}
        </div>

        {/* Sub-filters (Bulan, Tahun, Status) */}
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <select className="form-select form-select-sm" style={{ maxWidth: 140 }}
            value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}>
            <option value="">Semua Bulan</option>
            {BULAN_LABEL.slice(1).map((lbl, i) => (
              <option key={i + 1} value={i + 1}>{lbl}</option>
            ))}
          </select>
          <select className="form-select form-select-sm" style={{ maxWidth: 130 }}
            value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}>
            <option value="">Semua Tahun</option>
            {TAHUN_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select className="form-select form-select-sm" style={{ maxWidth: 170 }}
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            {Object.entries(STATUS_INFO).map(([val, info]) => (
              <option key={val} value={val}>{info.label}</option>
            ))}
          </select>

          {(filterBulan || filterTahun || filterStatus || filterKelasId) && (
            <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8, fontSize: "0.78rem" }}
              onClick={() => { setFilterBulan(""); setFilterTahun(""); setFilterStatus(""); setFilterKelasId(""); }}>
              ✕ Reset Filter
            </button>
          )}

          <span className="ms-auto text-muted small fw-semibold">
            {daftar.length} data tagihan ditemukan
          </span>
        </div>

        {/* Tabel Tagihan Spasial Rapi */}
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
                {daftar.map((t) => {
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
                      <td className="text-end">
                        {t.status === "lunas" ? (
                          <a href={`/kwitansi/${t.id}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary rounded-pill px-3">
                            Kwitansi
                          </a>
                        ) : (
                          <div className="d-flex gap-1 justify-content-end">
                            <button
                              className="btn btn-sm btn-success rounded-pill px-2 fw-semibold"
                              style={{ fontSize: "0.75rem" }}
                              disabled={verifyingId === t.id}
                              onClick={() => handleVerifikasi(t.id)}>
                              ✓ Tandai Lunas
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary rounded-circle"
                              style={{ width: 30, height: 30, padding: 0 }}
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
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {daftar.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-5">
                      <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📄</div>
                      Belum ada data tagihan untuk filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
