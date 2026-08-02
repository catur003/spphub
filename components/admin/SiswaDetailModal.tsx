"use client";

import { useEffect, useState } from "react";
import { IconX, IconClipboard, IconUser, IconFileText, IconWhatsapp } from "@/components/admin/icons";
import { Siswa, BULAN_LABEL, STATUS_BADGE, getAvatarColor, getInisial, formatTingkat } from "@/app/admin/siswa/types";

type Props = {
  /** ID siswa yang mau ditampilkan. null/undefined = modal tertutup. */
  siswaId: string | null | undefined;
  onClose: () => void;
};

/**
 * Modal profil siswa yang dipakai bareng di halaman Siswa, Tagihan SPP, dan
 * Tagihan Lainnya, supaya info yang ditampilkan selalu sama persis gak
 * peduli dari halaman mana dibuka. Self-fetch detail lengkap by id (bukan
 * cuma pakai data yang nempel di baris tabel) supaya riwayat tagihan ikut
 * kebawa juga.
 */
export default function SiswaDetailModal({ siswaId, onClose }: Props) {
  const [detailSiswa, setDetailSiswa] = useState<Siswa | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!siswaId) {
      setDetailSiswa(null);
      return;
    }
    let batal = false;
    setLoading(true);
    fetch(`/api/siswa/${siswaId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!batal) setDetailSiswa(data);
      })
      .finally(() => {
        if (!batal) setLoading(false);
      });
    return () => {
      batal = true;
    };
  }, [siswaId]);

  if (!siswaId) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[20px] bg-white shadow-lg2"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !detailSiswa ? (
          <div className="p-10 text-center text-ink-500">
            <span className="mx-auto mb-2 block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mb-0 font-semibold">Memuat profil siswa...</p>
          </div>
        ) : (
          <>
            <div className="sticky top-0 flex items-center justify-between gap-3 bg-gradient-to-r from-[#1e1b4b] to-[#4338ca] p-5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold text-white ${getAvatarColor(
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
                  <h5 className="mb-1 text-base font-bold text-white">{detailSiswa.namaLengkap}</h5>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-accent">
                      {detailSiswa.kelas ? `Kelas ${formatTingkat(detailSiswa.kelas.tingkat)}` : "Belum Ada Kelas"}
                    </span>
                    {detailSiswa.kelas?.namaKelas && (
                      <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-accent-hover">
                        Jurusan {detailSiswa.kelas.namaKelas}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_BADGE[detailSiswa.status] || "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {detailSiswa.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                className="text-xl leading-none text-white/70 hover:text-white"
                onClick={onClose}
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-card bg-surface p-3">
                  <h6 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink-900">
                    <IconClipboard className="h-4 w-4" /> Data Identitas
                  </h6>
                  <div className="mb-1 text-sm">
                    <strong>NIS:</strong> <span className="font-mono">{detailSiswa.nis}</span>
                  </div>
                  <div className="mb-1 text-sm">
                    <strong>NISN:</strong> <span className="font-mono">{detailSiswa.nisn || "-"}</span>
                  </div>
                  <div className="mb-1 text-sm">
                    <strong>Kelas:</strong> {detailSiswa.kelas ? formatTingkat(detailSiswa.kelas.tingkat) : "-"}
                  </div>
                  <div className="mb-1 text-sm">
                    <strong>Jurusan:</strong> {detailSiswa.kelas?.namaKelas || "-"}
                  </div>
                  <div className="mb-1 text-sm">
                    <strong>Jenis Kelamin:</strong> {detailSiswa.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                  </div>
                </div>

                <div className="rounded-card bg-surface p-3">
                  <h6 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink-900">
                    <IconUser className="h-4 w-4" /> Data Orang Tua / Wali
                  </h6>
                  <div className="mb-1 text-sm">
                    <strong>Nama Wali:</strong> {detailSiswa.namaWali || "-"}
                  </div>
                  <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                    <span>
                      <strong>Kontak Wali:</strong> {detailSiswa.kontakWali || "-"}
                    </span>
                    {detailSiswa.kontakWali && (
                      <a
                        href={`https://wa.me/${detailSiswa.kontakWali
                          .replace(/\D/g, "")
                          .replace(/^0/, "62")}?text=${encodeURIComponent(
                          `Halo Bapak/Ibu Wali dari ${detailSiswa.namaLengkap}...`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-green-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-green-700"
                      >
                        <IconWhatsapp width={12} height={12} /> Chat
                      </a>
                    )}
                  </div>
                  <div className="mb-1 text-sm">
                    <strong>Email Login Akun:</strong> {detailSiswa.akun?.email || "Belum Dibuatkan"}
                  </div>
                  {detailSiswa.kelas?.waliKelas && (
                    <div className="text-sm">
                      <strong>Wali Kelas:</strong> {detailSiswa.kelas.waliKelas}
                    </div>
                  )}
                </div>
              </div>

              {/* Riwayat Tagihan SPP (preview 3 terakhir) */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <h6 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                    <IconFileText className="h-4 w-4" /> Riwayat Tagihan SPP
                  </h6>
                  <a
                    href={`/admin/siswa/${detailSiswa.id}/riwayat?tab=spp`}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Lihat Semua Riwayat →
                  </a>
                </div>
                <div className="overflow-auto rounded-card border border-border-soft">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="bg-surface">
                      <tr className="text-left text-ink-500">
                        <th className="px-3 py-2 font-semibold">Periode</th>
                        <th className="px-3 py-2 font-semibold">Nominal</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
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
                        </tr>
                      ))}
                      {(!detailSiswa.tagihan || detailSiswa.tagihan.length === 0) && (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-ink-500">
                            Belum ada riwayat tagihan SPP.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Riwayat Tagihan Lainnya (preview 3 terakhir) */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h6 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                    <IconFileText className="h-4 w-4" /> Riwayat Tagihan Lainnya
                  </h6>
                  <a
                    href={`/admin/siswa/${detailSiswa.id}/riwayat?tab=lainnya`}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Lihat Semua Riwayat →
                  </a>
                </div>
                <div className="overflow-auto rounded-card border border-border-soft">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="bg-surface">
                      <tr className="text-left text-ink-500">
                        <th className="px-3 py-2 font-semibold">Jenis</th>
                        <th className="px-3 py-2 font-semibold">Nominal</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailSiswa.tagihanLain?.map((t) => (
                        <tr key={t.id} className="border-t border-border-soft">
                          <td className="px-3 py-2">{t.jenisTagihanLain?.nama || "Tagihan"}</td>
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
                        </tr>
                      ))}
                      {(!detailSiswa.tagihanLain || detailSiswa.tagihanLain.length === 0) && (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-ink-500">
                            Belum ada riwayat tagihan lainnya.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end rounded-b-[20px] bg-surface p-4">
              <button
                type="button"
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
