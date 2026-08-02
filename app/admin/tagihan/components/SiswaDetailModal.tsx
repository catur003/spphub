"use client";

import { IconWhatsapp } from "@/components/admin/icons";
import { SiswaDetail, getAvatarColor, getInisial } from "../types";
import { tingkatKeRomawi } from "@/app/admin/siswa/types";

type Props = {
  detailSiswa: SiswaDetail | null;
  onClose: () => void;
};

function InfoBox({ label, value, span2 }: { label: string; value: React.ReactNode; span2?: boolean }) {
  return (
    <div className={`rounded-card border border-border-soft bg-surface p-3 ${span2 ? "col-span-2" : ""}`}>
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className="font-bold text-ink-900">{value}</div>
    </div>
  );
}

export default function SiswaDetailModal({ detailSiswa, onClose }: Props) {
  if (!detailSiswa) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-lg2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#1e1b4b] to-[#4338ca] p-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold text-white ${getAvatarColor(
                detailSiswa.namaLengkap
              )}`}
            >
              {detailSiswa.fotoUrl ? (
                <img src={detailSiswa.fotoUrl} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <span>{getInisial(detailSiswa.namaLengkap)}</span>
              )}
            </div>
            <div>
              <h5 className="mb-0 text-base font-bold text-white">{detailSiswa.namaLengkap}</h5>
              <div className="text-sm text-white/60">
                NIS: {detailSiswa.nis || "-"} | NISN: {detailSiswa.nisn || "-"}
              </div>
            </div>
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
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3">
            <InfoBox label="KELAS" value={detailSiswa.kelas ? tingkatKeRomawi(detailSiswa.kelas.tingkat) : "-"} />
            <InfoBox label="JURUSAN" value={detailSiswa.kelas?.namaKelas || "-"} />
            <InfoBox
              label="JENIS KELAMIN"
              value={detailSiswa.jenisKelamin === "P" ? "Perempuan" : "Laki-laki"}
            />
            <InfoBox span2 label="NAMA WALI SISWA" value={detailSiswa.namaWali || "-"} />
            <div className="col-span-2 flex items-center justify-between rounded-card border border-border-soft bg-surface p-3">
              <div>
                <div className="text-xs font-semibold text-ink-500">KONTAK WALI (WHATSAPP)</div>
                <div className="font-bold text-ink-900">{detailSiswa.kontakWali || "-"}</div>
              </div>
              {detailSiswa.kontakWali && (
                <a
                  href={`https://wa.me/${detailSiswa.kontakWali
                    .replace(/\D/g, "")
                    .replace(/^0/, "62")}?text=${encodeURIComponent(
                    `Halo Bapak/Ibu Wali dari ${detailSiswa.namaLengkap}...`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-green-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-green-700"
                >
                  <IconWhatsapp width={14} height={14} /> Chat WA
                </a>
              )}
            </div>
            {detailSiswa.kelas?.waliKelas && (
              <InfoBox span2 label="WALI KELAS" value={detailSiswa.kelas.waliKelas} />
            )}
          </div>
        </div>
        <div className="flex justify-end rounded-b-[24px] bg-surface p-4">
          <button
            type="button"
            className="rounded-full bg-ink-500 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
