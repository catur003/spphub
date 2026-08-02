export type Kelas = { id: string; namaKelas: string; tingkat?: number };

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
// sebenarnya adalah JURUSAN. Yang seharusnya disebut "Kelas" (tingkat,
// X/XI/XII) adalah field `tingkat` (Int 10/11/12). Helper ini dipakai di
// tampilan supaya labelnya benar: Kelas = tingkatKeRomawi(tingkat),
// Jurusan = namaKelas.
export function tingkatKeRomawi(tingkat?: number | null): string {
  if (!tingkat) return "-";
  const map: Record<number, string> = { 10: "X", 11: "XI", 12: "XII" };
  return map[tingkat] || String(tingkat);
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

/** Kompres gambar di sisi client sebelum diunggah (max 400px, JPEG q0.82). */
export function kompresGambar(file: File, maxPx = 400): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxPx || h > maxPx) {
          if (w > h) {
            h = Math.round((h * maxPx) / w);
            w = maxPx;
          } else {
            w = Math.round((w * maxPx) / h);
            h = maxPx;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.82);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Upload file foto (sudah dikompres) ke endpoint /api/upload, kembalikan URL. */
export async function uploadFotoFile(file: File): Promise<string> {
  const blobKompres = await kompresGambar(file);
  const formData = new FormData();
  formData.append("file", blobKompres, "foto_siswa.jpg");
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto");
  return data.url;
}
