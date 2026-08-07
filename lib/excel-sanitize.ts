/**
 * Cegah CSV/Formula Injection saat data yang berasal dari input user
 * (nama siswa, nama wali, nomor kontak, nama kelas, dst — semua field yang
 * pernah diisi lewat form atau import Excel) ikut ditulis ke workbook
 * export (lib/excel-siswa.ts, lib/excel-laporan.ts).
 *
 * Masalahnya: kalau sebuah cell string DIAWALI salah satu dari `= + - @`
 * (atau tab/CR di depan spasi), Excel/LibreOffice/Google Sheets akan
 * menafsirkannya sebagai FORMULA saat file dibuka, bukan teks biasa.
 * Contoh: siswa/wali yang datanya (lewat import Excel dari sumber luar,
 * atau form yang kebetulan gak validasi ketat) berisi
 * `=HYPERLINK("http://evil.example","klik")` atau
 * `=cmd|'/c calc'!A1` bisa dieksekusi begitu admin membuka laporan yang
 * di-export dari sistem ini — walau nilainya sendiri random/gak berbahaya,
 * ini tetap celah nyata di banyak advisory (OWASP: CSV Injection).
 *
 * Fix: prefix cell yang diawali karakter pemicu formula dengan apostrof
 * (`'`), yang memaksa Excel membacanya sebagai teks literal — pola standar
 * yang direkomendasikan OWASP untuk mitigasi ini.
 */
const KARAKTER_PEMICU_FORMULA = ["=", "+", "-", "@", "\t", "\r"];

export function amankanSelExcel<T>(nilai: T): T | string {
  if (typeof nilai !== "string" || nilai.length === 0) return nilai;
  if (KARAKTER_PEMICU_FORMULA.includes(nilai[0])) {
    return `'${nilai}`;
  }
  return nilai;
}

/** Terapkan amankanSelExcel() ke semua value string di setiap objek/baris. */
export function amankanBarisExcel<T extends Record<string, unknown>>(baris: T): T {
  const hasil: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(baris)) {
    hasil[key] = amankanSelExcel(value);
  }
  return hasil as T;
}
