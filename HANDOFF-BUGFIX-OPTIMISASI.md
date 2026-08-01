# Handoff — Sesi Bugfix, Optimisasi & Fitur Lanjutan

Simpan doc ini biar sesi berikutnya (siapapun yang lanjutin, termasuk
instance Claude lain) tau udah sampai mana. Detail lengkap tiap
perubahan ada di `CHANGELOG.md`, rencana lengkap tiap tahap ada di
`RENCANA-LANJUTAN.md` — doc ini cuma ringkasan status + apa yang harus
dikerjakan berikutnya.

---

## 0. Sesi terbaru — Fitur Kelola Jatuh Tempo + Hapus Massal SPP (⬜ BELUM di-push/compile)

Fitur baru diminta Zen (bukan bagian dari Tahap 1-8 di atas):

1. **Kelola Jatuh Tempo** (`/admin/jatuh-tempo`) — halaman baru buat kelola
   preset tanggal jatuh tempo bernama (misal "Seragam Gel.1 - 30 Agt"),
   dipisah per jenis (SPP vs Lainnya, sesuai keputusan Zen), tiap preset
   wajib punya `tahunAjaranId` (biar kefilter otomatis by tahun ajaran
   aktif). Model baru `JatuhTempoPreset` di schema (enum `JenisPreset`).
   API: `app/api/jatuh-tempo/route.ts` (GET+POST) & `[id]/route.ts`
   (PATCH+DELETE). Sidebar: masuk grup MASTER.
2. Dropdown preset ditambahin di `GenerateForm` SPP (`app/admin/tagihan/`)
   & Tagihan Lainnya (`app/admin/tagihan-lainnya/`) — pilih preset auto-isi
   input tanggal manual (manual override tetap bisa). Preset SPP difilter
   ikut `gen.tahunAjaranId`; preset Lainnya juga ikut `gen.tahunAjaranId`
   kalau diisi (field ini opsional di form Lainnya).
3. **Hapus tagihan massal SPP** — checkbox per baris + bar hapus massal di
   `TagihanTable` SPP, sama persis pola yang sudah ada di tagihan-lainnya
   (loop `DELETE /api/tagihan/[id]` per id terpilih, tagihan yang punya
   pembayaran sukses otomatis gagal/dilindungi).
4. **Filter jatuh tempo (rentang tanggal)** ditambahin di `FilterToolbar`
   SPP + `GET /api/tagihan` (`jatuhTempoStart`/`jatuhTempoEnd`) — biar bisa
   filter dulu baru centang massal & hapus. (Belum ditambahin ke
   tagihan-lainnya, gak diminta Zen buat sisi itu.)

⚠️ **WAJIB `npx prisma db push`** (atau generate migration) buat tabel
baru `jatuh_tempo_preset` sebelum test. **Belum pernah dicompile** — sandbox
sesi ini juga gak ada akses network & `node_modules` belum ke-install.
Semua perubahan cuma diverifikasi manual (baca kode + cek kurung
kurawal/parentheses balance). Kalau environment berikutnya punya akses
network, jalanin `npm install` lalu `npm run build` duluan.

---



| Tahap | Isi | Status |
|---|---|---|
| 1 | Rename "Tingkat"→"Kelas", "Nama Kelas"→"Nama Jurusan" | ✅ Selesai |
| 2 | Emoji → ikon SVG di seluruh codebase | ✅ Selesai (diverifikasi: 0 emoji, 0 import nganggur) |
| 3 | Gradient background non-repeating di shell admin | ✅ Selesai |
| 4 | Reorder menu sidebar (SPP / Keuangan) + fix menu Pengeluaran hilang | ✅ Selesai |
| 5 | Kartu saldo & StatCards jadi berwarna dinamis | ✅ Selesai |
| 6 | Fitur baru: Tagihan Lainnya (seragam, daftar ulang) | 🔶 Milestone 1, 2 & 3 selesai (skema+API, halaman admin, laporan+portal siswa) — lihat bagian 1a di bawah |
| 7 | Saldo kas lebih informatif (breakdown, tren) | ⬜ **BELUM DIKERJAKAN** |
| 8 | Custom print PDF (bukan screenshot halaman) | ⬜ **BELUM DIKERJAKAN** — keputusan udah ada (lihat #2) |

### 1a. Detail progres Tahap 6 (Tagihan Lainnya) — PENTING buat sesi berikutnya

**Milestone 1 (skema + API) — ✅ selesai:**
- `prisma/schema.prisma`: model baru `JenisTagihanLain`, `TagihanLain`,
  `PembayaranLain` (tabel TERPISAH dari SPP, sesuai keputusan Zen).
  Reuse enum `StatusTagihan` & `StatusPembayaran` yang udah ada.
- API lengkap di `app/api/tagihan-lain/*`: `jenis/` (CRUD master),
  list+filter, `generate/`, `[id]` (update/hapus), `[id]/verifikasi`,
  `[id]/bayar` (Snap Midtrans), `[id]/cek-status`, `saya/`.
- `app/api/midtrans/webhook/route.ts` di-update: routing berdasar
  prefix `orderId` (`SPP-` vs `LAIN-`) ke tabel yang bener. Kode SPP
  lama TIDAK diubah.

**Milestone 2 (halaman admin) — ✅ selesai:**
- `app/admin/tagihan-lainnya/` — page.tsx + types.ts + components/
  (`JenisManager`, `GenerateForm`, `FilterToolbar`, `TagihanTable`).
  Reuse `StatCards` & `SiswaDetailModal` langsung dari
  `app/admin/tagihan/components/` (gak diduplikasi).
- `components/admin/sidebar.tsx`: grup "TAGIHAN LAINNYA" udah
  diaktifkan (link ke `/admin/tagihan-lainnya`).

**⚠️ BELUM dijalankan sama sekali** (sandbox kerja sesi ini juga gak
ada akses network): `npm install` / `npx prisma db push` / `next
build`. **WAJIB jalanin `npx prisma db push` (atau generate migration)
duluan** sebelum test apapun, karena ada 3 tabel baru yang belum ada
di database. Semua kode di atas cuma diverifikasi lewat pembacaan
kode manual, belum pernah dicompile.

**Milestone 3 — ✅ selesai:**
- `app/admin/tagihan-lainnya/laporan/page.tsx` — dibuat copy pola dari
  `app/admin/laporan/page.tsx`. Reuse endpoint list `GET /api/tagihan-lain`
  yang udah ada (bukan bikin API laporan baru) — filter tanggal jatuh
  tempo (`startDate`/`endDate`) dilakukan di client karena endpoint
  tsb belum support range date di query. Sidebar (`components/admin/sidebar.tsx`)
  udah diaktifkan link submenu "Laporan" di grup TAGIHAN LAINNYA.
- `app/siswa/tagihan-lain/page.tsx` — halaman **terpisah** (bukan
  section nempel di `app/siswa/page.tsx` biar gak resiko ganggu flow
  SPP yang udah stabil di file 750+ baris itu). Pakai
  `/api/tagihan-lain/saya` buat load data, `/api/tagihan-lain/[id]/bayar`
  + Snap Midtrans buat bayar, `/api/tagihan-lain/[id]/cek-status` buat
  cek status manual. Link menuju halaman ini udah ditambahin di navbar
  `app/siswa/page.tsx` (tombol "Tagihan Lainnya" di sebelah tombol
  Hubungi Bendahara).

⚠️ **Belum pernah dicompile** (sandbox sesi ini juga gak ada akses
network) — sama seperti Milestone 1 & 2, semua kode di atas cuma
diverifikasi lewat pembacaan manual + cek nama ikon yang tersedia di
`components/admin/icons.tsx`. Kalau environment berikutnya punya akses
network, jalanin `npm run build` dulu.



Bug-bug awal dari laporan Zen semua udah ✅ kecuali **bug #8 di tabel
status lama** ("pengingat tagihan belum dibuat gak ilang") — 2 kontributor
teknis udah di-fix (timezone server vs WIB, localStorage cache), tapi
BELUM ada konfirmasi dari Zen apa masalahnya bener-bener hilang di
production. **Kalau sesi berikutnya Zen bilang masih kejadian, cek
`RENCANA-LANJUTAN.md` bagian "Catatan soal bug #8" duluan sebelum mulai
investigasi dari nol.**

---

## 2. Keputusan yang udah dikonfirmasi Zen (PENTING — jangan tanya ulang)

### Tahap 6 — Fitur Tagihan Lainnya
**Opsi A dipilih**: tabel database TERPISAH dari SPP (`TagihanLain`,
`PembayaranLain`, `JenisTagihanLain`), BUKAN generalize tabel
`Pembayaran` yang ada. Alasan: gak nyentuh kode SPP yang udah stabil
(bayar, verifikasi, webhook Midtrans).

Rencana implementasi lengkap (skema, halaman admin, halaman siswa) ada
di `RENCANA-LANJUTAN.md` Tahap 6. Saran pemecahan milestone dari situ:
1. Skema Prisma + migration + API (generate, verifikasi, CRUD)
2. Halaman admin (copy pola dari `app/admin/tagihan/`)
3. Halaman siswa/portal (copy pola tabel dari tagihan SPP siswa) + Midtrans

### Tahap 8 — Custom Print
**Opsi B dipilih**: generate PDF beneran di server (bukan cuma halaman
print khusus + `window.print()`). Tambahan requirement dari Zen:
- **Format A4**, dan **wajib support portrait DAN landscape** (biar
  dipilih sesuai kebutuhan laporan — tabel lebar mungkin lebih enak
  landscape)
- **Wajib responsive** — asumsi ini soal PREVIEW-nya di layar sebelum
  di-generate (bukan PDF-nya sendiri, PDF kan fixed-size), perlu
  diklarifikasi ulang ke Zen pas mulai kerjain kalau masih ambigu
- **Versi PDF beda buat siswa vs admin** — Zen eksplisit bilang "buat
  custom digital untuk siswa sendiri dan untuk admin sendiri pastinya
  kan beda". Jangan cuma bikin 1 template PDF generik dipakai di
  keduanya. Kemungkinan bedanya:
  - **Siswa**: kwitansi/invoice pembayaran pribadi (udah ada
    `app/invoice/[id]/page.tsx` & `app/kwitansi/[id]/KwitansiClient.tsx`
    yang sekarang masih pakai `window.print()` — ini kandidat kuat buat
    di-convert ke PDF generate juga, bukan cuma laporan admin)
  - **Admin**: laporan rekap (Laporan SPP, Laporan Kas) — data agregat
    banyak siswa/transaksi, butuh kop surat sekolah & mungkin lebih
    condong ke landscape kalau kolomnya banyak
  
  Untuk skill teknis generate PDF, liat `/mnt/skills/public/pdf/SKILL.md`
  kalau masih tersedia di environment kerja berikutnya.

Halaman yang kepengaruh: `app/admin/laporan/page.tsx` (tombol "Cetak
PDF"), `app/admin/keuangan/laporan/page.tsx` (tombol "Cetak Laporan
Keuangan Pembukuan"), `app/invoice/[id]/page.tsx`, dan
`app/kwitansi/[id]/KwitansiClient.tsx`.

---

## 3. Yang BELUM sempat dijawab Zen (tanyain kalau relevan)

- Tahap 7 (saldo kas informatif): gak butuh keputusan besar, tinggal
  jalanin — datanya kebanyakan udah ada di `/api/dashboard`, cuma perlu
  disusun ulang tampilannya.
- Halaman **login belum dikasih gradient background** (Tahap 3 cuma
  dipasang di shell admin). Tanya Zen kalau mau disamain.

---

## 4. Constraint teknis penting buat sesi berikutnya

- **Sandbox kerja gak punya akses network** (`npm install` gagal, gak
  bisa `next build`/`next dev` buat verifikasi beneran). Semua fix
  divalidasi lewat pembacaan kode + tracing logic manual + scan regex
  otomatis (emoji, unused import) — BUKAN hasil compile. Kalau environment
  berikutnya PUNYA akses network, jalanin `npm run build` dulu buat
  nangkep typo/syntax error yang mungkin kelewat.
- Perubahan di `lib/auth.ts` (`session.cookieCache`) & `app/api/*/route.ts`
  (`Cache-Control` headers) butuh **restart server production**, bukan
  cuma redeploy/build ulang.
- Prisma schema (`prisma/schema.prisma`) BELUM disentuh sama sekali di
  seluruh sesi ini — semua rename terminologi cuma di level label UI.
  Tahap 6 bakal jadi PERUBAHAN SCHEMA PERTAMA di sesi-sesi ini, jadi
  hati-hati extra & inget bikin migration-nya.

---

## 5. File-file kunci

- `CHANGELOG.md` — riwayat lengkap tiap fix per tahap (paling detail)
- `RENCANA-LANJUTAN.md` — rencana teknis tiap tahap yang belum kelar
- `components/admin/icons.tsx` — ~25 ikon SVG, dipakai di seluruh admin
  (gantiin emoji). Nambah ikon baru di sini kalau butuh yang belum ada,
  jangan pakai emoji atau import library icon baru.
- `app/globals.css` — punya class `.app-shell-bg` (gradient mesh)
