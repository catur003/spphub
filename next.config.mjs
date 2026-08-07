/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sebelumnya typescript.ignoreBuildErrors & eslint.ignoreDuringBuilds
  // sama-sama true — build selalu "sukses" walau ada error tipe/lint asli
  // (ini yang bikin banyak bug kompilasi di proyek ini gak pernah ketahuan
  // sampai di-audit manual). Dimatikan sesuai permintaan biar build gagal
  // dengan jelas kalau memang ada error, bukan lolos diam-diam ke deploy.
  //
  // CATATAN buat testing lokal: `next build` butuh Prisma Client yang
  // sudah di-generate (`npx prisma generate`) DAN paket `puppeteer` yang
  // Chromium binary-nya udah kedownload (`npx puppeteer browsers install
  // chrome` kalau postinstall sempat di-skip) supaya type-check-nya bisa
  // baca tipe model Prisma & tipe puppeteer dengan benar. Tanpa itu, error
  // yang muncul saat build bisa jadi false-positive (module belum ada),
  // bukan bug asli di kode.
  serverExternalPackages: ["puppeteer"],
};

export default nextConfig;
