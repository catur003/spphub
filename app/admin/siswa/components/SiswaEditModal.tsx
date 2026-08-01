"use client";

import { FormEdit, Kelas, Siswa, STATUS_LABEL } from "../types";
import { IconEdit, IconX, IconCheck, IconKey, IconPlus, IconSave } from "@/components/admin/icons";

type Props = {
  editSiswa: Siswa | null;
  formEdit: FormEdit;
  setFormEdit: (updater: (f: FormEdit) => FormEdit) => void;
  kelasList: Kelas[];
  errorEdit: string;
  loadingEdit: boolean;
  uploadingFoto: boolean;
  onFileFoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
};

const inputClass =
  "w-full rounded-control border border-border-soft px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";
const labelClass = "mb-1 block text-xs font-semibold text-ink-700";

export default function SiswaEditModal({
  editSiswa,
  formEdit,
  setFormEdit,
  kelasList,
  errorEdit,
  loadingEdit,
  uploadingFoto,
  onFileFoto,
  onSubmit,
  onClose,
}: Props) {
  if (!editSiswa) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-ink-900/50 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[20px] bg-white shadow-lg2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 rounded-t-[20px] bg-ink-900 px-6 py-4">
          <h5 className="mb-0 flex items-center gap-1.5 text-base font-bold text-white"><IconEdit className="h-4 w-4" /> Edit Data Siswa: {editSiswa.namaLengkap}</h5>
          <button
            type="button"
            aria-label="Tutup"
            className="text-xl leading-none text-white/80 hover:text-white"
            onClick={onClose}
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="p-5">
            {errorEdit && (
              <div className="mb-3 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorEdit}
              </div>
            )}
            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-6">
              <div className="md:col-span-3">
                <label className={labelClass}>Nama Lengkap</label>
                <input
                  className={inputClass}
                  value={formEdit.namaLengkap}
                  onChange={(e) => setFormEdit((f) => ({ ...f, namaLengkap: e.target.value }))}
                  required
                />
              </div>
              <div className="md:col-span-1">
                <label className={labelClass}>NIS</label>
                <input
                  className={inputClass}
                  value={formEdit.nis}
                  onChange={(e) => setFormEdit((f) => ({ ...f, nis: e.target.value }))}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>NISN</label>
                <input
                  className={inputClass}
                  value={formEdit.nisn}
                  onChange={(e) => setFormEdit((f) => ({ ...f, nisn: e.target.value }))}
                />
              </div>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div>
                <label className={labelClass}>Jenis Kelamin</label>
                <select
                  className={inputClass}
                  value={formEdit.jenisKelamin}
                  onChange={(e) => setFormEdit((f) => ({ ...f, jenisKelamin: e.target.value }))}
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Kelas</label>
                <select
                  className={inputClass}
                  value={formEdit.kelasId}
                  onChange={(e) => setFormEdit((f) => ({ ...f, kelasId: e.target.value }))}
                >
                  <option value="">— Belum Ada Kelas —</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.namaKelas}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={inputClass}
                  value={formEdit.status}
                  onChange={(e) => setFormEdit((f) => ({ ...f, status: e.target.value }))}
                >
                  {Object.entries(STATUS_LABEL).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload Foto Siswa */}
            <div className="mb-3">
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
              {formEdit.fotoUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={formEdit.fotoUrl} alt="Preview" className="h-11 w-11 rounded-control object-cover" />
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700"><IconCheck className="h-3.5 w-3.5" /> Foto Profile Tersimpan</span>
                </div>
              )}
            </div>

            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <label className={labelClass}>Nama Wali</label>
                <input
                  className={inputClass}
                  value={formEdit.namaWali}
                  onChange={(e) => setFormEdit((f) => ({ ...f, namaWali: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Kontak Wali</label>
                <input
                  className={inputClass}
                  value={formEdit.kontakWali}
                  onChange={(e) => setFormEdit((f) => ({ ...f, kontakWali: e.target.value }))}
                />
              </div>
            </div>

            {/* Seksi Manajemen Akun Login Siswa */}
            <div className="mb-1 rounded-control border border-border-soft bg-surface p-3">
              <h6 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink-900"><IconKey className="h-4 w-4" /> Akun Login Portal Siswa</h6>
              {editSiswa.akun ? (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-green-700">
                    <span className="inline-flex items-center gap-1"><IconCheck className="h-3.5 w-3.5" /> Akun Portal Aktif</span>
                    <span className="font-normal text-ink-500">({editSiswa.akun.email})</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink-900">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border-soft accent-accent"
                          checked={formEdit.gantiEmail}
                          onChange={(e) => setFormEdit((f) => ({ ...f, gantiEmail: e.target.checked }))}
                        />
                        Ubah Email Login
                      </label>
                      {formEdit.gantiEmail && (
                        <input
                          type="email"
                          className={inputClass}
                          placeholder="Email baru..."
                          value={formEdit.emailBaru}
                          onChange={(e) => setFormEdit((f) => ({ ...f, emailBaru: e.target.value }))}
                          required={formEdit.gantiEmail}
                        />
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink-900">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border-soft accent-accent"
                          checked={formEdit.resetPassword}
                          onChange={(e) => setFormEdit((f) => ({ ...f, resetPassword: e.target.checked }))}
                        />
                        Reset / Ganti Password
                      </label>
                      {formEdit.resetPassword && (
                        <input
                          type="password"
                          className={inputClass}
                          placeholder="Password baru (min 6 char)..."
                          value={formEdit.passwordBaru}
                          onChange={(e) => setFormEdit((f) => ({ ...f, passwordBaru: e.target.value }))}
                          minLength={6}
                          required={formEdit.resetPassword}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-2 text-sm text-ink-500">Siswa ini belum memiliki akun login ke Portal Siswa.</div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-ink-900">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border-soft accent-accent"
                      checked={formEdit.buatAkun}
                      onChange={(e) => setFormEdit((f) => ({ ...f, buatAkun: e.target.checked }))}
                    />
                    <span className="inline-flex items-center gap-1.5"><IconPlus className="h-3.5 w-3.5" /> Buat Akun Portal Siswa Sekarang</span>
                  </label>
                  {formEdit.buatAkun && (
                    <div className="mt-1 grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div>
                        <label className={labelClass}>Email Login Siswa</label>
                        <input
                          type="email"
                          className={inputClass}
                          placeholder="siswa@sekolah.sch.id"
                          value={formEdit.email}
                          onChange={(e) => setFormEdit((f) => ({ ...f, email: e.target.value }))}
                          required={formEdit.buatAkun}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Password Login</label>
                        <input
                          type="password"
                          className={inputClass}
                          placeholder="Minimal 6 karakter"
                          value={formEdit.password}
                          onChange={(e) => setFormEdit((f) => ({ ...f, password: e.target.value }))}
                          minLength={6}
                          required={formEdit.buatAkun}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 rounded-b-[20px] bg-surface p-4">
            <button
              type="button"
              className="rounded-full border border-border-soft px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-white"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white shadow-sm2 transition hover:bg-accent-hover disabled:opacity-60"
              disabled={loadingEdit || uploadingFoto}
            >
              {loadingEdit ? "Memproses..." : <span className="inline-flex items-center gap-1.5"><IconSave className="h-4 w-4" /> Simpan Perubahan</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
