"use client";

import { IconWarning } from "@/components/admin/icons";

/**
 * Parse "YYYY-MM-DD" (format bawaan <input type="date">) jadi bagian
 * tahun/bulan/hari lewat regex, BUKAN `new Date(str)`. Sengaja gitu supaya
 * gak kena pergeseran timezone (`new Date("2026-08-01")` diparse sebagai UTC
 * tengah malam, terus `.getMonth()`/`.getFullYear()` pakai timezone LOKAL
 * browser — di timezone UTC-negatif ini bisa mundur satu hari dan salah
 * bulan/tahun pas tanggalnya persis tanggal 1).
 */
function parseTanggalInput(value: string): { tahun: number; bulan: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  if (!m) return null;
  return { tahun: Number(m[1]), bulan: Number(m[2]) };
}

/** Bandingkan periode tagihan (bulan & tahun) dengan bulan & tahun jatuh tempo. */
export function bedaPeriodeDanJatuhTempo(
  bulan: string | number,
  tahun: string | number,
  jatuhTempo: string
): boolean {
  const parsed = parseTanggalInput(jatuhTempo);
  if (!parsed) return false; // jatuh tempo belum diisi/gak valid -> jangan tampilkan apa-apa
  return parsed.bulan !== Number(bulan) || parsed.tahun !== Number(tahun);
}

type Props = {
  bulan: string | number;
  tahun: string | number;
  jatuhTempo: string;
};

/**
 * Peringatan non-blocking (bukan validasi yang mencegah submit) buat
 * ngingetin admin kalau bulan/tahun jatuh tempo beda dari periode
 * tagihan yang dipilih. Ada kasus yang memang valid (mis. tagihan Juli
 * dengan jatuh tempo Agustus), jadi ini cuma reminder, bukan error.
 * Update real-time karena murni turunan dari props terkontrol form-nya —
 * gak perlu state/effect sendiri.
 */
export default function PeriodeJatuhTempoWarning({ bulan, tahun, jatuhTempo }: Props) {
  if (!bedaPeriodeDanJatuhTempo(bulan, tahun, jatuhTempo)) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-control border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
    >
      <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Jatuh tempo berada di bulan yang berbeda dari periode tagihan. Pastikan ini memang sesuai
        kebijakan sekolah.
      </span>
    </div>
  );
}
