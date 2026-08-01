# Changelog — SPP Hub

Catatan perubahan dari sesi audit + bugfix + migrasi Tailwind. Urutan dari
yang paling baru.

---

## [Fitur Baru] Kelola Jatuh Tempo (preset) + Hapus Massal SPP + Filter Jatuh Tempo

⚠️ Belum di-`prisma db push`, belum pernah dicompile (sandbox gak ada
network & `node_modules`). Detail status lengkap ada di bagian 0 `HANDOFF-BUGFIX-OPTIMISASI.md`.

### Schema
- Model baru `JatuhTempoPreset` (`nama`, `tanggal`, `jenis` [enum
  `JenisPreset`: `spp`/`lainnya`], `tahunAjaranId` wajib) — preset dipisah
  per jenis sesuai keputusan Zen, satu preset selalu terikat satu tahun
  ajaran biar bisa kefilter otomatis ikut tahun ajaran aktif.

### Halaman & API baru
- `/admin/jatuh-tempo` — CRUD preset, 2 tab (SPP / Lainnya). Ditambahin ke
  sidebar grup MASTER.
- `app/api/jatuh-tempo/route.ts` (GET+POST) & `[id]/route.ts` (PATCH+DELETE).

### Generate Tagihan (SPP & Lainnya)
- Dropdown "Pilih Preset" ditambahin di atas input tanggal manual di
  `GenerateForm` SPP & Lainnya — pilih preset auto-isi tanggal, input
  manual tetap ada sebagai fallback/override. Preset yang muncul difilter
  ikut `tahunAjaranId` yang lagi dipilih di form generate.

### Hapus Tagihan Massal SPP
- `TagihanTable` SPP (`app/admin/tagihan/components/TagihanTable.tsx`)
  ditambahin kolom checkbox + bar "Hapus N Terpilih", identik pola yang
  udah ada di tagihan-lainnya (loop `DELETE /api/tagihan/[id]`, tagihan
  yang punya pembayaran sukses otomatis gagal dihapus / dilindungi
  sistem — dicek di API `[id]/route.ts` yang emang udah ada dari
  sebelumnya, gak diubah).

### Filter Jatuh Tempo (SPP)
- `FilterToolbar` SPP ditambahin 2 input rentang tanggal (dari — sampai)
  buat filter jatuh tempo, dikirim ke `GET /api/tagihan` sebagai
  `jatuhTempoStart`/`jatuhTempoEnd`. Berguna buat filter dulu sebelum
  centang massal + hapus. (Cuma di sisi SPP, gak diminta buat
  tagihan-lainnya.)

---

## [Tahap 5] Kartu saldo & statistik jadi berwarna dinamis

### Dashboard — 4 Executive Card
Sebelumnya warnanya FIX per kartu (Saldo Kas selalu biru, Laba/Rugi
selalu hijau, dst) — gak nyambung sama kondisi aslinya. Sekarang warnanya
**ngikutin nilai**:
- **Saldo Kas Utama** — hijau kalau ≥ 0, merah kalau minus
- **Laba/Rugi Net** — hijau kalau untung, merah kalau rugi
- **SPP Belum Dibayar** — amber kalau masih ada tunggakan, hijau kalau 0
- **Utang Pegawai** — merah kalau masih ada kasbon jalan, hijau kalau 0

Ini keputusan yang saya ambil sendiri (opsi "dinamis ngikutin nilai" dari
2 opsi yang saya ajuin di `RENCANA-LANJUTAN.md` Tahap 5) karena paling
langsung ngasih tau kondisi kas tanpa perlu mikir — sekali lihat warna
udah ketauan mana yang butuh perhatian.

### Halaman Tagihan — 4 Stat Card (Total Tagihan, Sudah Lunas, Belum/
Terlambat, Total Nominal)
Sebelumnya cuma badge ikon kecil yang berwarna, badan kartunya putih
polos semua — jadi keempat kartu itu keliatan sama aja sekilas. Sekarang
tiap kartu punya border kiri tebal + tint background + warna teks angka
sendiri-sendiri: biru (Total Tagihan, netral/informasi), hijau (Sudah
Lunas), merah (Belum/Terlambat), indigo (Total Nominal, ngikutin warna
aksen app). `app/admin/tagihan/components/StatCards.tsx`.

Halaman Laporan SPP (`app/admin/laporan/page.tsx`) dicek juga — kartu di
situ (`SummaryCard`) ternyata udah punya accent bar & warna teks dari
awal, jadi gak perlu diubah.

---

## [Tahap 3] Gradient background bermotif non-repeating

`app/globals.css` — nambah class `.app-shell-bg`: 4 radial-gradient besar
(indigo, hijau, amber — warna diambil dari palette yang udah ada di
`tailwind.config.ts`, bukan warna baru) diposisikan di titik berbeda-beda
dengan opacity sangat rendah (0.05–0.08). Ini gradient MESH, bukan
pattern yang keulang kayak polkadot/grid — tiap "blob"-nya cuma muncul
sekali di posisi tetap.

Dipasang di `components/admin/sidebar.tsx` (`AdminShell`), ganti
`bg-surface` polos yang lama — otomatis kepakai di SEMUA halaman admin
karena ini di level shell, bukan per-halaman. Kartu/tabel yang emang
solid putih tetep solid putih; gradient cuma kelihatan di ruang
kosong/margin antar-elemen.

**Keputusan yang saya ambil sendiri** (belum sempat ditanyain ke Zen,
proceed pakai default paling aman): scope-nya SEMUA halaman admin, bukan
cuma sidebar/topbar/kartu login — dan halaman login (`/login`) BELUM
disentuh sama sekali, masih background polos lama. Kalau mau login page
juga dikasih gradient yang sama, tinggal bilang.

**Catatan teknis**: sengaja TIDAK pakai `background-attachment: fixed` —
itu properti yang biasa dipasang biar gradient "diem di tempat" pas
halaman di-scroll, tapi dikenal luas bikin rendering nge-jank/patah-patah
pas discroll di Safari iOS. Karena app ini abis dioptimasi buat dipakai
di HP (tabel responsive dll), saya prioritasin smooth-scroll di HP
ketimbang efek visual itu.

---

## [Emoji → Ikon SVG] Tahap 2 selesai — seluruh codebase bersih dari emoji

Lanjutan dari 11 file yang udah kelar sesi lalu. Sekarang SEMUA file
sisanya udah diberesin: `admin/siswa/page.tsx` + 5 komponennya
(`SiswaEditModal`, `SiswaFormTambah`, `SiswaDetailModal`,
`SiswaImportExport`, `SiswaTable`), `admin/tagihan/page.tsx` + 3
komponennya (`GenerateForm`, `StatCards`, `TagihanTable`), sisa
`admin/laporan/page.tsx`, `admin/kelas/page.tsx`, `invoice/[id]/page.tsx`,
`kwitansi/[id]/KwitansiClient.tsx`.

**Verifikasi otomatis dijalanin di akhir** (scan regex ke semua file
`.tsx`/`.ts`, kecuali `prisma/seed.ts` yang emoji-nya cuma buat log
terminal pas seeding, gak kelihatan user):
- ✅ 0 emoji tersisa di seluruh codebase
- ✅ 0 import dari `icons.tsx` yang gak kepakai (dicek tiap file: import
  vs pemakaian JSX)
- ✅ 0 pemakaian `<IconXxx>` yang lupa diimport

`components/admin/icons.tsx` sekarang punya ~25 ikon SVG (nambah dari 16
di awal sesi): `IconWarning`, `IconEdit`, `IconEye`, `IconTrash`,
`IconPlus`, `IconSave`, `IconMoney`, `IconSchool`, `IconCheckCircle`,
`IconClipboard`, `IconZap`, `IconKey`, `IconPrinter`, `IconCreditCard`,
`IconCrown`, `IconGraduationCap`, `IconUser`, `IconClock`, `IconFolder`,
`IconImage`, `IconUpload`, `IconInbox`, `IconDownload`.

### Bonus temuan pas nyapu emoji
- **Typo "Kas Kas"** di `app/admin/keuangan/laporan/page.tsx` — judul
  halaman kebaca "Laporan Keuangan & Arus Kas **Kas** Sekolah" (kata
  "Kas" ke-duplikat). Dibetulin jadi "Arus Kas Sekolah".
- Konsistensi kecil di `GenerateForm.tsx` (tagihan): teks yang masih
  nyebut "kelas" buat jumlah jurusan yang belum diatur SPP-nya
  disamain jadi "jurusan", ngikutin rename Tahap 1.

### Catatan teknis: kenapa dua tombol close pakai IconX bukan ikon lain
Tombol "×" polos di beberapa modal (`SiswaEditModal`, `SiswaDetailModal`,
`pengumuman`) diseragamin pakai `IconX` yang sama kayak tombol close di
tempat lain — bukan simbol × mentahan lagi, biar konsisten satu bahasa
visual di semua modal.

---

## [Rename Terminologi] "Tingkat" → "Kelas", "Nama Kelas" → "Nama Jurusan" (selesai semua file)

Lanjutan dari yang udah dimulai di `KelasTable.tsx` sesi lalu. Sekarang
label UI di SEMUA file yang kemarin masih nyebut istilah lama udah
diganti: `KelasFormTambah`, `KelasEditModal`, `KelasDetailModal`,
`SiswaFilterBar`, `NaikKelasModal`, `FilterToolbar` (tagihan), dan
`app/admin/laporan/page.tsx`.

**Tetap konsisten dengan prinsip dari sesi sebelumnya**: cuma teks yang
tampil ke user yang diganti. Field database (`namaKelas`, `tingkat`),
nama variabel/prop (`filterTingkat`, `setTingkat`, dst) SENGAJA gak
disentuh — biar gak perlu migration Prisma dan gak nyentuh logic
API/query yang udah stabil.

### Bonus temuan: typo "LUNAS" harusnya "LULUS"
Pas beresin `NaikKelasModal.tsx`, ketemu opsi dropdown nulis
**"🎓 Tandai LUNAS / ALUMNI (Kelulusan)"** — "LUNAS" itu istilah status
PEMBAYARAN (SPP sudah dibayar), bukan istilah kelulusan. Ini typo/salah
ketik yang berpotensi bikin admin salah paham (kirain nandain status
bayar, padahal itu buat nandain siswa lulus/alumni). Dibetulin jadi
"Tandai LULUS / ALUMNI (Kelulusan)".

### Emoji juga dibersihin sekalian di file-file yang disentuh
Karena lagi buka file yang sama, sekalian emoji-nya diganti ikon SVG
(pola yang sama kayak `KelasTable.tsx` sesi lalu): `KelasFormTambah`
(⚠️→IconWarning, ✚→IconPlus), `KelasEditModal` (💾→IconSave),
`KelasDetailModal` (🏫👥📊→IconSchool/IconUsers/IconChart),
`NaikKelasModal` (🚀🎓→IconRefresh/IconCheckCircle), `FilterToolbar` &
`SiswaFilterBar` (🔍✕ di placeholder/tombol dihapus/diganti ikon).

Sisa file yang masih pakai emoji ada di `RENCANA-LANJUTAN.md` Tahap 2
(belum semua, masih banyak — keuangan, siswa/page.tsx, settings, dll).

---

## [Bugfix + Reorder] Sidebar Pengeluaran hilang, localStorage cache dashboard, reorder menu

### Bug — Menu "Kelola Pengeluaran" gak ada di sidebar
Halaman `app/admin/keuangan/pengeluaran/page.tsx` udah lengkap & bisa
diakses langsung lewat URL, tapi memang gak pernah didaftarin ke
`NAV_GROUPS` di `components/admin/sidebar.tsx` — bukan ke-cache atau
ke-hide, murni ketinggalan pas nyusun menu. Sekarang udah ditambahin.

### Kontributor tambahan — Pengingat "tagihan belum dibuat" masih nongol
Selain fix timezone sesi sebelumnya, ketauan `app/admin/dashboard/page.tsx`
nyimpen hasil fetch dashboard ke `localStorage` (`dashboard_cache`) dan
nampilin itu DULU begitu halaman dibuka (bisa sampai 5 menit basi) sebelum
data asli nyusul di belakang layar. Ini lapisan cache TAMBAHAN di atas
Cache-Control server yang udah dibenerin sesi lalu — jadi walau server
udah bener, browser tetep sempet nyuguhin snapshot lama tiap buka
Dashboard. Dicabut total; sekarang selalu fetch fresh ke server tiap
halaman dibuka. Detail kenapa ini mungkin BELUM 100% nyelesein masalah
kalau masih kejadian ada di `RENCANA-LANJUTAN.md`.

### Reorder menu sidebar
`components/admin/sidebar.tsx` — struktur grup diubah dari
`TRANSAKSI`/`LAPORAN` jadi:
- **SPP**: Tagihan SPP, Laporan SPP
- **KEUANGAN**: Kelola Pendapatan, Kelola Pengeluaran, Utang Pegawai,
  Laporan Kas

Grup **"Tagihan Lainnya"** (buat fitur seragam/daftar ulang) SENGAJA
belum dipasang — halamannya belum ada, nge-link ke situ bakal jadi menu
404. Placeholder + cara masangnya udah disiapin sebagai komentar persis
di titik yang tepat di `sidebar.tsx`, tinggal isi pas fiturnya jadi
(lihat `RENCANA-LANJUTAN.md` Tahap 6).

### Ditambahkan ke backlog (lihat `RENCANA-LANJUTAN.md` Tahap 5–8)
- Kartu saldo kas dikasih pewarnaan yang lebih jelas (hijau/merah/amber
  per kategori).
- Fitur baru **Tagihan Lainnya** (seragam, pendaftaran/daftar ulang) —
  bisa dibayar siswa di halaman portal, reuse pola tabel/format dari
  pembayaran SPP. Ini fitur paling besar, dipecah jadi 3 milestone.
- Saldo kas dibikin lebih informatif (breakdown sumber, bulan-ini vs
  all-time, tren).
- Custom print laporan (bukan `window.print()` niru tampilan layar) —
  dua opsi diajuin (halaman print khusus vs generate PDF beneran).

---

## [Bugfix] Pengingat "tagihan belum dibuat" gak ilang + chart Rasio Status SPP blank

### Bug 1 — Banner "Ada N siswa belum dibuatkan tagihan" gak ilang
`app/api/dashboard/route.ts` nentuin "bulan & tahun berjalan" pakai
`new Date().getMonth()/getFullYear()` — ini kebaca dari **timezone proses
server**, yang di hosting kayak Railway/Vercel defaultnya **UTC**.
Sementara form "Generate Tagihan Massal" di `app/admin/tagihan/page.tsx`
nentuin default bulan/tahun-nya dari `new Date()` di **browser admin**,
yang otomatis WIB (Asia/Jakarta, UTC+7).

Selisih 7 jam ini bikin, di sekitar jam **00.00–06.59 WIB**, server (UTC)
masih ngitung "bulan berjalan" = bulan yang lama, padahal tagihan yang
barusan di-generate (dari sisi admin, WIB) udah kesimpen di bulan yang
baru. Akibatnya `jumlahTagihanBelumDibuat` (dihitung dari selisih total
siswa aktif vs jumlah tagihan bulan-server-yang-lama) tetep nunjukkin
angka positif walau tagihan buat bulan itu (versi WIB, yang bener) udah
lengkap dibuat semua.

**Fix**: `currentMonth`/`currentYear` di `/api/dashboard` sekarang dihitung
eksplisit pakai `Intl.DateTimeFormat` dengan `timeZone: "Asia/Jakarta"`,
gak lagi gantung ke timezone server. Perhitungan turunannya
(`awalBulanIni`, `enamBulanLalu`, urutan 6 bulan buat bar chart) ikut
disamain ke acuan WIB yang sama, biar semuanya konsisten satu timezone.

> Catatan: kalau setelah fix ini banner masih nunjukkin angka padahal
> tagihan buat bulan itu kerasa udah lengkap, kemungkinan bukan lagi bug
> timezone — coba cek halaman Tagihan (filter ke bulan yang sama) apa ada
> siswa aktif yang emang belum punya baris tagihan (misal siswa baru yang
> ditambahin setelah generate massal terakhir jalan). Itu perilaku yang
> disengaja (bukan bug), soalnya generate massal cuma nyentuh siswa yang
> aktif PAS tombol generate ditekan.

### Bug 2 — "Rasio Status SPP" (donut chart di dashboard) blank, gak ada legend/label
`pieChartData` isinya 3 slice (Lunas/Belum Bayar/Terlambat) yang dihitung
dari tagihan bulan berjalan doang. Kalau bulan itu belum ada tagihan sama
sekali (nilainya 0-0-0 — termasuk skenario Bug 1 di atas sebelum di-fix),
Recharts nge-render `<PieChart>` kosong total tanpa legend/label/keterangan
apapun — kelihatan kayak komponennya rusak, padahal cuma gak ada data.

**Fix**: `app/admin/dashboard/page.tsx` sekarang ngecek total
`pieChartData` dulu — kalau 0, tampilin placeholder teks "Belum ada
tagihan untuk bulan ini" + ikon, bukan chart kosong tanpa keterangan.

### ⚠️ Perlu dicek manual
- Server production perlu di-restart abis deploy biar Node re-evaluate
  perhitungan tanggal (bukan cuma build).
- Kalau server disetel `TZ=Asia/Jakarta` di environment variable-nya,
  fix ini gak ngubah apa-apa (udah otomatis bener sebelumnya) — tapi tetep
  aman dipasang sebagai jaga-jaga kalau env var itu kehapus/keganti pas
  pindah hosting.

---

## [Bugfix] Laporan SPP kelihatan gak update, padahal Laporan Kas ke-update

### Bug
Setelah verifikasi/bayar tagihan SPP, angka di **Laporan Kas**
(`app/admin/keuangan/laporan`, sumber datanya `/api/dashboard`) langsung
naik — tapi **Laporan SPP** (`app/admin/laporan`) kelihatan gak berubah
sama sekali, seolah datanya gak ke-update.

### Akar masalah
`app/admin/laporan/page.tsx` punya state `bulan` & `tahun` yang di-`default`-in
ke **bulan & tahun berjalan** (`useState(String(new Date().getMonth()+1))`,
dst), dan dua-duanya ikut dikirim ke `/api/laporan` di setiap request
(`queryString()`). Masalahnya: **gak ada dropdown/kontrol apapun di form
filter buat ganti nilai `bulan`/`tahun` itu** — `setBulan`/`setTahun` gak
pernah dipanggil di mana pun selain inisialisasi awal. Jadi filter bulan+
tahun ini nyala terus secara diam-diam, gak kelihatan oleh admin, dan gak
bisa dimatikan lewat UI.

Akibatnya: begitu ada tagihan SPP yang dibayar/diverifikasi untuk **bulan
selain bulan berjalan** (tunggakan dari bulan lalu itu hal biasa banget di
sistem SPP), datanya kefilter otomatis dan gak nongol di Laporan SPP —
padahal datanya di database udah bener-bener berubah. Sementara itu,
`totalSppLunas` di `/api/dashboard` (dipake buat "Laporan Kas") ngitung
SEMUA tagihan lunas tanpa filter periode sama sekali, jadi kelihatan
"kok yang ke-update malah kas."

Bukti tambahan: teks header cetak PDF di halaman yang sama nulis
`Periode: {bulan ? BULAN_LABEL[...] : "Semua Bulan"}` — ini nunjukkin
dulu emang niatnya ada dropdown "Semua Bulan / pilih bulan", tapi
kontrolnya ilang (kemungkinan kepotong pas migrasi Tailwind), state-nya
doang yang ketinggalan.

### Fix
`app/admin/laporan/page.tsx`:
- Default `bulan`/`tahun` diganti dari "bulan & tahun berjalan" jadi
  string kosong (`""` = Semua Periode), biar begitu halaman dibuka gak
  ada filter tersembunyi yang aktif.
- Ditambahin dropdown **"Bulan"** (Semua Bulan / Januari–Desember) dan
  **"Tahun"** (Semua Tahun / 5 tahun terakhir) di form filter, disambungin
  ke `setBulan`/`setTahun` yang sebelumnya nganggur.

### ⚠️ Perlu dicek manual
Coba filter per-bulan/per-tahun di Laporan SPP abis narik zip ini — pastiin
angkanya cocok sama Laporan Kas kalau filter di-set ke periode yang sama.

---

## [Audit Bug + Optimisasi] Cache-Control, session, tabel responsive, terminologi, ikon

### Diperbaiki (bug)
- **Harus refresh manual setelah "Set SPP"/edit kelas/edit tagihan** — akar
  masalah: `GET /api/kelas` & `GET /api/tagihan` ngirim header
  `Cache-Control: max-age=60` / `max-age=15`. Browser nyuguhin response GET
  yang di-cache walau halaman udah manggil ulang `fetch()` setelah
  update/hapus, jadi data kelihatan belum berubah sampai user hard-refresh.
  Diganti jadi `Cache-Control: no-store` di `app/api/kelas/route.ts` dan
  `app/api/tagihan/route.ts`. `app/api/dashboard/route.ts` diperpendek dari
  `max-age=60` ke `max-age=5` (dashboard gak sekritis itu soal freshness,
  tapi 60 detik kelamaan).
- **Tab menu admin lemot & gak konsisten (kadang cepet kadang lambat)** —
  akar masalah: `requireRole()` di `app/admin/layout.tsx` manggil
  `auth.api.getSession()` yang query database di **setiap** perpindahan
  menu/halaman, tanpa cache sama sekali. Diaktifkan `session.cookieCache`
  di `lib/auth.ts` (cache sesi di signed cookie, re-validasi ke DB paling
  lama tiap 60 detik) — DB gak lagi di-hit tiap klik menu.
- **Tabel gak responsive di HP** — akar masalah: elemen `<table>` dikasih
  `w-full` tanpa `min-w`, jadi di layar sempit kolom-kolom kejepit/rusak
  alih-alih tabelnya scroll ke samping (padahal wrapper `overflow-x-auto`
  udah ada di sebagian besar tabel, cuma gak ada gunanya tanpa
  `min-width`). Ditambahin `min-w-[...]` (480–720px tergantung jumlah
  kolom) ke 14 tabel: `KelasTable`, `KelasDetailModal`, `SiswaTable`,
  `SiswaDetailModal`, `SiswaImportExport`, `TagihanTable`,
  `keuangan/pendapatan`, `keuangan/pengeluaran`, `keuangan/utang-pegawai`,
  `laporan`, `pengguna`, `pengumuman`, `tahun-ajaran`, `dashboard`. Tiga di
  antaranya (`SiswaImportExport`, `SiswaDetailModal` riwayat tagihan)
  ketauan cuma punya `overflow-y-auto` tanpa scroll horizontal — diganti ke
  `overflow-auto` biar dua arah.

### Diubah (terminologi UI — baru modul Kelas, lihat rencana lanjutan)
- `app/admin/kelas/components/KelasTable.tsx`: label kolom "Nama Kelas" →
  "Nama Jurusan", badge "Tingkat X" → "Kelas X". **Catatan penting**: ini
  cuma ganti teks yang tampil ke user. Nama field di database/Prisma
  (`namaKelas`, `tingkat`) SENGAJA gak diubah — ganti nama kolom database
  butuh migration Prisma dan bakal nyentuh puluhan file API/komponen
  sekaligus (siswa, tagihan, laporan, import/export Excel), resikonya
  gede kalau digas sekaligus. Lihat rencana lanjutan di bawah.

### Diubah (ikon, baru modul Kelas)
- `components/admin/icons.tsx`: nambah 9 ikon SVG baru —
  `IconWarning`, `IconEdit`, `IconEye`, `IconTrash`, `IconPlus`,
  `IconSave`, `IconMoney`, `IconSchool`, `IconCheckCircle` — buat
  gantiin emoji satu-satu di seluruh halaman (lihat rencana lanjutan).
- `app/admin/kelas/components/KelasTable.tsx`: semua emoji (⚠️ 👥 ✏️ 🏫)
  diganti ikon SVG di atas.

### Belum dikerjakan di sesi ini (lihat `RENCANA-LANJUTAN.md`)
- Rename label "Tingkat"/"Nama Kelas" di file lain yang masih nyebut
  istilah lama: `KelasFormTambah`, `KelasEditModal`, `KelasDetailModal`,
  `SiswaFilterBar`, `NaikKelasModal`, `FilterToolbar` (tagihan),
  `laporan/page.tsx`.
- Ganti emoji jadi ikon SVG di 32 file lain yang masih pakai emoji
  (keuangan/*, pengguna, arsip, pengumuman, tahun-ajaran, dashboard,
  settings, siswa portal, invoice, kwitansi).
- Background gradient bermotif (non-repeating) — belum disentuh sama
  sekali.

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
