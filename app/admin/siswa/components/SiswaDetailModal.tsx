"use client";

import { Siswa, BULAN_LABEL, STATUS_BADGE, getAvatarColor, getInisial } from "../types";

type Props = {
  detailSiswa: Siswa | null;
  loadingDetail: boolean;
  onClose: () => void;
};

export default function SiswaDetailModal({ detailSiswa, loadingDetail, onClose }: Props) {
  if (!loadingDetail && !detailSiswa) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[20px] bg-white shadow-lg2"
        onClick={(e) => e.stopPropagation()}
      >
        {loadingDetail ? (
          <div className="p-10 text-center text-ink-500">
            <span className="mx-auto mb-2 block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mb-0 font-semibold">Memuat profil lengkap siswa...</p>
          </div>
        ) : detailSiswa && (
          <>
            <div className="flex items-center justify-between gap-3 bg-accent px-6 py-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl text-base font-bold text-white ${getAvatarColor(
                    detailSiswa.namaLengkap
                  )}`}
                >
                  {detailSiswa.fotoUrl ? (
                    <img src={detailSiswa.fotoUrl} alt="Foto" className="h-full w-full object-cover" />
                  ) : (
                    getInisial(detailSiswa.namaLengkap)
                  )}
                </div>
                <div>
                  <h5 className="mb-0 text-base font-bold text-white">{detailSiswa.namaLengkap}</h5>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-accent">
                    {detailSiswa.kelas?.namaKelas ? `Kelas ${detailSiswa.kelas.namaKelas}` : "Belum Ada Kelas"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                className="text-xl leading-none text-white/80 hover:text-white"
                onClick={onClose}
              >
                ×
              </button>
            </div>
            <div className="p-5">
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-card bg-surface p-3">
                  <h6 className="mb-2 text-sm font-bold text-ink-900">📋 Data Identitas</h6>
                  <div className="mb-1 text-sm">
                    <strong>NIS:</strong> <span className="font-mono">{detailSiswa.nis}</span>
                  </div>
                  <div className="mb-1 text-sm">
                    <strong>NISN:</strong> <span className="font-mono">{detailSiswa.nisn || "-"}</span>
                  </div>
                  <div className="mb-1 text-sm">
                    <strong>Jenis Kelamin:</strong> {detailSiswa.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                  </div>
                  <div className="mb-1 text-sm">
                    <strong>Status Siswa:</strong>{" "}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        STATUS_BADGE[detailSiswa.status] || "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {detailSiswa.status}
                    </span>
                  </div>
                </div>
                <div className="rounded-card bg-surface p-3">
                  <h6 className="mb-2 text-sm font-bold text-ink-900">👨‍👩‍👧 Data Orang Tua / Wali</h6>
                  <div className="mb-1 text-sm">
                    <strong>Nama Wali:</strong> {detailSiswa.namaWali || "-"}
                  </div>
                  <div className="mb-1 text-sm">
                    <strong>Kontak Wali:</strong> {detailSiswa.kontakWali || "-"}
                  </div>
                  <div className="mb-1 text-sm">
                    <strong>Email Login Akun:</strong> {detailSiswa.akun?.email || "Belum Dibuatkan"}
                  </div>
                </div>
              </div>

              <h6 className="mb-2 text-sm font-bold text-ink-900">📜 Riwayat Tagihan SPP Siswa</h6>
              <div className="max-h-[220px] overflow-y-auto rounded-card border border-border-soft">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-ink-500">
                      <th className="px-3 py-2 font-semibold">Periode</th>
                      <th className="px-3 py-2 font-semibold">Nominal</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Tanggal Terakhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailSiswa.tagihan?.map((t) => (
                      <tr key={t.id} className="border-t border-border-soft">
                        <td className="px-3 py-2">
                          {BULAN_LABEL[t.bulan]} {t.tahun}
                        </td>
                        <td className="px-3 py-2 font-semibold">Rp {t.nominal.toLocaleString("id-ID")}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              t.status === "lunas" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-ink-500">
                          {new Date(t.updatedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                    {(!detailSiswa.tagihan || detailSiswa.tagihan.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-ink-500">
                          Belum ada riwayat tagihan SPP untuk siswa ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end rounded-b-[20px] bg-surface p-4">
              <button
                className="rounded-full bg-ink-500 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700"
                onClick={onClose}
              >
                Tutup
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
