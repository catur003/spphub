# Changelog — SPP Hub

## [Bugfix Minor] Pagination off-by-one + duplikasi, laporan tanpa batas, efek samping sync nominal, webhook refund, urutan expiry sesi bayar

⚠️ Belum dicompile di sesi ini (sandbox tanpa network/`node_modules`).
**`npm run build` dulu** sebelum deploy.

### 9. Tombol halaman aktif bisa hilang dari pagination

- **Bug**: rumus jendela nomor halaman (`pageNum = totalPages - 4 + i`)
  menghasilkan nomor `<= 0` waktu `totalPages < 5`, dan nomor itu dibuang oleh
  guard `pageNum < 1`. Konkretnya: kalau `totalPages = 4` dan user ada di
  halaman 4, tombol yang kerender cuma **1-2-3** — tombol halaman aktifnya
  sendiri gak ikut muncul.
- **Fix**: titik awal jendela sekarang dihitung sekali dan di-clamp dua sisi
  (`Math.min(Math.max(1, currentPage - 2), Math.max(1, totalPages - n + 1))`),
  jadi jendelanya selalu berisi tepat `min(5, totalPages)` nomor yang valid.

### 10. Blok pagination diduplikasi di 3 tabel

- **Bug**: `components/admin/Pagination.tsx` sudah ada, tapi `SiswaTable`,
  `TagihanTable` (SPP), dan `TagihanTable` (Tagihan Lainnya) masing-masing
  menyalin ulang blok pagination-nya sendiri — 4 salinan logika yang sama,
  jadi bug #9 di atas harus diperbaiki di 4 tempat dan gampang kelewat satu.
- **Fix**: ketiga tabel sekarang memakai komponen bersama. Ikut hilang ~70
  baris JSX duplikat per file.
- **Bonus**: ditambahkan pengaman `currentPage > totalPages → setCurrentPage(totalPages)`
  di halaman Siswa, Tagihan, Tagihan Lainnya, dan Laporan. Sebelumnya kalau
  jumlah halaman menyusut (data kehapus / filter dipersempit), `currentPage`
  bisa nyangkut di angka yang sudah gak ada dan tabelnya kosong melompong
  padahal datanya ada di halaman sebelumnya.

### 11. `GET /api/laporan` menarik seluruh tabel tanpa batas

- **Bug**: `findMany` tanpa `take`, dengan `include` siswa + kelas +
  pembayaran. Sekolah 300 siswa × 12 bulan = 3.600 row relasional dalam satu
  respons JSON, dan seluruhnya di-`reduce` di memori cuma buat dapat angka
  ringkasan.
- **Fix**:
  - Angka ringkasan sekarang dihitung di DB lewat `groupBy(["status"])` —
    hasilnya tetap akurat untuk **seluruh** data yang cocok filter, dan gak
    perlu narik row-nya ke memori.
  - Daftar detail dibatasi 2.000 baris (`MAKS_BARIS_LAPORAN`), dengan flag
    `terpotong` di respons.
  - `app/admin/laporan/page.tsx` menampilkan banner peringatan kalau
    terpotong, supaya user gak mengira tabel & Export CSV-nya sudah lengkap.
    Kartu ringkasan tetap menampilkan total penuh.

### 12. Generate tagihan diam-diam menulis ulang nominal periode lain

- **Bug**: `/api/tagihan/generate` memanggil
  `syncNominalKosong(defaultNominal)`, di mana `defaultNominal` =
  `Number(nominal) || profil.nominalSppDefault`. Artinya nominal sekali-pakai
  yang diketik admin untuk generate bulan ini ikut dipakai buat nulis ulang
  **semua** tagihan Rp 0 yang belum lunas di seluruh periode. Generate Juni
  dengan nominal Rp 500.000 diam-diam mengubah tagihan Rp 0 milik Januari,
  Februari, dst jadi Rp 500.000 juga — tanpa jejak apa pun di UI.
- **Fix**: fallback sync sekarang selalu `profil?.nominalSppDefault`, bukan
  nilai ad-hoc dari form generate. Nominal ketikan admin tetap dipakai untuk
  tagihan periode yang memang sedang di-generate.

### 13. Webhook Midtrans: refund ditelan, status asing jadi "pending"

- **Bug**:
  - `transaction_status` di luar daftar yang dikenal (mis. `authorize`, atau
    status baru yang ditambah Midtrans nanti) jatuh ke nilai awal `"pending"`
    — diam-diam menurunkan status pembayaran dan me-null-kan `paidAt`.
  - `refund` / `chargeback` gak ditangani sama sekali. Karena pembayarannya
    sudah `success`, guard idempoten langsung `return` — jadi uang yang
    dikembalikan gak meninggalkan jejak apa pun, sementara tagihannya tetap
    tertandai **LUNAS**.
- **Fix**:
  - `refund`, `partial_refund`, `chargeback`, `partial_chargeback` dicegat
    lebih awal dan di-`console.error` dengan pesan eksplisit "perlu tinjauan
    manual" berikut order ID-nya. (Schema `Pembayaran` belum punya state
    refund — ini sengaja jadi jejak log dulu, bukan perubahan skema.)
  - Status yang gak dikenal sekarang di-`console.warn` dan **diabaikan**
    (record gak disentuh sama sekali), bukan lagi didefault ke `pending`.

### 14. Sesi bayar valid ikut mati kalau Midtrans error

- **Bug**: di `/api/tagihan/[id]/bayar` dan `/api/tagihan-lain/[id]/bayar`,
  `updateMany` yang menandai pending lama sebagai `expired` dijalankan
  **sebelum** `snap.createTransaction()`. Kalau Midtrans gagal (timeout, key
  salah, rate limit), sesi bayar lama yang sebenarnya masih valid sudah
  terlanjur dimatikan di DB — siswa kehilangan sesinya cuma-cuma dan DB jadi
  gak sinkron dengan Midtrans.
- **Fix**: penandaan `expired` dipindah ke **setelah** Midtrans
  mengonfirmasi, dan digabung dengan `create` record baru dalam satu
  `prisma.$transaction([...])`.

### 15. `/api/siswa/template` terbuka tanpa login

- **Bug**: satu-satunya route `/api/siswa/*` yang gak punya pengecekan sesi.
- **Fix**: ditambahkan `requireApiRole(["owner", "petugas"])`. Isinya memang
  "cuma" template kosong, tapi tetap membocorkan struktur data internal dan
  gak ada alasan endpoint ini perlu bisa diakses publik.

### Catatan: `siswaIds` di `/api/siswa/naik-kelas`

Setelah dibaca ulang, ini **bukan bug**. `NaikKelasModal` memang gak pernah
punya UI pemilihan per-siswa, dan teks konfirmasinya konsisten bilang "seluruh
siswa aktif". Parameter `siswaIds` di API cuma opsional dan belum terpakai —
dibiarkan apa adanya karena berguna kalau nanti mau ditambah pemilihan
per-siswa. Menambahkan UI-nya sekarang itu fitur baru, bukan perbaikan bug.

### Catatan test

1. Filter data siswa sampai `totalPages` tepat 4, buka halaman 4 → tombol "4"
   harus muncul dan tersorot.
2. Di halaman 5, persempit filter sampai tinggal 1 halaman → tabel harus
   langsung menampilkan data, bukan kosong.
3. Buka Laporan tanpa filter di DB besar → banner peringatan muncul, tapi
   kartu ringkasan tetap menampilkan total penuh.
4. Generate tagihan bulan baru dengan nominal ketikan berbeda → cek tagihan
   Rp 0 di bulan-bulan lain **tidak** ikut berubah.
5. Akses `/api/siswa/template` tanpa login → 401.

---

## [Bugfix Sedang] Kegagalan dekrip senyap, akun yatim, NISN duplikat ketelan, upload tanpa validasi

⚠️ Belum dicompile di sesi ini (sandbox tanpa network/`node_modules`).
Diverifikasi lewat pembacaan kode + cek brace balance. **`npm run build` dulu**
sebelum deploy.

### 4. `decrypt()` gagal senyap → semua webhook Midtrans ditolak tanpa jejak

- **Bug**: `lib/crypto.ts` — kalau gagal dekrip (ENCRYPTION_KEY hilang/berubah,
  mis. kececer waktu redeploy Railway), `decrypt()` mengembalikan ciphertext
  mentah `"enc:..."` apa adanya. Server key Midtrans jadi string sampah, dan:
  - `verifySignature()` SELALU false → **semua webhook Midtrans dibalas 403**
    → tagihan yang sudah dibayar tidak pernah jadi lunas, tanpa satu pun log
    atau pesan error yang menjelaskan kenapa.
  - Snap/CoreApi client dibangun dengan key sampah → 401 dari Midtrans, tapi
    pesan yang muncul ke admin tetap "Payment Settings belum diisi lengkap",
    yang menyesatkan karena key-nya sebenarnya ADA di DB.
- **Fix**:
  - `lib/crypto.ts` — `decrypt()` sekarang balikin `null` + `console.error`
    yang eksplisit kalau gagal (termasuk kalau ada data terenkripsi tapi
    ENCRYPTION_KEY belum diset sama sekali). Ditambah helper `terenkripsi()`
    biar pemanggil bisa bedain "belum diisi" vs "gagal didekrip".
  - `lib/midtrans.ts` — `getActiveKeys()` balikin flag `serverKeyRusak`, dan
    `getSnapClient()` / `getCoreApiClient()` / `verifySignature()` pakai pesan
    yang beda buat dua kasus itu. `verifySignature()` juga nge-log alasan
    penolakan, jadi gejala "webhook 403 terus" ada jejaknya di log.
  - Route yang decrypt langsung (`/api/tagihan/[id]/cek-status`,
    `/api/tagihan-lain/[id]/cek-status`, `/api/settings/payment`) sudah handle
    `null` dengan benar, tidak perlu diubah.

### 5. Akun + kredensial yatim kalau `siswa.create` gagal

- **Bug**: `POST /api/siswa` bikin `Akun` + `Kredensial` di dalam satu
  `$transaction`, lalu manggil `prisma.siswa.create()` **di luar** transaksi
  itu. Kalau siswa.create gagal (kelasId FK invalid, NIS/NISN bentrok,
  tanggalLahir invalid), akun & kredensialnya nyangkut permanen — emailnya
  keburu "kepakai" padahal gak ada siswa yang megang, dan admin gak bisa pakai
  email itu lagi tanpa masuk ke DB manual.
- **Fix**: akun + kredensial + siswa sekarang dibungkus dalam SATU
  `prisma.$transaction`. Kalau ada yang gagal, semuanya di-rollback.
  Ditambah penanganan `P2002` yang menerjemahkan unique constraint jadi pesan
  Indonesia yang bisa dibaca ("NIS/NISN/Email sudah dipakai"), bukan error 500
  "Unique constraint failed" mentah.

### 6. NISN duplikat = data hilang diam-diam waktu import

- **Bug**: kolom `nisn` itu `@unique` di schema, tapi `/api/siswa/import` cuma
  ngecek duplikat NIS. Baris dengan NISN duplikat ditelan diam-diam oleh
  `createMany({ skipDuplicates: true })`, **tapi kode tetap menandai seluruh
  chunk sebagai "berhasil"** — user diberi tahu 500 siswa keimport padahal
  sebagiannya gak pernah masuk DB.
- **Fix**:
  - Pass 1 sekarang juga ngecek duplikat NISN (terhadap DB maupun sesama baris
    di file yang sama), dengan pesan gagal per-baris yang jelas.
  - Sesudah tiap `createMany`, NIS yang beneran tersimpan dibaca balik dari DB
    (1 query per chunk) dan status per baris ditentukan dari situ — jadi
    laporan "berhasil/gagal" ke user selalu jujur, apa pun yang di-skip MySQL.
  - `POST /api/siswa` & `PUT /api/siswa/[id]` juga ikut validasi NISN unik
    sebelum insert/update, plus normalisasi NISN kosong jadi `null` (bukan
    `""`) — MySQL cuma ngizinin duplikat kalau nilainya NULL.

### 7. `/api/upload` nerima file apa pun, tanpa batas ukuran

- **Bug**: route ini nerima Blob apa pun tanpa cek MIME atau ukuran. Kalau ENV
  Cloudinary belum diisi, fallback-nya nyimpen **data URL base64 langsung ke
  kolom `fotoUrl` (`@db.LongText`)** — upload 5 MB jadi ~6,7 MB string di DB,
  dan kolom itu ikut kekirim di SETIAP `GET /api/siswa`.
- **Fix**:
  - Whitelist MIME (`image/jpeg|png|webp|gif`) + batas 2 MB untuk jalur
    Cloudinary, dan batas jauh lebih ketat (400 KB) khusus untuk fallback
    base64, dengan pesan yang ngarahin admin buat ngisi ENV Cloudinary.
  - `app/admin/siswa/types.ts` — `uploadFotoFile()` nolak file non-gambar di
    client duluan. Sebelumnya file non-gambar bikin `kompresGambar()`
    menggantung selamanya (`<img>.onload` gak pernah fire buat file yang bukan
    gambar), jadi spinner "Mengunggah..." muter tanpa ujung dan request-nya
    gak pernah nyampe server.

### 8. Email tidak dinormalisasi konsisten

- **Bug**: di `PUT /api/siswa/[id]`, jalur ganti email ngecek duplikat pakai
  `body.emailBaru` mentah dan menyimpannya mentah juga, sementara jalur bikin
  akun baru menyimpan versi `.trim().toLowerCase()`. Hasilnya data email
  campur case dan pengecekan duplikat bisa meleset.
- **Fix**: email dinormalisasi SEKALI di awal (`trim().toLowerCase()`) lalu
  nilai yang sama itu dipakai baik untuk cek duplikat maupun untuk disimpan —
  di `POST /api/siswa`, jalur "buat akun" pada PUT, dan jalur "ganti email"
  pada PUT. Validasi password minimal 8 karakter juga ditambahkan ke
  `POST /api/siswa` (sebelumnya cuma ada di PUT).

### Catatan test

1. Hapus/ubah `ENCRYPTION_KEY` sementara → buka Settings Payment: field Server
   Key harus kosong (bukan berisi `enc:...`), dan log server harus muncul
   peringatan dekrip. Kembalikan key → semuanya normal lagi.
2. Tambah siswa dengan `kelasId` ngawur + centang "buat akun" → cek tabel
   `akun`: tidak boleh ada akun baru yang nyangkut.
3. Import file berisi dua baris dengan NISN sama → baris kedua harus muncul di
   daftar gagal, bukan dihitung berhasil.
4. Upload file .pdf / .txt sebagai foto → ditolak di client dengan pesan jelas,
   spinner tidak menggantung.
5. Tambah siswa dengan NISN yang sudah dipakai → pesan "NISN sudah dipakai
   siswa lain", bukan 500.

---

## [Bugfix Kritis] Pelunasan manual tanpa row Pembayaran, TS strict null di requireApiRole, kop surat invoice kosong buat siswa

⚠️ Belum pernah dicompile di sesi ini (sandbox tanpa network/`node_modules`).
Diverifikasi lewat pembacaan kode + cek brace balance. **Jalanin `npm install`
lalu `npm run build` duluan** sebelum deploy.

### 1. Tombol "Tandai LUNAS" SPP gak pernah bikin row `Pembayaran`

- **Bug**: `handleVerifikasi()` di `app/admin/tagihan/page.tsx` nembak
  `PATCH /api/tagihan/[id]` `{ status: "lunas" }` — cuma ganti kolom status
  `TagihanSpp`, gak bikin row `Pembayaran` sama sekali. Endpoint
  `POST /api/tagihan/[id]/verifikasi` yang justru bikin `Pembayaran` +
  update status dalam satu transaksi ternyata **dead code, gak dipanggil dari
  mana-mana**. Sisi Tagihan Lainnya (`app/admin/tagihan-lainnya/page.tsx`)
  udah bener pakai `/verifikasi` sejak awal — cuma sisi SPP yang nyeleweng.
  Akibatnya semua pembayaran tunai/manual:
  - **Hilang dari grafik tren 6 bulan di dashboard** — `app/api/dashboard`
    baca `prisma.pembayaran` `status: "success"`, jadi cuma transaksi
    Midtrans yang kehitung.
  - **Bikin halaman `/kwitansi/[id]` kosong** — halaman itu include
    `pembayaran: { where: { status: "success" } }`, yang untuk tagihan lunas
    tunai selalu array kosong.
  - Bikin sumber kebenaran "siswa ini pernah bayar apa belum" jadi dua
    (kolom status vs tabel Pembayaran) — ini juga akar masalah kenapa
    proteksi hapus siswa kemarin harus ditulis ulang.
- **Fix**:
  - `app/admin/tagihan/page.tsx` — `handleVerifikasi()` sekarang
    `POST /api/tagihan/${id}/verifikasi` dengan body `{ metode: "tunai" }`.
  - `app/api/tagihan/[id]/route.ts` (PATCH) — **nolak** `status: "lunas"`
    dengan 400 + pesan yang ngarahin ke `/verifikasi`, biar gak ada lagi
    jalur belakang yang melunaskan tagihan tanpa jejak pembayaran. Status
    lain (`belum_bayar`, `terlambat`, `menunggu_verifikasi`) tetap boleh
    lewat PATCH seperti biasa.
  - `app/api/tagihan/[id]/verifikasi/route.ts` — dirapikan: `req.json()`
    dikasih `.catch()` (request tanpa body gak lagi jadi 500), `metode`
    divalidasi terhadap whitelist (`tunai` / `transfer_bank`, default
    `tunai`), tagihan bernominal Rp 0 ditolak biar laporan keuangan gak
    nyatet pemasukan Rp 0, plus error handling + logging yang konsisten
    sama route lain.

### 2. `requireApiRole()` bikin `next build` gagal (TS strict)

- **Bug**: branch sukses `HasilCekPeran` di `lib/api-auth.ts` diketik
  `Awaited<ReturnType<typeof auth.api.getSession>>` — tipe itu **masih
  mengandung `null`**. Narrowing lewat `if (error) return error;` cuma
  menghapus branch gagal, bukan `null` di dalam branch sukses. Jadi setiap
  pemakaian `session.user.*` sesudahnya kena
  `'session' is possibly 'null'` di `strict: true`:
  `app/api/pendapatan/route.ts:55`, `app/api/pengeluaran/route.ts:54`,
  `app/api/users/[id]/route.ts:34` & `:95`.
- **Fix**: tambah type alias `SesiTervalidasi =
  NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>` dan pakai itu
  di branch sukses. Satu perubahan tipe, keempat call-site di atas ikut
  beres tanpa disentuh.

### 3. Halaman invoice nembak endpoint admin-only → kop surat kosong buat siswa

- **Bug**: `app/invoice/[id]/page.tsx` & `app/invoice-lain/[id]/page.tsx`
  fetch `/api/settings/sekolah`, padahal GET-nya dijaga
  `requireApiRole(["owner","petugas"])`. Dua halaman itu boleh dibuka siswa
  (otorisasinya per-tagihan, udah bener), jadi siswa selalu dapat 401 di
  situ dan **nama/alamat/WA bendahara di kop surat kosong** — kebawa juga ke
  PDF karena Puppeteer forward cookie siswa. `app/siswa/page.tsx` udah pakai
  endpoint publik, cuma dua file ini yang ketinggalan.
- **Fix**: dua-duanya diarahkan ke `/api/settings/sekolah-public`, yang
  memang dibikin buat ini dan cuma ngeluarin `nama`, `alamat`, `logoUrl`,
  `noHpBendahara` (field sensitif kayak `fonnteToken` gak ikut kebawa).

### Catatan test

1. Tandai satu tagihan SPP lunas lewat tombol admin → cek tabel `pembayaran`
   ada row baru `metode: "tunai"`, `status: success`, `paidAt` keisi.
2. Buka `/kwitansi/[id]` tagihan tsb → data pembayaran harus muncul.
3. Cek dashboard: nominal itu harus ikut nongol di grafik tren bulan ini.
4. Login sebagai siswa → buka invoice-nya → kop surat harus keisi, dan
   tombol Download PDF hasilnya juga.
5. `npm run build` harus lolos tanpa error `possibly 'null'`.

---

Catatan perubahan dari sesi audit + bugfix + migrasi Tailwind. Urutan dari
yang paling baru.

---

## [Bugfix] Proteksi hapus siswa bolong untuk tagihan lunas manual/tunai + Tagihan Lainnya

⚠️ Belum pernah dicompile/dites di sesi ini juga.

- **Bug**: `DELETE /api/siswa/[id]` cuma ngecek tabel `Pembayaran` (status
  `success`) buat nentuin siswa punya riwayat lunas atau enggak. Tagihan
  yang ditandai LUNAS manual (tombol "Tandai LUNAS (pembayaran tunai
  manual)") cuma `PATCH status: "lunas"` ke `TagihanSpp`, **gak pernah**
  bikin row di `Pembayaran` — jadi siswa (aktif ATAU nonaktif) yang semua
  tagihannya lunas tunai lolos hapus tanpa proteksi/warning sama sekali,
  riwayat tagihannya ikut kehapus permanen lewat cascade delete. Tabel
  `PembayaranLain` (Tagihan Lainnya) juga gak pernah dicek.
- **Fix**: proteksi sekarang cek status `TagihanSpp.status === "lunas"` +
  `TagihanLain.status === "lunas"` langsung (sumber kebenaran tunggal,
  konsisten dipakai baik oleh PATCH manual maupun webhook Midtrans) —
  bukan tabel Pembayaran lagi. Siswa **aktif** dengan riwayat lunas
  SELALU ditolak hapus (gak ada bypass). Siswa **nonaktif/lulus/pindah**
  boleh dihapus tapi wajib konfirmasi eksplisit (modal ketik "HAPUS",
  reuse `ConfirmHapusLunasModal` yang sama polanya kayak hapus tagihan
  massal). `app/api/siswa/[id]/route.ts` (DELETE, terima
  `confirmHapusLunas` di body, balikin `butuhKonfirmasi`/`jumlahLunas`/
  `totalNominal` di response 409 kalau perlu konfirmasi) &
  `app/admin/siswa/page.tsx` (`eksekusiHapusSiswa`, render
  `ConfirmHapusLunasModal`).

## [Bugfix] Alert native diganti modal popup

- `app/invoice/[id]/page.tsx` & `app/kwitansi/[id]/KwitansiClient.tsx`:
  `alert()` bawaan browser (pesan gagal download PDF) diganti
  `alertMsg()` dari `useConfirmModal()` (`components/admin/ConfirmModal.tsx`)
  — pola yang sama udah dipakai di semua halaman admin, cuma 2 file ini
  yang ketinggalan.

---

## [Tahap 8] Custom Print PDF — generate di server (Opsi B), bukan screenshot

⚠️ Belum pernah dicompile/dites jalan beneran (sandbox kerja gak ada akses
`npm install`/network). Semua perubahan diverifikasi lewat pembacaan kode +
cek kurung/brace balance manual. **WAJIB `npm install` dulu** (nambah
dependency `puppeteer`, cabut `html2pdf.js`) sebelum `npm run build`.

- **Infrastruktur baru**: `lib/generate-pdf.ts` (Puppeteer/headless Chrome
  — buka ulang halaman internal apa adanya lalu `page.pdf()`, WYSIWYG murni
  karena preview & PDF dirender dari HTML/CSS yang sama persis, bukan
  library PDF generator terpisah). Ukuran kertas & orientasi (A4
  portrait/landscape) diatur lewat CSS `@page` di masing-masing halaman
  (`preferCSSPageSize: true`), bukan hardcode di kode. `lib/request-
  context.ts` & `lib/server-fetch.ts` — forward cookie sesi Better Auth ke
  Puppeteer/fetch internal biar halaman yang di-capture tetap ke-otorisasi.
- **Kwitansi & Invoice** (`/kwitansi/[id]`, `/invoice/[id]`): tombol
  Download PDF diganti total dari `html2pdf.js` (screenshot html2canvas,
  ini yang bikin "kayak screenshot halaman") jadi fetch ke
  `/api/pdf/kwitansi/[id]` & `/api/pdf/invoice/[id]` (Puppeteer capture
  halaman itu sendiri, PDF vector asli). Invoice sekarang punya 2 tombol
  terpisah (dulu digabung "Cetak/Download" yang cuma window.print()): Cetak
  Printer & Download PDF beneran. Keduanya dikasih `@page { size: A4
  portrait }` eksplisit. `html2pdf.js` + `types/html2pdf.d.ts` dihapus dari
  project.
- **Laporan SPP & Laporan Keuangan** (admin): dibuat rute dokumen terpisah
  **`/cetak/laporan-spp`** & **`/cetak/laporan-keuangan`** — sengaja di
  luar `app/admin/layout.tsx` (gak ikut sidebar/topbar admin ke-print,
  masalah lama yang bikin hasil print "kotor"). Fitur: kop surat sekolah
  (logo+nama+alamat, `components/cetak/KopSurat.tsx`), toggle Portrait/
  Landscape (`@page` CSS ganti sesuai query param `?orientation=`), tombol
  Cetak Printer (`components/cetak/PrintButton.tsx`) & Download PDF. Tabel
  laporan dikasih `thead{display:table-header-group}` + `tr{break-inside:
  avoid}` biar rapi kalau kepotong halaman. API: `app/api/pdf/laporan-spp`
  & `app/api/pdf/laporan-keuangan` (capture rute `/cetak/...` di atas).
  Tombol "Cetak PDF"/"Cetak Laporan Keuangan" di halaman admin lama diganti
  jadi buka tab baru ke rute `/cetak/...` (bukan `window.print()` di
  halaman admin yang ada sidebar-nya lagi). Header print lama yang gak
  kepakai lagi di `app/admin/laporan/page.tsx` (`hidden print:block`
  block) dihapus.
- **`next.config.mjs`**: tambah `serverExternalPackages: ["puppeteer"]`
  biar Next.js gak coba bundle native module/binary Chromium-nya.
- **Catatan deploy Railway**: `puppeteer` (bukan `puppeteer-core`) dipilih
  karena Railway container persisten (bukan serverless kayak Lambda), jadi
  Chromium bundled-nya bisa diinstall normal — TAPI perlu dicek base image
  Railway punya library sistem yang Chromium butuhin (kemungkinan perlu
  nixpacks config tambahan / Dockerfile custom). Kalau Chromium susah
  jalan di Railway, alternatif: `puppeteer-core` + `@sparticuz/chromium`.


## [Penyesuaian] Preset jadi rentang tanggal, card list, format tanggal baru, filter by preset, siswa page digabung

⚠️ Belum di-`prisma db push` ulang (schema berubah lagi), belum pernah
dicompile. Detail lengkap ada di bagian 0b `HANDOFF-BUGFIX-OPTIMISASI.md`.

- **Schema**: `JatuhTempoPreset.tanggal` → `tanggalAwal` + `tanggalAkhir`.
- **Kelola Jatuh Tempo**: form 2 tanggal (awal-akhir), list preset jadi
  card grid (bukan chip flex-wrap lagi).
- **Generate Tagihan (SPP & Lainnya)**: dropdown preset controlled (teks
  ikut berubah pas dipilih — sebelumnya bug selalu balik ke placeholder),
  field tanggal jadi read-only nunjukin rentang awal-akhir setelah preset
  dipilih (fallback ke manual kalau belum ada preset).
- **Format tanggal baru** `formatTanggalPanjang()` (contoh: `12-Juli-2026`)
  dipakai konsisten di: kartu preset, dropdown+readonly Generate, kolom
  Tempo TagihanTable (SPP & Lainnya), tabel Laporan Tagihan Lainnya,
  section Tagihan Lainnya di portal siswa.
- **Filter Data Tagihan (SPP)**: filter rentang tanggal manual diganti
  dropdown pilih preset jatuh tempo.
- **Portal Siswa**: route terpisah `/siswa/tagihan-lain` dihapus, kontennya
  (card list) sekarang nempel di bawah daftar Tagihan SPP di halaman
  utama siswa (`app/siswa/components/TagihanLainSection.tsx`), dikasih
  pemisah gap. Tombol navbar terpisah juga dihapus.

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
