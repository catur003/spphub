export type TahunAjaran = { id: string; nama: string; aktif: boolean };
export type KelasOption = { id: string; namaKelas: string; tingkat?: number; nominalSpp?: number };

export type SiswaDetail = {
  id?: string;
  namaLengkap?: string;
  nis?: string;
  nisn?: string | null;
  jenisKelamin?: string;
  namaWali?: string | null;
  kontakWali?: string | null;
  fotoUrl?: string | null;
  kelas?: { id?: string; namaKelas?: string; tingkat?: number; waliKelas?: string | null } | null;
};

export type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo: string;
  siswa?: SiswaDetail | null;
};

export type SortField = "siswa" | "kelas" | "periode" | "nominal" | "status";

export const BULAN_LABEL = [
  "",
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const STATUS_INFO: Record<string, { label: string; className: string }> = {
  belum_bayar: { label: "Belum Bayar", className: "bg-red-100 text-red-800" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", className: "bg-yellow-100 text-yellow-800" },
  lunas: { label: "Lunas", className: "bg-green-100 text-green-700" },
  terlambat: { label: "Terlambat", className: "bg-red-100 text-red-800" },
};

export const TAHUN_SEKARANG = new Date().getFullYear();
export const TAHUN_OPTIONS = Array.from({ length: 5 }, (_, i) => TAHUN_SEKARANG - 1 + i);

const AVATAR_COLORS = [
  "bg-[#6366f1]", "bg-[#8b5cf6]", "bg-[#ec4899]", "bg-[#f59e0b]",
  "bg-[#10b981]", "bg-[#3b82f6]", "bg-[#ef4444]", "bg-[#14b8a6]",
];

export function getAvatarColor(nama: string = "Siswa") {
  let h = 0;
  for (let i = 0; i < nama.length; i++) h = (h * 31 + nama.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function getInisial(nama: string = "Siswa") {
  return nama.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

// Format tanggal "12-Juli-2026" (dash-separated, nama bulan panjang)
export function formatTanggalPanjang(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getDate()}-${BULAN_LABEL[date.getMonth() + 1]}-${date.getFullYear()}`;
}

export function formatRupiah(n: number): string {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
}
