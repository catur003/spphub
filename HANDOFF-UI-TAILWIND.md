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
| `app/admin/siswa/page.tsx` | 1305 | ⏳ Belum — **paling gede, pecah dulu jadi komponen sebelum restyle** (lihat #4) |
| `app/admin/tagihan/page.tsx` | 940 | ⏳ Belum — pecah juga |
| `app/siswa/page.tsx` | 713 | ⏳ Belum |
| `app/admin/kelas/page.tsx` | 614 | ⏳ Belum — pecah juga |
| `app/admin/pengguna/page.tsx` | 587 | ⏳ Belum |
| `app/admin/settings/page.tsx` | 471 | ⏳ Belum |
| `app/admin/arsip/page.tsx` | 370 | ✅ Selesai (2 modal custom: upload & preview) |
| `app/admin/laporan/page.tsx` | 359 | ✅ Selesai (print pakai Tailwind print: variant, TOLONG DITES cetak/print-nya di browser asli) |
| `app/admin/tahun-ajaran/page.tsx` | 313 | ✅ Selesai |
| `app/admin/keuangan/utang-pegawai/page.tsx` | 309 | ✅ Selesai |
| `app/admin/keuangan/pengeluaran/page.tsx` | 294 | ✅ Selesai |
| `app/admin/keuangan/pendapatan/page.tsx` | 278 | ✅ Selesai |
| `app/admin/pengumuman/page.tsx` | 263 | ✅ Selesai (modal custom, gak gantung ke Bootstrap lagi) |
| Sidebar/layout shell (`.app-sidebar` dll di globals.css) | - | ⏳ Belum (masih custom CSS, belum full Tailwind) |

**10 dari 15 halaman selesai** + `ConfirmModal` (komponen bersama, dipakai di
banyak halaman). Sisa 5 halaman biasa + 3 halaman yang perlu dipecah dulu.

### Lanjutan berikutnya, urutan yang disarankan:
1. `app/admin/settings/page.tsx` (471 baris — masih halaman biasa, gak perlu dipecah)
2. `app/admin/pengguna/page.tsx` (587 baris)
3. `app/siswa/page.tsx` (713 baris — halaman siswa, bukan admin)
4. `app/admin/kelas/page.tsx` (614 baris — **pecah dulu**, lihat §4)
5. `app/admin/tagihan/page.tsx` (940 baris — **pecah dulu**)
6. `app/admin/siswa/page.tsx` (1305 baris — **pecah dulu**, paling gede, kerjain terakhir)
7. Sidebar/layout shell (`.app-sidebar` dll di `globals.css`) — masih custom CSS
8. Baru setelah semua di atas beres: langkah pamungkas di §5 (cabut Bootstrap)

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

## 5. Langkah terakhir migrasi (JANGAN dilakukan sebelum semua halaman selesai)

1. Cabut `import "bootstrap/dist/css/bootstrap.min.css";` dari `app/layout.tsx`
2. Hapus `"bootstrap": "^5.3.3"` dari `package.json` dependencies
3. Cek ulang semua halaman — kalau masih ada class Bootstrap (`btn`, `card`,
   `form-control`, `row`, `col-*`, dll) yang kepakai, tampilannya bakal
   berantakan begitu CSS Bootstrap dicabut.

## 6. Komponen bersama yang masih Bootstrap

- `components/admin/ConfirmModal.tsx` ✅ **Sudah dikonversi** sesi ini — semua
  modal konfirmasi/alert di seluruh app otomatis ikut ke-update.

## 7. Belum tersentuh dari audit sebelumnya (optimisasi)

- `app/admin/siswa/page.tsx` dkk yang monolitik — otomatis kebantu pas
  dipecah jadi komponen di #4 (bundle per komponen, bukan 1 file raksasa).
- Belum ada review buat N+1 query di sisi API selain dashboard (kemungkinan
  ada pola serupa di halaman laporan/kelas yang narik banyak relasi
  sekaligus — belum dicek detail).
