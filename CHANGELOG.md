# Changelog — SPP Hub

Catatan perubahan dari sesi audit + bugfix + migrasi Tailwind. Urutan dari
yang paling baru.

---

## [Migrasi UI] Tailwind — sesi berjalan

### Ditambahkan
- Setup Tailwind (`tailwind.config.ts`, `postcss.config.mjs`, dependency di `package.json`)
- Token desain (warna, radius, shadow) dipindah dari CSS variable ke `tailwind.config.ts`, identitas visual (indigo accent, slate ink) dipertahankan
- `HANDOFF-UI-TAILWIND.md` — dokumen status migrasi per halaman buat sesi lanjutan

### Diubah (Bootstrap → Tailwind, fungsi dipertahankan persis)
- `app/(auth)/login/page.tsx`
- `app/admin/dashboard/page.tsx` (termasuk grid kartu ringkasan & tabel, chart Recharts dibiarkan apa adanya)
- `app/admin/pengumuman/page.tsx` (modal edit dikonversi dari Bootstrap modal ke custom Tailwind modal)
- `components/admin/ConfirmModal.tsx` — komponen bersama, dipakai di banyak halaman lewat `useConfirmModal()`
- `app/admin/keuangan/pendapatan/page.tsx`
- `app/admin/keuangan/pengeluaran/page.tsx`
- `app/admin/keuangan/utang-pegawai/page.tsx`
- `app/admin/tahun-ajaran/page.tsx` (modal edit dikonversi)
- `app/admin/laporan/page.tsx` — **perhatian**: fitur "Cetak PDF" (`window.print()`) dipindah dari CSS custom (`.no-print`, `.print-area`) ke Tailwind `print:` variant. Logikanya setara tapi belum sempat dites render asli di browser — tolong dicek pas cetak/print halaman ini.
- `app/admin/arsip/page.tsx` (2 modal — upload berkas & pratinjau PDF/gambar — dikonversi ke custom Tailwind modal)

### Belum dikonversi (lihat `HANDOFF-UI-TAILWIND.md` buat detail & urutan)
- `app/admin/settings/page.tsx`
- `app/admin/pengguna/page.tsx`
- `app/siswa/page.tsx` (halaman siswa)
- `app/admin/kelas/page.tsx` — perlu dipecah jadi komponen dulu (614 baris)
- `app/admin/tagihan/page.tsx` — perlu dipecah jadi komponen dulu (940 baris)
- `app/admin/siswa/page.tsx` — perlu dipecah jadi komponen dulu (1305 baris)

### Catatan penting
- Bootstrap CSS **masih diimpor** di `app/layout.tsx` — sengaja, karena halaman yang belum dikonversi masih pakai class Bootstrap. Baru boleh dicabut setelah SEMUA halaman selesai (lihat §5 di HANDOFF).

---

## [Bugfix + Audit Keamanan] — sesi sebelumnya

### Keamanan
- **Server Key Midtrans dienkripsi at rest** (AES-256-GCM, `lib/crypto.ts`) — sebelumnya disimpan plaintext di DB. Butuh env var `ENCRYPTION_KEY` di Railway supaya aktif (lihat catatan di bawah).
- Validasi whitelist status di `PATCH /api/tagihan/[id]` — sebelumnya menerima string status apapun dari body tanpa validasi.

### Data integrity
- **Hapus siswa & hapus tagihan sekarang ditolak** kalau sudah ada riwayat pembayaran sukses terkait — sebelumnya `onDelete: Cascade` di schema bisa menghapus permanen riwayat keuangan tanpa peringatan.
- Klik "Bayar Sekarang" berkali-kali tidak lagi numpuk banyak row `Pembayaran` pending yatim — pending lama otomatis ditandai `expired` sebelum bikin yang baru.

### Bug
- Password import siswa: teks bilang "min 8 karakter" tapi validasi cuma cek `< 6` — sekarang konsisten 8 karakter (termasuk reset password siswa).

### Performa
- `GET /api/dashboard`: query tunggakan siswa & utang pegawai yang tadinya `findMany` semua baris lalu di-`reduce` manual di JS, diganti `groupBy`/`aggregate` langsung di DB.
- Generate tagihan & sync-nominal: loop update satu-satu ke DB (N+1) digabung jadi 1 fungsi bersama (`lib/tagihan-nominal.ts`) yang batch update per grup nominal.

### Maintainability
- `lib/api-auth.ts` baru (`requireApiRole`, `requireApiOwner`) — menggantikan fungsi `checkAccess()` yang sebelumnya di-copy-paste identik di ~25 file route API berbeda.
- `bayar/route.ts` sekarang pakai `getSnapClient()` dari `lib/midtrans.ts` alih-alih membuat ulang Snap client secara manual (sebelumnya ada 2 tempat logic yang sama).

### Yang perlu dilakukan manual di Railway
```
ENCRYPTION_KEY=<generate dengan: openssl rand -hex 32>
```
Tanpa ini sistem tetap jalan normal (server key belum terenkripsi). Setelah
diisi, buka Settings → Payment dan Simpan ulang sekali supaya key yang
tersimpan mulai terenkripsi.
