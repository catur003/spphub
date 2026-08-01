export type { KelasOption, TahunAjaran, SiswaDetail } from "@/app/admin/tagihan/types";
export { formatRupiah, getAvatarColor, getInisial, STATUS_INFO } from "@/app/admin/tagihan/types";
import type { SiswaDetail } from "@/app/admin/tagihan/types";

export type JenisTagihanLain = {
  id: string;
  nama: string;
  nominalDefault: number;
  aktif: boolean;
};

export type TagihanLain = {
  id: string;
  nominal: number;
  status: string;
  jatuhTempo: string;
  keterangan?: string | null;
  createdAt: string;
  jenisTagihanLain?: { id: string; nama: string } | null;
  siswa?: SiswaDetail | null;
};

export type SortField = "siswa" | "kelas" | "jenis" | "nominal" | "status" | "tempo";
