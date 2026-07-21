# Handoff — SPP Sekolah Digital (Next.js)

Dokumen ini rangkuman keputusan yang udah disepakati, buat pegangan sebelum
(atau lanjutan) coding — baik buat kamu sendiri kalau lupa konteks, atau buat
sesi/developer lain yang lanjutin.

---

## 1. Stack

| Bagian | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Familiar dari ZenStock.id |
| Database | MySQL | Sudah biasa dipakai |
| ORM | Prisma | Type-safe, migration gampang |
| Auth | Better Auth | Lebih modern dari Auth.js, default aman (hash password, session) |
| UI | Bootstrap 5 murni (npm, bukan react-bootstrap) | Kamu udah nyaman gaya class Bootstrap manual |
| Payment | Midtrans **Snap** (bukan Core API) | Lebih simpel, key disimpan di DB |
| Deploy awal | Railway | Testing dulu sebelum ke VPS |

---

## 2. Role & Akses

| Role | Akses |
|---|---|
| **Owner** | Full akses. Kelola sekolah, petugas, semua data. (Kalau nanti multi-tenant: kelola banyak sekolah) |
| **Petugas** (tata usaha) | CRUD siswa, kelola tagihan, verifikasi bayar manual, export/import, lihat laporan, atur Payment Settings |
| **Siswa** | Login → lihat halaman "Detail Saya" (profil + status tagihan tiap bulan + tombol Bayar) |

Wali kelas / kepala sekolah: **sengaja di-skip** untuk versi ini (bisa nambah nanti kalau kepake).

---

## 3. Alur Utama

### 3.1 Login & Role Routing
- Satu halaman login, Better Auth cek kredensial
- Setelah login, redirect beda tujuan sesuai role:
  - Owner/Petugas → `/admin/dashboard`
  - Siswa → `/siswa/detail-saya`

### 3.2 Siswa bayar SPP
1. Siswa login → buka `/siswa/detail-saya`
2. Halaman itu nampilin: foto profil, data diri, daftar tagihan per bulan
   dengan badge status (Lunas / Belum Lunas / Terlambat)
3. Tombol **"Bayar Sekarang"** cuma muncul di tagihan yang belum lunas
4. Klik tombol → trigger Midtrans Snap popup (pakai Client Key dari DB)
5. Setelah bayar, Midtrans kirim webhook ke server → status tagihan di-update
   otomatis jadi Lunas
6. **Catatan penting**: nggak ada halaman publik/QR. Semua interaksi bayar
   WAJIB lewat sesi login siswa itu sendiri — mencegah orang lain memicu
   pembayaran atas nama siswa lain.

### 3.3 Petugas kelola tagihan
1. Generate tagihan bulanan massal (mirip versi Laravel kemarin — pilih
   bulan/tahun/nominal, sistem buatkan tagihan buat semua siswa aktif,
   skip yang udah ada)
2. Verifikasi manual buat pembayaran non-Midtrans (transfer bank)
3. Lihat riwayat semua transaksi, ada tombol "Lihat Detail Siswa" yang
   nampilin profil + status lunas/belum lengkap (pengganti fitur QR yang
   dihapus)

### 3.4 Payment Settings (disimpan di DB, bukan `.env`)
Mengacu ke pola ZenStock: 1 baris setting (untuk sekarang cuma 1 baris
karena single-tenant), berisi:
- `environment`: `sandbox` | `production`
- `sandboxClientKey`, `sandboxServerKey`
- `productionClientKey`, `productionServerKey`

Service layer baca kolom yang aktif sesuai `environment` saat generate Snap
token. Owner/Petugas bisa ganti dari halaman Settings tanpa perlu redeploy.

### 3.5 Export/Import
- **Import siswa**: upload CSV/Excel dengan template kolom tetap
  (nama, nis, nisn, kelas, dst), sistem validasi baris per baris,
  laporkan baris mana yang gagal + alasannya
- **Export laporan**: rekap tagihan per bulan/kelas ke Excel/CSV

### 3.6 "Semua otomatis, jangan hardcode"
Profil sekolah (nama, logo, alamat, nominal SPP default, dll) disimpan di
1 tabel `SchoolProfile`, dipakai di:
- Header/judul halaman
- Template export/import
- Notifikasi/email (kalau ada)

Jangan taruh nama sekolah atau nominal langsung di kode — selalu tarik dari
tabel ini.

---

## 4. Skema Database (draft, disempurnakan pas mulai coding)

```
SchoolProfile
- id, nama, alamat, logoUrl, nominalSppDefault

User (dipakai Better Auth)
- id, name, email, passwordHash, role (owner | petugas | siswa)

Siswa
- id, userId (nullable, FK -> User), kelasId, nis, nisn,
  namaLengkap, jenisKelamin, tanggalLahir, namaWali, kontakWali,
  fotoUrl, status (aktif|lulus|pindah|nonaktif)

Kelas
- id, namaKelas, tingkat

TahunAjaran
- id, nama, aktif (boolean)

TagihanSpp
- id, siswaId, tahunAjaranId, bulan, tahun, nominal,
  jatuhTempo, status (belum_bayar|menunggu_verifikasi|lunas|terlambat)

Pembayaran
- id, tagihanSppId, siswaId, orderId, jumlah, metode,
  midtransTransactionId, status (pending|success|failed|expired),
  rawResponse (json), paidAt

PaymentSettings
- id, environment, sandboxClientKey, sandboxServerKey,
  productionClientKey, productionServerKey
```

---

## 5. Struktur Folder (rencana)

```
app/
├── (auth)/login/
├── admin/
│   ├── dashboard/
│   ├── siswa/          # CRUD + import/export + tombol "Lihat Detail"
│   ├── tagihan/        # generate massal, verifikasi
│   ├── kelas/
│   ├── laporan/
│   └── settings/       # Payment Settings + Profil Sekolah
├── siswa/
│   └── detail-saya/
├── api/
│   ├── auth/[...all]/  # Better Auth handler
│   ├── midtrans/webhook/
│   └── tagihan/[id]/bayar/
lib/
├── prisma.ts
├── auth.ts
├── midtrans.ts          # baca PaymentSettings dari DB
prisma/
└── schema.prisma
```

---

## 6. Keputusan yang Sudah Fix (jangan diubah tanpa alasan kuat)

- Tidak pakai sistem QR sama sekali
- Tidak ada halaman publik tanpa login — semua di balik autentikasi
- Single-tenant dulu, multi-tenant baru dipikirkan setelah versi ini stabil
- Midtrans Snap saja, bukan Core API
- Bootstrap murni (CSS via npm), bukan react-bootstrap atau Tailwind
- Payment key di DB, bukan `.env`
- Deploy pertama ke Railway, VPS menyusul setelah teruji

## 7. Belum Diputuskan (bahas nanti sebelum bagian itu dikerjakan)

- Notifikasi jatuh tempo: ada atau nggak di versi awal (email/WhatsApp)
- Detail hak akses Petugas: boleh hapus data, atau cuma Owner yang boleh

## 8. Progress Fitur 4-8 (update terbaru)

Semua sudah diimplementasi:

- **#4 Generate massal + verifikasi manual** — sudah ada sejak sebelumnya
  (`app/api/tagihan/generate`, `app/api/tagihan/[id]/verifikasi`,
  `app/admin/tagihan/page.tsx`). Tidak diubah.
- **#5 Detail Saya siswa** — `app/siswa/detail-saya/page.tsx` sekarang nampilin
  profil + daftar tagihan pakai badge status + tombol Bayar Sekarang.
  Data diambil dari endpoint baru `GET /api/siswa/saya` dan
  `GET /api/tagihan/saya` (dibatasi scope siswa yang login sendiri).
- **#6 Midtrans Snap + webhook** — `lib/midtrans.ts` baca
  `PengaturanPembayaran` dari DB dan bikin Snap client sesuai environment
  aktif. `POST /api/tagihan/[id]/bayar` generate Snap token (validasi
  tagihan itu emang punya siswa yang login). `POST /api/midtrans/webhook`
  verifikasi signature key (SHA512) lalu update status `Pembayaran` +
  `TagihanSpp` — idempoten kalau notifikasi dikirim berkali-kali.
  Nambahin `types/midtrans-client.d.ts` karena paket ini gak punya type
  resmi.
- **#7 Import/export Excel** — pakai paket `xlsx` (ditambah ke
  `package.json`, perlu `npm install` ulang). `lib/excel-siswa.ts` +
  `lib/excel-laporan.ts` isinya helper baca/tulis workbook.
  - `GET /api/siswa/template` — download template kosong
  - `POST /api/siswa/import` — upload, validasi baris per baris
    (NIS duplikat & kelas gak ketemu dilaporkan per baris, bukan gagal semua)
  - `GET /api/siswa/export` — export data siswa
  - `GET /api/laporan` (data) & `GET /api/laporan/export` (excel) — rekap
    tagihan per bulan/tahun/kelas, dipakai di `app/admin/laporan/page.tsx`
    yang sebelumnya cuma placeholder.
- **#8 Settings** — `app/admin/settings/page.tsx` sekarang ada 2 tab:
  Payment Settings (baca/tulis `PengaturanPembayaran`, form environment +
  4 key) dan Profil Sekolah (baca/tulis `ProfilSekolah`). API di
  `app/api/settings/payment` (Owner-only) dan `app/api/settings/sekolah`
  (GET buat Owner+Petugas, PUT Owner-only).

### Yang masih perlu dicek pas nyalain beneran
- `npm install` ulang (nambah `xlsx`, `tsx`), lalu `npx prisma generate` &
  `npx prisma migrate dev`.
- **Akun pertama**: nggak ada halaman signup. Isi `SEED_OWNER_EMAIL` /
  `SEED_OWNER_PASSWORD` di `.env`, lalu `npx prisma db seed`
  (`prisma/seed.ts`) — bikin akun Owner pertama + baris default
  `ProfilSekolah`, `PengaturanPembayaran`, dan `TahunAjaran` aktif.
  Aman dijalanin berkali-kali (skip kalau udah ada).
- Isi `PengaturanPembayaran` lewat halaman Settings sebelum coba fitur
  bayar — kalau key kosong, `POST /api/tagihan/[id]/bayar` sengaja
  balikin error yang jelas.
- Setting webhook URL di Dashboard Midtrans (`Settings > Configuration`)
  ke `https://domain-kamu/api/midtrans/webhook`.
- Belum ada testing end-to-end (nggak ada akses network di sesi ini buat
  `npm install` + jalanin dev server) — sebaiknya di-review sekali lagi
  pas jalan beneran.
