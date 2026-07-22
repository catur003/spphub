import * as XLSX from "xlsx";

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

/** Bikin workbook template (Uint8Array binary) */
export function buatTemplateWorkbook(): Uint8Array {
  const contoh = [
    {
      "Nama Lengkap": "Ahmad Fauzi",
      NIS: "2024001",
      NISN: "0012345678",
      Kelas: "10 IPA 1",
      "Jenis Kelamin (L/P)": "L",
      "Tanggal Lahir (YYYY-MM-DD)": "2008-05-10",
      "Nama Wali": "Budi Santoso",
      "Kontak Wali": "081234567890",
      "Status (aktif/lulus/pindah/nonaktif)": "aktif",
      "Email (opsional)": "ahmad@sekolah.sch.id",
      "Password (opsional, min 8 karakter)": "password123",
    },
    {
      "Nama Lengkap": "Siti Rahma",
      NIS: "2024002",
      NISN: "0012345679",
      Kelas: "10 IPA 1",
      "Jenis Kelamin (L/P)": "P",
      "Tanggal Lahir (YYYY-MM-DD)": "2008-08-15",
      "Nama Wali": "Rahmat Hidayat",
      "Kontak Wali": "081298765432",
      "Status (aktif/lulus/pindah/nonaktif)": "aktif",
      "Email (opsional)": "",
      "Password (opsional, min 8 karakter)": "",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(contoh, { header: [...KOLOM_SISWA] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");

  const arrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(arrayBuffer);
}

/** Baca file Excel/CSV dengan normalisasi nama kolom fleksibel (case-insensitive) */
export function bacaWorkbook(buffer: Buffer): Record<string, any>[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

  return jsonRows.map((row) => {
    const normalized: Record<string, any> = {};
    Object.keys(row).forEach((key) => {
      const cleanKey = key.trim().toLowerCase();
      normalized[cleanKey] = row[key];
    });
    return normalized;
  });
}

function getValueFromPossibleKeys(row: Record<string, any>, possibleKeys: string[]): string {
  for (const k of possibleKeys) {
    const cleanKey = k.toLowerCase();
    if (row[cleanKey] !== undefined && row[cleanKey] !== null && String(row[cleanKey]).trim() !== "") {
      return String(row[cleanKey]).trim();
    }
  }
  return "";
}

/** Parse tanggal dari Excel (bisa string YYYY-MM-DD, Date object, atau Excel serial number) */
function parseTanggalExcel(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  const str = String(val).trim();
  if (!str) return null;

  // Tanggal ISO/Standard: YYYY-MM-DD / YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  // Tanggal Format Indonesia: DD-MM-YYYY / DD/MM/YYYY
  const idMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (idMatch) {
    const [, d, m, y] = idMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  // Excel Serial Number (misal: 42150)
  if (!isNaN(Number(str))) {
    const serial = Number(str);
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info;
  }

  const parsedDate = new Date(str);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function parseBarisSiswa(
  row: Record<string, any>
): { data: SiswaTervalidasi } | { error: string } {
  const nama = getValueFromPossibleKeys(row, ["nama lengkap", "nama", "nama_lengkap"]);
  const nis = getValueFromPossibleKeys(row, ["nis", "nomor induk siswa"]);
  const nisn = getValueFromPossibleKeys(row, ["nisn"]);
  const kelas = getValueFromPossibleKeys(row, ["kelas", "nama kelas"]);
  const jkRaw = getValueFromPossibleKeys(row, ["jenis kelamin (l/p)", "jenis kelamin", "jk", "gender"]).toUpperCase();
  const tglRaw = row["tanggal lahir (yyyy-mm-dd)"] || row["tanggal lahir"] || row["tgl lahir"];
  const namaWali = getValueFromPossibleKeys(row, ["nama wali", "wali", "orang tua"]);
  const kontakWali = getValueFromPossibleKeys(row, ["kontak wali", "no hp wali", "telepon wali", "hp wali"]);
  const statusRaw = getValueFromPossibleKeys(row, ["status (aktif/lulus/pindah/nonaktif)", "status"]).toLowerCase() || "aktif";
  const email = getValueFromPossibleKeys(row, ["email (opsional)", "email"]).toLowerCase();
  const password = getValueFromPossibleKeys(row, ["password (opsional, min 8 karakter)", "password"]);

  if (!nama) return { error: "Kolom Nama Lengkap wajib diisi" };
  if (!nis) return { error: "Kolom NIS wajib diisi" };

  let jenisKelamin: "L" | "P" = "L";
  if (jkRaw.startsWith("P") || jkRaw === "PEREMPUAN") {
    jenisKelamin = "P";
  } else if (jkRaw.startsWith("L") || jkRaw === "LAKI-LAKI" || jkRaw === "LAKI") {
    jenisKelamin = "L";
  } else if (jkRaw && jkRaw !== "L" && jkRaw !== "P") {
    return { error: `Jenis kelamin "${jkRaw}" tidak valid (harus L atau P)` };
  }

  const STATUS_VALID = ["aktif", "lulus", "pindah", "nonaktif"];
  const statusClean = STATUS_VALID.includes(statusRaw) ? statusRaw : "aktif";

  if (email && password && password.length < 6) {
    return { error: "Password akun minimal 6 karakter" };
  }

  const tanggalLahir = parseTanggalExcel(tglRaw);

  return {
    data: {
      namaLengkap: nama,
      nis,
      nisn: nisn || null,
      namaKelas: kelas || null,
      jenisKelamin,
      tanggalLahir,
      namaWali: namaWali || null,
      kontakWali: kontakWali || null,
      status: statusClean as SiswaTervalidasi["status"],
      email: email || null,
      password: password || null,
    },
  };
}
