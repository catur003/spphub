"use client";

import { FormTambah, Kelas, STATUS_LABEL } from "../types";

type Props = {
  formTambah: FormTambah;
  setFormTambah: (updater: (f: FormTambah) => FormTambah) => void;
  kelasList: Kelas[];
  errorTambah: string;
  loadingTambah: boolean;
  uploadingFoto: boolean;
  onFileFoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
};

const inputClass =
  "w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";
const labelClass = "mb-1 block text-xs font-semibold text-ink-700";

export default function SiswaFormTambah({
  formTambah,
  setFormTambah,
  kelasList,
  errorTambah,
  loadingTambah,
  uploadingFoto,
  onFileFoto,
  onSubmit,
}: Props) {
  return (
    <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-sm2">
      <div className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] px-4 py-3.5">
        <h2 className="m-0 text-sm font-bold text-white">✚ Tambah Siswa Baru</h2>
      </div>
      <div className="p-4">
        {errorTambah && (
          <div className="mb-2 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorTambah}
          </div>
        )}
        <form onSubmit={onSubmit}>
          <div className="mb-2">
            <label className={labelClass}>Nama Lengkap</label>
            <input
              className={inputClass}
              value={formTambah.namaLengkap}
              onChange={(e) => setFormTambah((f) => ({ ...f, namaLengkap: e.target.value }))}
              required
            />
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>NIS</label>
              <input
                className={inputClass}
                value={formTambah.nis}
                onChange={(e) => setFormTambah((f) => ({ ...f, nis: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className={labelClass}>NISN</label>
              <input
                className={inputClass}
                value={formTambah.nisn}
                onChange={(e) => setFormTambah((f) => ({ ...f, nisn: e.target.value }))}
              />
            </div>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Jenis Kelamin</label>
              <select
                className={inputClass}
                value={formTambah.jenisKelamin}
                onChange={(e) => setFormTambah((f) => ({ ...f, jenisKelamin: e.target.value }))}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Kelas</label>
              <select
                className={inputClass}
                value={formTambah.kelasId}
                onChange={(e) => setFormTambah((f) => ({ ...f, kelasId: e.target.value }))}
              >
                <option value="">— Pilih Kelas —</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.namaKelas}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Foto Siswa */}
          <div className="mb-2">
            <label className={labelClass}>Foto Profile Siswa (Opsional)</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                className="w-full rounded-control border border-border-soft px-2 py-1.5 text-sm text-ink-900 outline-none file:mr-2 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-xs file:font-semibold file:text-accent-hover"
                onChange={onFileFoto}
                disabled={uploadingFoto}
              />
              {uploadingFoto && (
                <span className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-accent-soft border-t-accent" />
              )}
            </div>
            {formTambah.fotoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={formTambah.fotoUrl}
                  alt="Preview"
                  className="h-10 w-10 rounded-control object-cover"
                />
                <span className="text-sm font-semibold text-green-700">✓ Foto Terpilih</span>
              </div>
            )}
          </div>

          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Nama Wali</label>
              <input
                className={inputClass}
                value={formTambah.namaWali}
                onChange={(e) => setFormTambah((f) => ({ ...f, namaWali: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Kontak Wali</label>
              <input
                className={inputClass}
                value={formTambah.kontakWali}
                onChange={(e) => setFormTambah((f) => ({ ...f, kontakWali: e.target.value }))}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={formTambah.status}
              onChange={(e) => setFormTambah((f) => ({ ...f, status: e.target.value }))}
            >
              {Object.entries(STATUS_LABEL).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Seksi Buat Akun Login Siswa */}
          <div className="mb-3 rounded-control border border-border-soft bg-surface p-3">
            <label className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border-soft accent-accent"
                checked={formTambah.buatAkun}
                onChange={(e) => setFormTambah((f) => ({ ...f, buatAkun: e.target.checked }))}
              />
              🔑 Buat Akun Login Portal Siswa
            </label>
            {formTambah.buatAkun && (
              <div className="mt-2 border-t border-border-soft pt-2">
                <div className="mb-2">
                  <label className={labelClass}>Email Login Siswa</label>
                  <input
                    type="email"
                    className={inputClass}
                    placeholder="siswa@sekolah.sch.id"
                    value={formTambah.email}
                    onChange={(e) => setFormTambah((f) => ({ ...f, email: e.target.value }))}
                    required={formTambah.buatAkun}
                  />
                </div>
                <div>
                  <label className={labelClass}>Password Login</label>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="Minimal 6 karakter"
                    value={formTambah.password}
                    onChange={(e) => setFormTambah((f) => ({ ...f, password: e.target.value }))}
                    minLength={6}
                    required={formTambah.buatAkun}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            className="w-full rounded-control bg-accent py-2 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover disabled:opacity-60"
            disabled={loadingTambah || uploadingFoto}
          >
            {loadingTambah ? "Menyimpan..." : "Simpan Data Siswa"}
          </button>
        </form>
      </div>
    </div>
  );
}
