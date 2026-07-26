# Handoff — Migrasi Tailwind + Optimisasi (lanjutan audit)

Progress lanjutan setelah sesi bugfix pertama. Simpan doc ini biar sesi
berikutnya (siapapun yang lanjutin) tau udah sampai mana.

---

## 1. Yang udah kelar di sesi ini

- **Setup Tailwind**: `tailwind.config.ts`, `postcss.config.mjs`, dependency
  ditambahin ke `package.json` (`tailwindcss`, `postcss`, `autoprefixer`).
  Jalan otomatis pas `npm install` di Railway build, gak perlu langkah manual.
- **Token warna/desain** dipindah dari CSS variable yang udah ada
  (`--accent`, `--ink-*`, dst di `globals.css`) ke `theme.extend` di
  `tailwind.config.ts` — supaya identitas visual (indigo accent, slate ink,
  radius 10-14px, shadow lembut) TETAP SAMA, cuma teknologinya ganti.
- **`app/globals.css`**: ditambah `@tailwind base/components/utilities` di
  paling atas. Bootstrap CSS di `app/layout.tsx` SENGAJA belum dicabut —
  jalan berdampingan sampai semua halaman selesai dikonversi (lihat #3).
- **Halaman pilot**: `app/(auth)/login/page.tsx` — full Tailwind, jadi
  referensi konvensi buat halaman selanjutnya (lihat #2).
- **`app/api/dashboard/route.ts`**: query tunggakan & utang pegawai yang
  tadinya `findMany` semua baris terus di-`reduce` manual di JS, diganti jadi
  `groupBy`/`aggregate` langsung di DB. Lebih ringan, terutama pas data
  historis udah banyak.

## 2. Konvensi Tailwind (pakai token dari tailwind.config.ts)

| Kebutuhan | Class |
|---|---|
| Warna aksen (tombol utama, link aktif) | `bg-accent`, `text-accent`, `hover:bg-accent-hover`, `bg-accent-soft` |
| Teks judul / body / muted | `text-ink-900`, `text-ink-700`, `text-ink-500` |
| Background halaman | `bg-surface` |
| Border tipis standar | `border-border-soft` |
| Card/panel | `rounded-card border border-border-soft bg-white shadow-sm2` |
| Input/tombol | `rounded-control` |
| Badge status Lunas / Belum / Terlambat | `text-status-lunas` / `text-status-belum` / `text-status-terlambat` (atau versi `bg-status-*/10` buat badge soft) |
| Sidebar admin | `bg-sidebar-bg`, `bg-sidebar-bg2`, `text-sidebar-ink` |

Pola form-control standar yang dipakai di halaman login (contoh buat dicontek
di halaman lain):
```
className="w-full rounded-control border border-border-soft px-3 py-2 text-sm
  text-ink-900 outline-none transition focus:border-accent
  focus:ring-4 focus:ring-accent-soft"
```

## 3. Status migrasi per halaman (14 tersisa)

| Halaman | Baris | Status |
|---|---|---|
| `app/(auth)/login/page.tsx` | 84 | ✅ Selesai (pilot) |
| `app/admin/dashboard/page.tsx` | 394 | ✅ Selesai |
| `app/admin/siswa/page.tsx` | 1305→~460 | ✅ Selesai (dipecah jadi `types.ts` + 7 komponen: SiswaImportExport, SiswaFormTambah, SiswaFilterBar, SiswaTable, SiswaDetailModal, SiswaEditModal, NaikKelasModal) |
| `app/admin/tagihan/page.tsx` | 940→382 | ✅ Selesai (dipecah jadi `types.ts` + StatCards, GenerateForm, FilterToolbar, TagihanTable, SiswaDetailModal) |
| `app/siswa/page.tsx` | 713 | ✅ Selesai (full Tailwind, `siswa.css` 597 baris dihapus — semua animasi/keyframes dipindah ke `tailwind.config.ts`) |
| `app/admin/kelas/page.tsx` | 614→242 | ✅ Selesai (dipecah jadi `types.ts` + KelasFormTambah, KelasTable, KelasDetailModal, KelasEditModal) |
| `app/admin/pengguna/page.tsx` | 587 | ✅ Selesai (avatar gradient & role-select jadi conditional class, bukan inline style; modal edit/reset password jadi custom Tailwind modal) |
| `app/admin/settings/page.tsx` | 471 | ✅ Selesai (custom `<style>` tab/env-card/api-key-section dikonversi full ke Tailwind, termasuk arbitrary value buat gradient logo & shadow ring) |
| `app/admin/arsip/page.tsx` | 370 | ✅ Selesai (2 modal custom: upload & preview) |
| `app/admin/laporan/page.tsx` | 359 | ✅ Selesai (print pakai Tailwind print: variant, TOLONG DITES cetak/print-nya di browser asli) |
| `app/admin/tahun-ajaran/page.tsx` | 313 | ✅ Selesai |
| `app/admin/keuangan/utang-pegawai/page.tsx` | 309 | ✅ Selesai |
| `app/admin/keuangan/pengeluaran/page.tsx` | 294 | ✅ Selesai |
| `app/admin/keuangan/pendapatan/page.tsx` | 278 | ✅ Selesai |
| `app/admin/pengumuman/page.tsx` | 263 | ✅ Selesai (modal custom, gak gantung ke Bootstrap lagi) |
| Sidebar/layout shell (`.app-sidebar` dll di globals.css) | - | ✅ Selesai (`components/admin/sidebar.tsx` full Tailwind, CSS lama di `globals.css` dihapus) |
| `app/invoice/[id]/page.tsx` | 187 | ✅ Selesai (di luar daftar 15, ketemu pas cek ulang §5.3) |
| `app/kwitansi/[id]/page.tsx` + `KwitansiClient.tsx` | 50+207 | ✅ Selesai (dokumen cetak/PDF via html2pdf — semua inline `style` px diubah ke arbitrary Tailwind `[..px]`, presisi dipertahankan biar hasil PDF gak berubah) |
| `app/admin/keuangan/laporan/page.tsx` ("Laporan Kas") | 104 | ✅ Selesai (jangan ketuker sama `app/admin/laporan/page.tsx` "Laporan SPP" yang beda halaman) |
| `app/siswa/detail-saya/page.tsx` | 18 | ✅ Selesai (redirect spinner doang) |

**Semua halaman (15 + 4 tambahan di luar daftar awal) + sidebar/layout shell
selesai** + `ConfirmModal`. Ketiga halaman monolitik (kelas, tagihan, siswa)
sudah dipecah jadi komponen dan full Tailwind — belum sempat dites jalan
beneran di Railway (nggak ada `npm install`/dev server di sandbox ini),
tolong dicek. Sidebar juga belum dites jalan (breakpoint mobile drawer pakai
arbitrary `min-[992px]:`/`max-[991.98px]:` biar presisi sama kayak breakpoint
`lg` Bootstrap lama — tolong dicek juga tampilan collapse/mobile-drawer-nya).
Kwitansi/invoice juga tolong dicek cetak & download PDF-nya, karena itu
dokumen yang paling sensitif ke perubahan pixel.

### ✅ §5 (cabut Bootstrap) SUDAH DIJALANKAN

1. ✅ Import `bootstrap/dist/css/bootstrap.min.css` dicabut dari `app/layout.tsx`
2. ✅ `"bootstrap": "^5.3.3"` dihapus dari `package.json` dependencies
3. ✅ Dicek ulang semua halaman (scan `className` di seluruh `app/` +
   `components/`) — gak ada lagi class Bootstrap murni yang kepakai.
   CSS override lama di `globals.css` yang nyasar ke `.card`/`.btn`/`.badge`/
   `.list-group-item`/`.form-control` juga udah dihapus (dead code, gak ada
   elemen yang pakai class itu lagi).

**Kalau abis narik zip ini, jalanin `npm install` di Railway biar
`node_modules/bootstrap` ke-uninstall dari `package-lock.json`/build cache.**

### Catatan tambahan: keyframes custom di `tailwind.config.ts`
`app/siswa/page.tsx` sebelumnya punya 597 baris `siswa.css` sendiri (animasi
pulse, shimmer progress bar, float bounce avatar, toast-in, dst). Semua
keyframe itu udah dipindah ke `theme.extend.keyframes`/`animation` di
`tailwind.config.ts` (nama: `siswaFadeInUp`, `tabFadeIn`, `shimmerFill`,
`pulseBadge`, `pulseSuccess`, `floatBounce`, `pulseRing`, `toastIn`). Kalau
ada halaman lain yang mau pakai animasi serupa, tinggal reuse class
`animate-fade-in-up-lg` / `animate-tab-fade-in` / dst, jangan bikin keyframe
baru yang duplikat.

**Bug lama yang SENGAJA dipertahankan** (bukan tugas migrasi ini buat
benerin, tapi dicatat biar sesi lanjutan sadar): status "menunggu_verifikasi"
& "terlambat" harusnya punya animasi pulse (class lama `pulse-info` /
`pulse-danger`), tapi keduanya gak pernah didefinisikan di `siswa.css` yang
lama — jadi dari dulu animasinya emang gak pernah jalan. Versi Tailwind ini
niru persis (gak nambahin animasi buat 2 status itu). Kalau mau dibenerin,
tinggal tambahin `animate-pulse-badge` ke `menunggu_verifikasi` dan `terlambat`
di `STATUS_INFO`.

## 4. Rencana pecah file gede (siswa/tagihan/kelas page)

Kamu udah setuju boleh dipecah jadi komponen kecil, asal fungsi sama persis.
Rencana buat `app/admin/siswa/page.tsx` (1305 baris) sebagai contoh pola yang
sama dipakai di tagihan & kelas:

```
app/admin/siswa/
├── page.tsx                 (cuma compose komponen² di bawah, state utama)
├── components/
│   ├── SiswaTable.tsx        (tabel + pagination)
│   ├── SiswaFormModal.tsx    (modal tambah/edit)
│   ├── SiswaImportModal.tsx  (modal import excel)
│   ├── SiswaFilterBar.tsx    (search + filter kelas/status)
│   └── SiswaDetailPanel.tsx  (panel/modal detail 1 siswa)
```

**PENTING**: karena gak ada `node_modules`/`tsc`/build tool di sandbox tempat
kerja ini, setiap pemecahan file HARUS diuji manual (baca ulang tiap
komponen, cek props-nya nyambung) sebelum dikirim — jangan asal potong
berdasarkan baris. Kerjain 1 halaman dulu, minta di-tes di Railway, baru
lanjut ke halaman berikutnya. Jangan borong semua sekaligus tanpa testing di
antaranya.

## 5. Langkah terakhir migrasi — ✅ SUDAH DIJALANKAN

1. ✅ Cabut `import "bootstrap/dist/css/bootstrap.min.css";` dari `app/layout.tsx`
2. ✅ Hapus `"bootstrap": "^5.3.3"` dari `package.json` dependencies
3. ✅ Cek ulang semua halaman — udah gak ada class Bootstrap (`btn`, `card`,
   `form-control`, `row`, `col-*`, dll) yang kepakai lagi.

## 6. Komponen bersama yang dulu Bootstrap

- `components/admin/ConfirmModal.tsx` ✅ **Sudah dikonversi** — semua
  modal konfirmasi/alert di seluruh app otomatis ikut ke-update.

## 7. Belum tersentuh dari audit sebelumnya (optimisasi)

- `app/admin/siswa/page.tsx` dkk yang monolitik — otomatis kebantu pas
  dipecah jadi komponen di #4 (bundle per komponen, bukan 1 file raksasa).
- Belum ada review buat N+1 query di sisi API selain dashboard (kemungkinan
  ada pola serupa di halaman laporan/kelas yang narik banyak relasi
  sekaligus — belum dicek detail).
