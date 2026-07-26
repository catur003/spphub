import * as XLSX from "xlsx";

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const STATUS_LABEL: Record<string, string> = {
  belum_bayar: "Belum Bayar",
  menunggu_verifikasi: "Menunggu Verifikasi",
  lunas: "Lunas",
  terlambat: "Terlambat",
};

export function buatLaporanWorkbook(
  daftar: Array<{
    siswa: { namaLengkap: string; nis: string; kelas: { namaKelas: string } | null };
    bulan: number;
    tahun: number;
    nominal: number;
    status: string;
    jatuhTempo: Date;
  }>
): XLSX.WorkBook {
  const rows = daftar.map((t) => ({
    "Nama Siswa": t.siswa.namaLengkap,
    NIS: t.siswa.nis,
    Kelas: t.siswa.kelas?.namaKelas || "-",
    Periode: `${BULAN_LABEL[t.bulan]} ${t.tahun}`,
    Nominal: t.nominal,
    Status: STATUS_LABEL[t.status] || t.status,
    "Jatuh Tempo": t.jatuhTempo.toISOString().slice(0, 10),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Tagihan");
  return wb;
}
