import * as XLSX from "xlsx";

// Urutan kolom template import/export siswa — JANGAN diubah urutannya
// tanpa update juga baris parseBarisSiswa di bawah.
// Kolom Email & Password bersifat OPSIONAL — boleh dikosongkan.
export const KOLOM_SISWA = [
  "Nama Lengkap",
  "NIS",
  "NISN",
  "Kelas",
  "Jenis Kelamin (L/P)",
  "Tanggal Lahir (YYYY-MM-DD)",
  "Nama Wali",
  "Kontak Wali",
  "Status (aktif/lulus/pindah/nonaktif)",
  "Email (opsional)",
  "Password (opsional, min 8 karakter)",
] as const;

export type BarisSiswaMentah = Record<(typeof KOLOM_SISWA)[number], string | number | Date | undefined>;

export type SiswaTervalidasi = {
  namaLengkap: string;
  nis: string;
  nisn: string | null;
  namaKelas: string | null;
  jenisKelamin: "L" | "P";
  tanggalLahir: Date | null;
  namaWali: string | null;
  kontakWali: string | null;
  status: "aktif" | "lulus" | "pindah" | "nonaktif";
  email: string | null;
  password: string | null;
};

/** Bikin workbook template kosong (cuma header + 1 baris contoh). */
export function buatTemplateWorkbook(): XLSX.WorkBook {
  const contoh: Partial<BarisSiswaMentah> = {
    "Nama Lengkap": "Contoh Siswa",
    NIS: "2024001",
    NISN: "0012345678",
    Kelas: "7A",
    "Jenis Kelamin (L/P)": "L",
    "Tanggal Lahir (YYYY-MM-DD)": "2012-05-10",
    "Nama Wali": "Nama Orang Tua",
    "Kontak Wali": "08123456789",
    "Status (aktif/lulus/pindah/nonaktif)": "aktif",
    "Email (opsional)": "siswa@sekolah.sch.id",
    "Password (opsional, min 8 karakter)": "password123",
  };
  const ws = XLSX.utils.json_to_sheet([contoh], { header: [...KOLOM_SISWA] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
  return wb;
}

/** Bikin workbook export dari daftar siswa yang sudah ada di DB. */
export function buatExportWorkbook(
  daftar: Array<{
    namaLengkap: string;
    nis: string;
    nisn: string | null;
    kelas: { namaKelas: string } | null;
    jenisKelamin: string;
    tanggalLahir: Date | null;
    namaWali: string | null;
    kontakWali: string | null;
    status: string;
    akun: { email: string } | null;
  }>
): XLSX.WorkBook {
  const rows = daftar.map((s) => ({
    "Nama Lengkap": s.namaLengkap,
    NIS: s.nis,
    NISN: s.nisn || "",
    Kelas: s.kelas?.namaKelas || "",
    "Jenis Kelamin (L/P)": s.jenisKelamin,
    "Tanggal Lahir (YYYY-MM-DD)": s.tanggalLahir
      ? s.tanggalLahir.toISOString().slice(0, 10)
      : "",
    "Nama Wali": s.namaWali || "",
    "Kontak Wali": s.kontakWali || "",
    "Status (aktif/lulus/pindah/nonaktif)": s.status,
    "Email (opsional)": s.akun?.email || "",
    // Password tidak di-export demi keamanan
    "Password (opsional, min 8 karakter)": "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...KOLOM_SISWA] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  return wb;
}

/** Baca file Excel/CSV yang diupload jadi array baris mentah. */
export function bacaWorkbook(buffer: Buffer): BarisSiswaMentah[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<BarisSiswaMentah>(sheet, { defval: "" });
}

const STATUS_VALID = ["aktif", "lulus", "pindah", "nonaktif"];

/**
 * Validasi & normalisasi 1 baris mentah dari Excel.
 * Return { data } kalau valid, atau { error } kalau ada masalah.
 * Kolom Email & Password opsional — kalau kosong, diabaikan.
 */
export function parseBarisSiswa(
  baris: BarisSiswaMentah
): { data: SiswaTervalidasi } | { error: string } {
  const nama = String(baris["Nama Lengkap"] || "").trim();
  const nis = String(baris["NIS"] || "").trim();
  const nisn = String(baris["NISN"] || "").trim();
  const kelas = String(baris["Kelas"] || "").trim();
  const jkRaw = String(baris["Jenis Kelamin (L/P)"] || "").trim().toUpperCase();
  const tglRaw = baris["Tanggal Lahir (YYYY-MM-DD)"];
  const namaWali = String(baris["Nama Wali"] || "").trim();
  const kontakWali = String(baris["Kontak Wali"] || "").trim();
  const statusRaw = String(baris["Status (aktif/lulus/pindah/nonaktif)"] || "aktif")
    .trim()
    .toLowerCase();
  const email = String(baris["Email (opsional)"] || "").trim().toLowerCase();
  const password = String(baris["Password (opsional, min 8 karakter)"] || "").trim();

  if (!nama) return { error: "Nama Lengkap wajib diisi" };
  if (!nis) return { error: "NIS wajib diisi" };
  if (jkRaw !== "L" && jkRaw !== "P") {
    return { error: "Jenis Kelamin harus diisi L atau P" };
  }
  if (statusRaw && !STATUS_VALID.includes(statusRaw)) {
    return { error: `Status "${statusRaw}" tidak valid (harus aktif/lulus/pindah/nonaktif)` };
  }

  // Validasi email & password: keduanya harus diisi jika salah satu ada
  if (email && !password) {
    return { error: "Jika Email diisi, Password juga wajib diisi (min 8 karakter)" };
  }
  if (password && !email) {
    return { error: "Jika Password diisi, Email juga wajib diisi" };
  }
  if (password && password.length < 8) {
    return { error: "Password minimal 8 karakter" };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: `Format email "${email}" tidak valid` };
  }

  let tanggalLahir: Date | null = null;
  if (tglRaw) {
    const d = tglRaw instanceof Date ? tglRaw : new Date(String(tglRaw));
    if (isNaN(d.getTime())) {
      return { error: "Tanggal Lahir tidak valid, format harus YYYY-MM-DD" };
    }
    tanggalLahir = d;
  }

  return {
    data: {
      namaLengkap: nama,
      nis,
      nisn: nisn || null,
      namaKelas: kelas || null,
      jenisKelamin: jkRaw as "L" | "P",
      tanggalLahir,
      namaWali: namaWali || null,
      kontakWali: kontakWali || null,
      status: (statusRaw || "aktif") as SiswaTervalidasi["status"],
      email: email || null,
      password: password || null,
    },
  };
}
