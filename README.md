# SPP Hub

Aplikasi web manajemen SPP & keuangan sekolah — data siswa, penagihan SPP
per bulan, tagihan lain-lain (seragam, daftar ulang, dst.), pembayaran
online lewat Midtrans, laporan keuangan, sampai cetak PDF (kwitansi,
invoice, laporan) yang bisa langsung di-download.

## Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS**
- **Prisma** + **MySQL**
- **Better Auth** — autentikasi & sesi (role: `owner`, `petugas`, `siswa`)
- **Midtrans** — payment gateway (Sandbox/Production)
- **Puppeteer** — generate PDF server-side (kwitansi, invoice, laporan)
- **Cloudinary** (opsional) — upload foto siswa
- **Recharts** — grafik dashboard
- **xlsx** — import/export data siswa & laporan lewat Excel

## Fitur Utama

**Modul Siswa & Kelas**
- CRUD data siswa (termasuk pembuatan akun login siswa)
- Import/export data siswa via Excel
- Manajemen kelas & tahun ajaran

**Modul SPP**
- Generate tagihan SPP massal per bulan/kelas
- Preset jatuh tempo
- Pembayaran manual (petugas) & online via Midtrans (webhook otomatis update status)
- Riwayat & filter pembayaran

**Tagihan Lainnya**
- Master jenis tagihan custom (seragam, daftar ulang, dll — tabel terpisah dari SPP)
- Generate, verifikasi, dan pembayaran (manual + Midtrans) untuk tagihan jenis ini

**Keuangan**
- Pendapatan lain-lain & pengeluaran
- Utang/kasbon pegawai
- Ringkasan saldo kas & laba/rugi di dashboard

**Cetak & Laporan (PDF)**
- Kwitansi & invoice per transaksi
- Laporan SPP & laporan keuangan dengan filter (bulan/tahun/kelas/status)
- Custom Print: preview di layar, cetak lewat browser (`window.print()`),
  atau **download PDF asli** hasil generate server-side (Puppeteer),
  pilihan orientasi Portrait/Landscape

**Lainnya**
- Portal siswa (lihat tagihan sendiri, bayar online)
- Pengumuman
- Arsip data
- Pengaturan payment gateway (Sandbox/Production Midtrans)

## Setup Lokal

```bash
npm install
cp .env.example .env   # isi sesuai environment kamu, lihat bagian di bawah
npx prisma db push     # sinkronkan schema ke database
npm run db:seed        # buat akun owner pertama
npm run dev
```

## Environment Variables

Isi `.env` (contoh ada di `.env.example`):

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string MySQL |
| `BETTER_AUTH_SECRET` | Random string panjang buat signing sesi |
| `BETTER_AUTH_URL` | Domain publik app (**wajib domain asli** di production, bukan `localhost` — dipakai juga buat validasi origin & forward cookie sesi ke fitur Custom Print PDF) |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Sama seperti di atas, versi client-side |
| `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` / `SEED_OWNER_NAME` | Akun owner pertama yang dibuat `npm run db:seed` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` / `CLOUDINARY_UPLOAD_PRESET` | Opsional, buat upload foto siswa |

Payment gateway Midtrans (Sandbox/Production key) diatur langsung dari
halaman **Settings > Payment Gateway** di aplikasi, bukan lewat `.env`.

## Deploy — Prasyarat Sistem Puppeteer/Chromium

Fitur **Custom Print PDF** (kwitansi, invoice, laporan SPP, laporan
keuangan) pakai `puppeteer` untuk membuka halaman internal lewat headless
Chromium dan meng-capture-nya jadi PDF asli (lihat `lib/generate-pdf.ts`) —
bukan library PDF generator terpisah, jadi preview di layar dan hasil PDF
dijamin identik (WYSIWYG).

Chromium bawaan Puppeteer butuh beberapa shared library sistem yang
**tidak** terpasang default di image container minimal (mis. `node:slim`,
base image Railway/Docker Debian minimal). Tanpa ini, generate PDF akan
gagal. Install sebelum/saat build:

```bash
sudo apt-get update && sudo apt-get install -y \
  libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libasound2 libpango-1.0-0 libcairo2 libnss3 libx11-xcb1 \
  fonts-liberation libxshmfence1 libglib2.0-0
```

Kalau deploy pakai Dockerfile/nixpacks custom, tambahkan baris di atas
sebelum step `npm install`.

Beberapa catatan penting soal fitur ini:
- Tiap request generate PDF jalan di **browser context Puppeteer yang
  terisolasi** (bukan dibagi antar-request) — supaya cookie sesi satu
  request gak nyasar/bentrok ke request lain.
- Kalau suatu saat download PDF malah berisi halaman login, cek log
  `[generatePdfFromPath]` di server — itu nampilin nama-nama cookie yang
  berhasil di-forward buat bantu diagnosa (bukan isinya, aman di-log).

## Struktur Folder Singkat

- `app/admin/*` — panel admin (owner/petugas)
- `app/siswa/*` — portal siswa
- `app/cetak/*` — halaman dokumen A4 bersih (sumber Custom Print PDF)
- `app/api/*` — semua route API (termasuk webhook Midtrans, generate PDF)
- `lib/*` — util inti: auth, prisma client, generate PDF, dll.
- `prisma/schema.prisma` — skema database lengkap
