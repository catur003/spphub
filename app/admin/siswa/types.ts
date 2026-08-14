// PENTING: field di sini harus tetap superset/cocok dengan Kelas di
// app/admin/kelas/types.ts (dan model Kelas di schema.prisma) — dulu type
// lokal ini cuma { id, namaKelas, tingkat }, gak punya `waliKelas`, padahal
// SiswaDetailModal.tsx makai `detailSiswa.kelas.waliKelas`. Akibatnya file
// itu gagal type-check (TS2339: Property 'waliKelas' does not exist),
// cuma gak ketahuan karena next.config.mjs set `ignoreBuildErrors: true`.
export type Kelas = { id: string; namaKelas: string; tingkat?: number; waliKelas?: string | null };

export type Siswa = {
  id: string;
  nis: string;
  nisn: string | null;
  namaLengkap: string;
  jenisKelamin: "L" | "P";
  tanggalLahir?: string | null;
  namaWali?: string | null;
  kontakWali?: string | null;
  fotoUrl?: string | null;
  status: string;
  kelas: Kelas | null;
  akun: { email: string } | null;
  tagihan?: { id: string; bulan: number; tahun: number; nominal: number; status: string; updatedAt: string }[];
  tagihanLain?: {
    id: string;
    nominal: number;
    status: string;
    jatuhTempo: string;
    updatedAt: string;
    jenisTagihanLain?: { nama: string } | null;
  }[];
};

export type SortField = "nama" | "nis" | "kelas" | "status";

export const STATUS_LABEL: Record<string, string> = {
  aktif: "Aktif",
  lulus: "Lulus",
  pindah: "Pindah",
  nonaktif: "Nonaktif",
};

export const STATUS_BADGE: Record<string, string> = {
  aktif: "bg-green-100 text-green-700",
  lulus: "bg-blue-100 text-blue-700",
  pindah: "bg-yellow-100 text-yellow-800",
  nonaktif: "bg-gray-100 text-gray-500",
};

// Catatan penamaan: field "Kelas" di database (namaKelas, mis. "RPL 1")
// sebenarnya adalah JURUSAN. Yang seharusnya disebut "Kelas" adalah field
// `tingkat` (angka bebas — sekolah SMA umumnya 10/11/12, tapi SMP/SD bisa
// beda, lihat halaman Kelas). Ditampilkan apa adanya, sama kayak konvensi
// yang sudah dipakai di KelasTable.tsx ("Kelas {tingkat}") — bukan diubah
// ke romawi supaya gak salah untuk tingkat non-SMA.
export function formatTingkat(tingkat?: number | null): string {
  return tingkat ? String(tingkat) : "-";
}

export const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export type HasilImport = {
  total: number;
  berhasil: number;
  gagal: { baris: number; alasan?: string; nama?: string }[];
};

export type FormTambah = {
  namaLengkap: string;
  nis: string;
  nisn: string;
  jenisKelamin: string;
  kelasId: string;
  tanggalLahir: string;
  namaWali: string;
  kontakWali: string;
  fotoUrl: string;
  status: string;
  buatAkun: boolean;
  email: string;
  password: string;
};

export const FORM_TAMBAH_KOSONG: FormTambah = {
  namaLengkap: "",
  nis: "",
  nisn: "",
  jenisKelamin: "L",
  kelasId: "",
  tanggalLahir: "",
  namaWali: "",
  kontakWali: "",
  fotoUrl: "",
  status: "aktif",
  buatAkun: false,
  email: "",
  password: "",
};

export type FormEdit = {
  namaLengkap: string;
  nis: string;
  nisn: string;
  jenisKelamin: string;
  kelasId: string;
  tanggalLahir: string;
  namaWali: string;
  kontakWali: string;
  fotoUrl: string;
  status: string;
  // Manajemen akun
  buatAkun: boolean;
  email: string;
  password: string;
  gantiEmail: boolean;
  emailBaru: string;
  resetPassword: boolean;
  passwordBaru: string;
};

export const FORM_EDIT_KOSONG: FormEdit = {
  namaLengkap: "",
  nis: "",
  nisn: "",
  jenisKelamin: "L",
  kelasId: "",
  tanggalLahir: "",
  namaWali: "",
  kontakWali: "",
  fotoUrl: "",
  status: "aktif",
  buatAkun: false,
  email: "",
  password: "",
  gantiEmail: false,
  emailBaru: "",
  resetPassword: false,
  passwordBaru: "",
};

const AVATAR_COLORS = [
  "bg-[#6366f1]", "bg-[#8b5cf6]", "bg-[#ec4899]", "bg-[#f59e0b]",
  "bg-[#10b981]", "bg-[#3b82f6]", "bg-[#ef4444]", "bg-[#14b8a6]",
];

export function getAvatarColor(nama: string): string {
  let h = 0;
  for (let i = 0; i < nama.length; i++) h = (h * 31 + nama.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function getInisial(nama: string): string {
  return nama
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

// Kompresi & upload gambar diekstrak ke lib/upload-client.ts (dipakai bareng
// dengan upload logo sekolah di Settings). Re-export di sini biar import
// lama (`from "../types"`) di page.tsx & komponen form gak perlu diubah.
export { MIME_GAMBAR_DIIZINKAN as MIME_FOTO_DIIZINKAN, kompresGambar } from "@/lib/upload-client";
import { uploadGambar } from "@/lib/upload-client";

/** Upload file foto (sudah dikompres) ke endpoint /api/upload, kembalikan URL. */
export async function uploadFotoFile(file: File): Promise<string> {
  return uploadGambar(file, "foto_siswa.jpg");
}
