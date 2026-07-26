# Changelog — SPP Hub

Catatan perubahan dari sesi audit + bugfix + migrasi Tailwind. Urutan dari
yang paling baru.

---

## [Migrasi UI] Tailwind — 4 halaman tambahan (di luar daftar 15) + cabut Bootstrap

### Diubah
- `app/invoice/[id]/page.tsx`, `app/kwitansi/[id]/page.tsx` +
  `KwitansiClient.tsx`, `app/admin/keuangan/laporan/page.tsx` ("Laporan
  Kas"), `app/siswa/detail-saya/page.tsx` — ke-4 halaman ini kelewat dari
  daftar "15 halaman" migrasi sebelumnya, ketauan pas cek ulang §5.3.
  Sekarang full Tailwind. Kwitansi/invoice adalah dokumen cetak/PDF
  (html2pdf.js + html2canvas) — semua inline `style` pixel-value diubah ke
  arbitrary Tailwind (`p-[20px_16px]`, dst) dengan nilai yang sama persis,
  biar hasil cetak/PDF-nya gak berubah.
- **§5 handoff (cabut Bootstrap) dijalankan**: import
  `bootstrap/dist/css/bootstrap.min.css` dicabut dari `app/layout.tsx`,
  dependency `"bootstrap"` dihapus dari `package.json`. CSS override lama
  di `globals.css` yang nyasar ke class Bootstrap (`.card`, `.btn`,
  `.badge`, `.list-group-item`, `.form-control`) juga dihapus (dead code).
- Sebelum cabut, di-scan ulang seluruh `app/`+`components/` buat mastiin
  gak ada sisa class Bootstrap murni yang kepakai — bersih.

### ⚠️ Perlu dilakukan manual
`npm install` ulang di Railway abis narik zip ini, biar
`node_modules/bootstrap` ke-uninstall dari lockfile/build cache.

---

## [Migrasi UI] Tailwind — Sidebar/layout shell (admin)

### Diubah
- `components/admin/sidebar.tsx` (`AdminShell`) — full Tailwind, gak
  gantung ke `.app-shell`/`.app-sidebar*`/`.app-topbar*`/`.app-main` lagi.
  Breakpoint mobile-drawer pakai arbitrary `min-[992px]:`/`max-[991.98px]:`
  biar presisi sama kayak breakpoint `lg` Bootstrap yang lama (992px, beda
  dari default `lg` Tailwind yang 1024px — sengaja gak diutak-atik biar 24
  pemakaian `lg:` di halaman lain yang udah dikonversi gak ikut kegeser).
- `app/globals.css` — blok CSS lama buat sidebar/shell (~250 baris) dihapus,
  termasuk CSS variable `--sidebar-w`, `--sidebar-w-collapsed`, `--topbar-h`,
  `--sidebar-bg*`, `--sidebar-ink*`, `--sidebar-active`, `--shadow-lg` yang
  cuma dipakai di situ. Animasi `app-page-enter` diganti class
  `animate-fade-in-up` (keyframe udah ada di `tailwind.config.ts`, gak perlu
  duplikat).

### ⚠️ Belum bisa lanjut ke §5 handoff (cabut Bootstrap) — ✅ selesai di sesi berikutnya, lihat entry di atas
Ketemu 4 halaman/komponen di luar daftar "15 halaman" yang masih pakai
class Bootstrap: `app/invoice/[id]/page.tsx`, `app/kwitansi/[id]/page.tsx` +
`KwitansiClient.tsx`, `app/admin/keuangan/laporan/page.tsx` ("Laporan Kas"),
`app/siswa/detail-saya/page.tsx`. Detail di `HANDOFF-UI-TAILWIND.md`.

---

## [Migrasi UI] Tailwind — 3 halaman monolitik (kelas, tagihan, siswa)

### Diubah (dipecah jadi komponen + Bootstrap → Tailwind, fungsi dipertahankan persis)
- `app/admin/kelas/page.tsx` (614 → 242 baris) — dipecah jadi `types.ts` +
  `components/KelasFormTambah.tsx`, `KelasTable.tsx`, `KelasDetailModal.tsx`,
  `KelasEditModal.tsx`.
- `app/admin/tagihan/page.tsx` (940 → 382 baris) — dipecah jadi `types.ts` +
  `components/StatCards.tsx`, `GenerateForm.tsx`, `FilterToolbar.tsx`,
  `TagihanTable.tsx`, `SiswaDetailModal.tsx`.
- `app/admin/siswa/page.tsx` (1305 baris, paling besar & kompleks) — dipecah
  jadi `types.ts` + `components/SiswaImportExport.tsx`, `SiswaFormTambah.tsx`
  (termasuk upload+kompresi foto client-side & seksi buat akun login),
  `SiswaFilterBar.tsx`, `SiswaTable.tsx`, `SiswaDetailModal.tsx` (riwayat
  tagihan), `SiswaEditModal.tsx` (termasuk manajemen akun: ganti email/reset
  password), `NaikKelasModal.tsx` (modal naik kelas massal).

### Catatan penting
- Semua 15 halaman admin/portal sekarang full Tailwind. Bootstrap CSS di
  `app/layout.tsx` **masih belum dicabut** — langkah terakhir (lihat §5
  `HANDOFF-UI-TAILWIND.md`) baru boleh dilakukan setelah sidebar/layout shell
  (`.app-sidebar` dkk di `globals.css`) juga dikonversi.
- Belum sempat dites jalan beneran (`npm install` + dev server) karena sandbox
  kerja nggak ada akses network — tolong direview sekali lagi saat di-deploy,
  terutama form Tambah/Edit Siswa (upload foto, buat akun, naik kelas massal)
  dan tabel Tagihan (kirim WA, verifikasi, cek status Midtrans).

---

## [Migrasi UI] Tailwind — lanjutan

### Diubah
- `app/siswa/page.tsx` (portal siswa) — dikonversi full ke Tailwind. File
  `app/siswa/siswa.css` (597 baris, animasi/keyframes custom) **dihapus**;
  semua keyframe dipindah jadi utility reusable di `tailwind.config.ts`.
- `app/admin/pengguna/page.tsx`
- `app/admin/settings/page.tsx`

### Diketahui (tidak diubah, sengaja dipertahankan)
- Badge status "Menunggu Verifikasi" & "Terlambat" di portal siswa gak punya
  animasi pulse — ini bug lama dari `siswa.css` sebelum migrasi (class-nya
  gak pernah didefinisikan), bukan regresi dari migrasi ini. — dikonversi full ke Tailwind (tab payment/sekolah,
  env-card, gateway-card, api-key-section sandbox/production, input dengan toggle
  eye). Custom `<style>` block dihapus semua.
- `app/admin/arsip/page.tsx` — fix inline `style` hex mentah di ikon PDF/gambar,
  diganti `bg-red-100 text-red-600` / `bg-indigo-100 text-indigo-700` biar konsisten
  sama konvensi token.

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
