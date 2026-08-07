export type Kelas = {
  id: string;
  namaKelas: string;
  tingkat: number;
  nominalSpp?: number;
  waliKelas?: string | null;
  _count: { siswa: number };
};

export type KelasSortField = "nama" | "wali" | "spp" | "jumlahSiswa";

export type SiswaDetail = {
  id: string;
  namaLengkap: string;
  nis: string;
  nisn: string | null;
  jenisKelamin: "L" | "P";
  status: string;
  fotoUrl: string | null;
  namaWali: string | null;
  kontakWali: string | null;
  tagihan: { id: string; nominal: number; status: string }[];
};

export type DetailKelasResponse = Kelas & {
  siswa: SiswaDetail[];
  rekap: {
    totalSiswa: number;
    totalNominalTagihan: number;
    totalNominalLunas: number;
    totalNominalTunggakan: number;
    jumlahLunasCount: number;
    jumlahBelumCount: number;
  };
};

/** Warna avatar deterministik */
const KELAS_COLORS = [
  "bg-[#6366f1]",
  "bg-[#8b5cf6]",
  "bg-[#ec4899]",
  "bg-[#f59e0b]",
  "bg-[#10b981]",
  "bg-[#3b82f6]",
  "bg-[#ef4444]",
  "bg-[#14b8a6]",
];

export function kelasColor(nama: string): string {
  let h = 0;
  for (let i = 0; i < nama.length; i++) h = (h * 31 + nama.charCodeAt(i)) & 0xffff;
  return KELAS_COLORS[h % KELAS_COLORS.length];
}

export function formatRupiah(n: number): string {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
}
