export type TahunAjaran = { id: string; nama: string; aktif: boolean };

export type JenisPreset = "spp" | "lainnya";

export type JatuhTempoPreset = {
  id: string;
  nama: string;
  tanggalAwal: string;
  tanggalAkhir: string;
  jenis: JenisPreset;
  tahunAjaranId: string;
  tahunAjaran?: TahunAjaran | null;
};
