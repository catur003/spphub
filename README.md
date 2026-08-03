# SPP Hub

Aplikasi manajemen SPP sekolah (Next.js 15 + Prisma/MySQL).

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

## Prasyarat Sistem — Puppeteer / Chromium (fitur Custom Print PDF)

Fitur **Cetak PDF / Custom Print** (laporan SPP, laporan keuangan, invoice,
kwitansi) memakai `puppeteer` untuk membuka halaman internal lewat headless
Chromium dan meng-capture-nya jadi PDF (lihat `lib/generate-pdf.ts`).

Chromium bawaan Puppeteer butuh beberapa shared library sistem yang **tidak**
terpasang secara default di image container minimal (mis. `node:slim`,
image dasar Railway/Docker Debian minimal). Tanpa ini, `puppeteer.launch()`
akan gagal saat server mencoba generate PDF. Install dulu sebelum deploy:

```bash
sudo apt-get update && sudo apt-get install -y \
  libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libasound2 libpango-1.0-0 libcairo2 libnss3 libx11-xcb1 \
  fonts-liberation libxshmfence1 libglib2.0-0
```

Kalau deploy ke Railway/Docker pakai base image Debian (`node:20-slim` dst.),
tambahkan baris di atas ke `Dockerfile` (atau `nixpacks.toml`/apt config)
sebelum langkah `npm install`. Referensi lebih lanjut ada di
`HANDOFF-BUGFIX-OPTIMISASI.md` bagian Tahap 8.

## Environment Variables

Salin `.env.example` ke `.env` dan sesuaikan — **khusus untuk production**,
pastikan `BETTER_AUTH_URL` dan `NEXT_PUBLIC_BETTER_AUTH_URL` diisi domain
publik asli (bukan `http://localhost:3000` bawaan contoh), karena fitur
Custom Print PDF forward cookie sesi ke request internal Puppeteer
berdasarkan origin ini — kalau salah, request internal itu dianggap belum
login dan hasil PDF-nya jadi halaman login.
