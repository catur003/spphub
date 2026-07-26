"use client";

import { DetailKelasResponse, formatRupiah } from "../types";

type Props = {
  detailLoading: boolean;
  detailKelasData: DetailKelasResponse | null;
  detailTab: "siswa" | "rekap";
  setDetailTab: (t: "siswa" | "rekap") => void;
  onClose: () => void;
};

export default function KelasDetailModal({
  detailLoading,
  detailKelasData,
  detailTab,
  setDetailTab,
  onClose,
}: Props) {
  if (!detailLoading && !detailKelasData) return null;

  return (
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-[20px] bg-white shadow-lg2"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        {detailLoading ? (
          <div className="p-10 text-center text-ink-500">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-accent-soft border-t-accent" />
            <p className="mb-0 font-semibold">Memuat detail &amp; rekap pembayaran kelas...</p>
          </div>
        ) : (
          detailKelasData && (
            <>
              <div className="flex items-start justify-between gap-3 rounded-t-[20px] bg-ink-900 px-6 py-5 text-white">
                <div>
                  <h5 className="mb-1 text-base font-bold text-white">
                    🏫 Detail Kelas {detailKelasData.namaKelas} (Tingkat {detailKelasData.tingkat})
                  </h5>
                  <p className="mb-0 text-sm text-white/60">
                    Wali Kelas: <strong>{detailKelasData.waliKelas || "Belum diatur"}</strong> |
                    Biaya SPP:{" "}
                    <strong>{formatRupiah(detailKelasData.nominalSpp || 0)}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Tutup"
                  className="text-xl leading-none text-white/70 hover:text-white"
                  onClick={onClose}
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    className={`rounded-control px-3 py-2 text-sm font-bold transition ${
                      detailTab === "siswa"
                        ? "bg-accent text-white"
                        : "bg-surface text-ink-900 hover:bg-accent-soft"
                    }`}
                    onClick={() => setDetailTab("siswa")}
                  >
                    👥 Daftar Siswa ({detailKelasData.siswa.length})
                  </button>
                  <button
                    className={`rounded-control px-3 py-2 text-sm font-bold transition ${
                      detailTab === "rekap"
                        ? "bg-accent text-white"
                        : "bg-surface text-ink-900 hover:bg-accent-soft"
                    }`}
                    onClick={() => setDetailTab("rekap")}
                  >
                    📊 Rekap Pembayaran Kelas
                  </button>
                </div>

                {detailTab === "siswa" ? (
                  <div className="max-h-[380px] overflow-auto">
                    <table className="w-full border-collapse text-[0.86rem]">
                      <thead className="bg-surface">
                        <tr>
                          {["No", "Nama Siswa", "NIS / NISN", "Gender", "Orang Tua / Wali", "Status"].map(
                            (h) => (
                              <th
                                key={h}
                                className="border-b border-border-soft px-3 py-2 text-left font-semibold text-ink-700"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {detailKelasData.siswa.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-surface">
                            <td className="border-b border-border-soft px-3 py-2">{idx + 1}</td>
                            <td className="border-b border-border-soft px-3 py-2">
                              <div className="font-bold text-ink-900">{s.namaLengkap}</div>
                            </td>
                            <td className="border-b border-border-soft px-3 py-2">
                              <div className="font-mono">NIS: {s.nis}</div>
                              {s.nisn && (
                                <div className="text-xs text-ink-500">NISN: {s.nisn}</div>
                              )}
                            </td>
                            <td className="border-b border-border-soft px-3 py-2">
                              {s.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                            </td>
                            <td className="border-b border-border-soft px-3 py-2">
                              {s.namaWali || "-"} ({s.kontakWali || "-"})
                            </td>
                            <td className="border-b border-border-soft px-3 py-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  s.status === "aktif"
                                    ? "bg-status-lunas/10 text-status-lunas"
                                    : "bg-ink-500/10 text-ink-500"
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {detailKelasData.siswa.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-ink-500">
                              Belum ada siswa terdaftar di kelas ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-card border border-border-soft bg-surface p-3 text-center">
                        <div className="text-sm font-semibold text-ink-500">
                          Total Tagihan Kelas
                        </div>
                        <div className="text-lg font-bold text-ink-900">
                          {formatRupiah(detailKelasData.rekap.totalNominalTagihan)}
                        </div>
                      </div>
                      <div className="rounded-card border border-status-lunas bg-status-lunas/10 p-3 text-center">
                        <div className="text-sm font-semibold text-status-lunas">
                          Total Terbayar (Lunas)
                        </div>
                        <div className="text-lg font-bold text-status-lunas">
                          {formatRupiah(detailKelasData.rekap.totalNominalLunas)}
                        </div>
                      </div>
                      <div className="rounded-card border border-status-terlambat bg-status-terlambat/10 p-3 text-center">
                        <div className="text-sm font-semibold text-status-terlambat">
                          Total Tunggakan
                        </div>
                        <div className="text-lg font-bold text-status-terlambat">
                          {formatRupiah(detailKelasData.rekap.totalNominalTunggakan)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-card border border-border-soft bg-white p-3">
                      <h6 className="mb-2 font-bold text-ink-900">Ringkasan Tagihan Siswa</h6>
                      <div className="flex justify-between border-b border-border-soft py-1 text-sm text-ink-500">
                        <span>Jumlah Tagihan Lunas</span>
                        <strong className="text-status-lunas">
                          {detailKelasData.rekap.jumlahLunasCount} transaksi
                        </strong>
                      </div>
                      <div className="flex justify-between py-1 text-sm text-ink-500">
                        <span>Jumlah Tagihan Belum/Terlambat</span>
                        <strong className="text-status-terlambat">
                          {detailKelasData.rekap.jumlahBelumCount} transaksi
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end rounded-b-[20px] bg-surface px-6 py-4">
                <button
                  className="rounded-full bg-ink-500 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700"
                  onClick={onClose}
                >
                  Tutup
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
