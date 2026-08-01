# Rencana Lanjutan — SPP Hub

Dokumen ini nyatetin sisa pekerjaan dari request "cari bug + optimisasi"
yang belum kelar di sesi ini, plus urutan pengerjaan yang disaranin biar
gak numpuk jadi satu perubahan raksasa yang susah ditest.

Status per poin bug awal:

| # | Bug/Request | Status |
|---|---|---|
| 1 | Tabel gak responsive di HP | ✅ Selesai (14 tabel) |
| 2 | Harus refresh manual setelah set SPP | ✅ Selesai (akar masalah: Cache-Control) |
| 3 | Tingkat → Kelas, Nama Kelas → Nama Jurusan | ✅ Selesai (semua file) |
| 4 | Emoji → ikon profesional + gradient bermotif | ✅ Selesai (emoji 100%, gradient dipasang di shell admin) |
| 5 | Tab menu lemot | ✅ Selesai (akar masalah: session gak di-cache) |
| 6 | Laporan SPP kelihatan gak update | ✅ Selesai (filter bulan/tahun tersembunyi) |
| 7 | Rasio Status SPP blank tanpa keterangan | ✅ Selesai (empty state ditambahin) |
| 8 | Pengingat "tagihan belum dibuat" gak ilang | 🔶 2 kontributor udah di-fix (timezone + localStorage cache), lihat catatan di bawah |
| 9 | Menu "Kelola Pengeluaran" gak ada di sidebar | ✅ Selesai |
| 10 | Reorder menu sidebar (SPP / Tagihan Lainnya / Keuangan) | 🔶 Sebagian — grup SPP & Keuangan udah, "Tagihan Lainnya" nunggu Tahap 6 |
| 11 | Kartu saldo kas dikasih warna biar jelas | ✅ Selesai (dinamis ngikutin nilai + StatCards tagihan) |
| 12 | Fitur Tagihan Lainnya (seragam, daftar ulang, dll) | ⬜ Belum — lihat Tahap 6 |
| 13 | Info saldo kas lebih informatif | ⬜ Belum — lihat Tahap 7 |
| 14 | Custom print laporan (bukan screenshot halaman) | ⬜ Belum — lihat Tahap 8 |

### Catatan soal bug #8 (pengingat tagihan belum dibuat)
Dua penyebab konkret udah di-fix sesi ini:
1. `currentMonth`/`currentYear` di `/api/dashboard` sekarang dikunci ke
   timezone Asia/Jakarta (dulu ngikut timezone server, bisa beda ~7 jam
   sama browser admin).
2. Dashboard sempet nyimpen hasil fetch ke `localStorage` selama maks 5
   menit dan nampilin itu DULUAN sebelum data asli nyusul — udah dicabut,
   sekarang selalu fetch fresh ke server tiap buka halaman.

**Kalau setelah dua fix ini banner masih muncul padahal generate udah
bilang "semua dilewati karena sudah ada"**, kemungkinan besar penyebabnya
BUKAN lagi kode, tapi salah satu dari:
- Server production belum di-restart abis deploy (perhitungan tanggal
  baru kepakai kalau proses Node-nya beneran restart, bukan cuma build).
- Klik "Generate Massal" dari banner Dashboard bawa admin ke halaman
  Tagihan dengan bulan/tahun **default browser saat itu**, yang seharusnya
  sama dengan yang di-flag banner — tapi kalau device admin jamnya salah
  (timezone HP/laptop bukan WIB), tetep bisa beda. Cara ngecek manual:
  buka halaman Tagihan, filter ke bulan+tahun yang sama persis kayak yang
  disebut di teks banner, terus lihat manual apa masih ada siswa aktif
  yang barisnya kosong.

Kalau abis dicek manual ternyata masih ketemu kasusnya, kasih tau bulan/
tahun yang di-generate vs yang disebut banner-nya — itu bakal langsung
nunjukkin apa masih ada bug atau ini soal data/deploy.

---

## Tahap 1 — Rename terminologi "Tingkat" → "Kelas", "Nama Kelas" → "Nama Jurusan"

Prinsip: **cuma ganti label yang tampil ke user**, bukan nama field di
Prisma/API (`namaKelas`, `tingkat` tetep). Alasannya: rename field DB
butuh migration + nyentuh API routes, import/export Excel, dan query di
puluhan file sekaligus — resiko bikin data lama gak kebaca kalau ada yang
kelewat. Rename tampilan jauh lebih aman dan hasilnya sama-sama kelihatan
buat user.

File yang masih perlu disentuh (belum di sesi ini):
- `app/admin/kelas/components/KelasFormTambah.tsx` — label input "Nama
  Kelas" & "Tingkat"
- `app/admin/kelas/components/KelasEditModal.tsx` — sama
- `app/admin/kelas/components/KelasDetailModal.tsx` — header modal
- `app/admin/kelas/page.tsx` — subtitle halaman ("Data Kelas & Biaya SPP")
- `app/admin/siswa/components/SiswaFilterBar.tsx` — filter dropdown
  "Tingkat"
- `app/admin/siswa/components/NaikKelasModal.tsx` — teks "naik tingkat"
- `app/admin/tagihan/components/FilterToolbar.tsx` — filter "Tingkat"
- `app/admin/laporan/page.tsx` — kolom laporan yang nyebut tingkat/kelas

Estimasi: 1 sesi kerja (semua file kecil, tinggal ganti string label).

---

## Tahap 2 — Emoji → ikon SVG di sisa halaman

9 ikon baru udah ditambahin ke `components/admin/icons.tsx`
(`IconWarning`, `IconEdit`, `IconEye`, `IconTrash`, `IconPlus`,
`IconSave`, `IconMoney`, `IconSchool`, `IconCheckCircle`), plus ikon lama
yang udah ada duluan (`IconSearch`, `IconRefresh`, `IconFileText`, dst).
Kemungkinan masih perlu nambah beberapa lagi pas ngerjain (ikon printer,
lock/kunci, download/upload, bell/notifikasi, graduation cap beda dari
school, folder/arsip).

File yang masih pakai emoji (33 total, 1 udah kelar):
`app/admin/tagihan/page.tsx` + 4 komponennya, `app/admin/keuangan/laporan`,
`pengeluaran`, `utang-pegawai`, `pendapatan`, `app/admin/siswa/page.tsx` +
5 komponennya, `app/admin/settings/page.tsx`, `app/admin/laporan/page.tsx`,
`app/admin/pengguna/page.tsx`, `app/admin/arsip/page.tsx`,
`app/admin/pengumuman/page.tsx`, `app/admin/dashboard/page.tsx`,
`app/admin/tahun-ajaran/page.tsx`, `app/invoice/[id]/page.tsx`,
`app/kwitansi/[id]/KwitansiClient.tsx`, `app/siswa/page.tsx`.

Saran urutan: mulai dari halaman yang paling sering dibuka (dashboard,
tagihan, siswa) baru ke halaman keuangan/laporan/arsip yang lebih jarang.
`prisma/seed.ts` gak perlu disentuh (emoji di situ cuma buat log terminal
pas seeding, gak kelihatan user).

Estimasi: 2–3 sesi kerja (banyak file, tapi tiap file kerjanya
mekanis — cari emoji, ganti `<Icon.../>`).

---

## Tahap 3 — Background gradient bermotif (non-repeating)

Belum disentuh sama sekali. Rencana: bikin 1 gradient mesh/blob halus
(bukan pattern yang keulang kayak polkadot/grid) taro di `globals.css`
sebagai `background` di `<body>` atau di wrapper halaman admin
(`AdminShell` di `sidebar.tsx`), pakai warna yang udah ada di
`tailwind.config.ts` (`sidebar-bg`, `accent`, `surface`) biar konsisten,
bukan warna baru. Perlu keputusan dari Zen: mau gradient-nya di background
seluruh halaman admin, atau cuma di area sidebar/topbar/kartu login?

Estimasi: setengah sesi kerja + review visual bareng Zen (ini yang paling
butuh feedback langsung, karena "modern clean" itu subjektif).

---

## Tahap 4 — Reorder menu sidebar (udah jalan sebagian)

Struktur baru yang diterapin di `components/admin/sidebar.tsx`:

```
Dashboard
MASTER      → Siswa, Kelas, Tahun Ajaran
SPP         → Tagihan SPP, Laporan SPP
[TAGIHAN LAINNYA → nunggu Tahap 6, belum dipasang biar ga jadi menu mati]
KEUANGAN    → Kelola Pendapatan, Kelola Pengeluaran, Utang Pegawai, Laporan Kas
SISTEM      → Pengumuman, Kelola User (+ Pengaturan khusus owner)
```

Begitu Tahap 6 (Tagihan Lainnya) jadi, tinggal buka komentar yang udah
disiapin di `sidebar.tsx` (persis di bawah grup "SPP") dan isi href-nya.

---

## Tahap 5 — ✅ SELESAI — Kartu Saldo Kas jadi card berwarna

Diimplementasikan pakai opsi "dinamis ngikutin nilai" (bukan warna fix
per kategori): Saldo Kas & Laba/Rugi ganti hijau/merah ngikutin tanda
positif/negatif; SPP Belum Dibayar & Utang Pegawai ganti amber-merah/
hijau ngikutin ada-tidaknya jumlah. Detail di CHANGELOG.md bagian
"[Tahap 5]". StatCards di halaman Tagihan (Total Tagihan, Sudah Lunas,
Belum/Terlambat, Total Nominal) ikut dikasih warna penuh per kartu.

---

## Tahap 6 — Fitur baru: Tagihan Lainnya (seragam, pendaftaran/daftar ulang)

Fitur PALING BESAR di antara semua request. Rencana implementasi, niru
pola yang udah ada di modul SPP (`TagihanSpp`/`Pembayaran`) biar
konsisten dan gak reinvent:

**Skema database (baru)**
- Model `JenisTagihanLain` (master jenis: "Seragam", "Daftar Ulang", dll
  — nama, nominal default, aktif/nonaktif) — supaya bisa nambah jenis
  baru tanpa ubah kode.
- Model `TagihanLain` (mirip `TagihanSpp` tapi generik: siswaId,
  jenisTagihanLainId, nominal, status, jatuhTempo, tahunAjaranId).
- Model `PembayaranLain` (mirip `Pembayaran`: tagihanLainId, orderId,
  jumlah, metode, status, paidAt) — atau, kalau mau lebih hemat,
  `Pembayaran` yang ada di-generalize (tambah kolom nullable
  `tagihanLainId` di samping `tagihanSppId`) supaya satu tabel pembayaran
  nyimpen dua jenis transaksi. Perlu didiskusiin mana yang lebih gampang
  dirawat sebelum mulai — generalize 1 tabel lebih rapi tapi nyentuh
  kode existing (`bayar`, `verifikasi`, webhook Midtrans) yang udah jalan
  dan udah ditest; bikin tabel terpisah lebih aman (gak sentuh kode SPP
  yang udah stabil) tapi sedikit duplikasi.
- **Rekomendasi**: tabel terpisah dulu (lebih aman, SPP yang udah stabil
  gak keutak-atik), bisa di-refactor gabung belakangan kalau perlu.

**Halaman admin (niru 1:1 pola tagihan SPP)**
- `/admin/tagihan-lainnya` — generate massal per jenis + tabel riwayat,
  hasil copy struktur dari `app/admin/tagihan/` (StatCards,
  GenerateForm, FilterToolbar, TagihanTable → tinggal ganti field
  spesifik SPP jadi generik).
- `/admin/tagihan-lainnya/laporan` — copy dari `app/admin/laporan/`.
- API: `/api/tagihan-lain`, `/api/tagihan-lain/generate`,
  `/api/tagihan-lain/[id]/verifikasi`, dll — copy pola dari
  `/api/tagihan/*`.

**Halaman siswa (portal)**
- Tambah section baru di `app/siswa/page.tsx` (atau halaman terpisah)
  buat nampilin tagihan-lain yang belum dibayar, pakai tabel/format yang
  sama persis kayak tampilan tagihan SPP siswa sekarang, plus tombol
  bayar (Midtrans Snap, reuse `lib/midtrans.ts`).

**Estimasi**: ini bukan setengah/1 sesi — realistisnya 3-5 sesi kerja
kalau mau kualitasnya sama kayak modul SPP (skema+migration, API CRUD +
generate + verifikasi, 2 halaman admin, 1 halaman siswa, testing).
Saran: pecah lagi jadi milestone kecil (1) skema+API dulu, (2) halaman
admin, (3) halaman siswa+pembayaran — supaya bisa direview bertahap,
bukan sekali gede.

---

## Tahap 7 — Info saldo kas lebih informatif

Sekarang saldo kas cuma 1 angka (`saldoKas = totalSppLunas +
totalPendapatanLain - totalPengeluaran`, akumulasi SEPANJANG MASA, bukan
per periode). Rencana perbaikan tampilan (bukan cuma warna doang, ini
soal ISI informasinya):
- Breakdown sumbernya: berapa dari SPP, berapa dari pendapatan lain,
  berapa yang udah kepake buat pengeluaran — jangan cuma net saldo.
- Bedain "saldo kas total (all-time)" vs "arus kas bulan ini" — sekarang
  dua hal ini gampang ketuker karena cuma ada satu angka gede.
  `pendapatanBulanIni`/`tunggakanBulanIni` sebenernya udah dihitung di
  `/api/dashboard` tapi belum ditonjolkan di kartu saldo.
- Tren singkat (naik/turun dibanding bulan lalu) — data buat ini udah
  ada di `barChartData` (6 bulan terakhir), tinggal diringkas jadi badge
  kecil di kartu saldo ("+12% dari bulan lalu").

Estimasi: 1 sesi kerja (data-nya kebanyakan udah ada di API, ini lebih
ke nyusun ulang tampilan + nambah 1-2 hitungan turunan kecil).

---

## Tahap 8 — Custom print (bukan screenshot halaman)

Print sekarang (`window.print()` + CSS `print:` di Tailwind) pada
dasarnya nyetak PERSIS tampilan layar dikondisiin dikit — makanya
kerasa kayak "screenshot halaman", bukan dokumen laporan yang didesain
buat dicetak. Halaman yang kepengaruh: `app/admin/laporan/page.tsx`
(print) dan kemungkinan `app/admin/keuangan/laporan/page.tsx`.

Rencana: bikin **template cetak terpisah**, bukan nyetak DOM halaman
yang sama:
- Opsi A (lebih ringan): halaman print khusus (`/admin/laporan/print`
  atau modal khusus) dengan HTML/CSS yang didesain dari nol buat kertas
  (kop surat sekolah, tabel rapi ala dokumen resmi, nomor halaman,
  tanggal cetak, tanda tangan) — masih pakai `window.print()` tapi
  targetnya halaman yang emang didesain buat print, bukan reuse
  tampilan admin.
- Opsi B (lebih niat, ada infrastrukturnya): generate PDF di server
  pakai library PDF (liat skill `pdf` yang saya punya buat referensi
  cara bikin PDF terstruktur), didownload langsung sebagai file
  `laporan-spp-{bulan}-{tahun}.pdf` — hasilnya lebih konsisten
  antar-browser/printer dibanding `window.print()`.

Perlu keputusan dari Zen: cukup Opsi A (cepat, tetep pakai print
browser) atau langsung Opsi B (PDF generate, lebih bagus hasilnya tapi
kerjanya lebih banyak)?

Estimasi: Opsi A ~1 sesi, Opsi B ~2 sesi (perlu setup generator PDF +
desain layout).

---

## Catatan tambahan (di luar bug awal, ketauan pas audit)

- Belum ada testing end-to-end di sandbox (gak ada akses `npm install`/
  network buat jalanin dev server). Semua fix di atas udah diverifikasi
  lewat pembacaan kode + tracing logic manual, tapi tetep perlu dicoba
  jalan beneran (terutama fix `cookieCache` better-auth — pastiin versi
  `better-auth` yang dipakai di `package.json` emang support opsi ini).
- Kalau nanti ngerjain Tahap 1, sekalian cek apa field `tingkat` (Int)
  masih relevan buat SMK yang strukturnya X/XI/XII + jurusan, atau malah
  lebih pas kalau `namaKelas` isinya udah gabungan ("XII RPL 1") dan
  `tingkat` cuma dipake buat sorting/filter — biar labelnya gak
  membingungkan admin yang input data.
