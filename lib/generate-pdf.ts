import puppeteer, { Browser } from "puppeteer";

/**
 * Tahap 8 — Custom Print (Opsi B).
 *
 * Prinsip WYSIWYG: PDF di-generate dengan cara Puppeteer (headless Chrome)
 * BENERAN membuka halaman internal yang sama yang dilihat user di browser
 * (misal /kwitansi/abc123 atau /cetak/laporan-spp?...), lalu ambil
 * `page.pdf()`. Ini BUKAN library PDF generator terpisah (reportlab/pdfkit
 * dkk) yang perlu desain ulang layout — jadi preview di layar dan hasil PDF
 * dijamin identik karena keduanya dirender dari HTML/CSS yang sama persis.
 *
 * Ukuran kertas & orientasi (A4 portrait/landscape) diatur lewat CSS
 * `@page` di masing-masing halaman yang di-print (bukan di-hardcode di
 * sini) — puppeteer.pdf() dipanggil dengan `preferCSSPageSize: true` biar
 * `@page` di CSS itu yang jadi sumber kebenaran tunggal.
 *
 * Elemen yang gak boleh ikut ke-print (tombol aksi, sidebar, dst) cukup
 * dikasih class Tailwind `print:hidden` seperti yang udah dipakai di
 * seluruh codebase ini — page.pdf() secara default merender pakai CSS
 * media type "print", jadi otomatis konsisten sama window.print() browser.
 *
 * CATATAN DEPLOY (Railway): package `puppeteer` (bukan puppeteer-core)
 * dipakai karena Railway itu container yang persisten (bukan serverless
 * function macam AWS Lambda), jadi Chromium yang di-bundle puppeteer bisa
 * diinstall normal lewat `npm install` — TAPI perlu pastikan base image
 * container-nya punya library sistem yang dibutuhkan Chromium (biasanya
 * perlu nixpacks config tambahan atau Dockerfile custom, lihat
 * HANDOFF-BUGFIX-OPTIMISASI.md bagian Tahap 8 buat catatan ini). Kalau
 * ternyata Railway bermasalah jalanin Chromium, alternatif paling gampang
 * adalah ganti ke `puppeteer-core` + `@sparticuz/chromium` (lebih ringan,
 * biasa dipakai di lingkungan serverless-like).
 */

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        // --no-sandbox wajib di kebanyakan lingkungan container (Docker/Railway)
        // karena sandbox Chromium butuh setuid helper yang biasanya gak ada di
        // container biasa.
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
      .catch((err) => {
        // Reset promise biar request berikutnya coba launch ulang, bukan
        // stuck selamanya nunggu promise yang udah gagal.
        browserPromise = null;
        throw err;
      });
  }
  return browserPromise;
}

export type GeneratePdfOptions = {
  /** Origin lengkap, misal "https://spphub.contoh.sch.id" atau "http://localhost:3000" */
  origin: string;
  /** Path internal yang mau di-capture, misal "/kwitansi/abc123" (harus diawali "/") */
  path: string;
  /**
   * Header Cookie mentah dari request masuk, di-forward ke Puppeteer biar
   * halaman internal yang butuh sesi login (Better Auth) tetap ke-otorisasi
   * — TANPA ini, Puppeteer bakal ke-redirect ke /login dan hasil PDF-nya
   * cuma halaman login kosong.
   */
  cookieHeader?: string;
  /** Timeout navigasi dalam ms, default 30 detik */
  timeoutMs?: number;
};

export async function generatePdfFromPath(opts: GeneratePdfOptions): Promise<Buffer> {
  const { origin, path, cookieHeader, timeoutMs = 30_000 } = opts;
  if (!path.startsWith("/")) {
    throw new Error(`generatePdfFromPath: path harus diawali "/" — dapat "${path}"`);
  }

  const browser = await getBrowser();
  // PENTING: jangan browser.newPage() langsung (itu pakai default browser
  // context yang DIBAGI ke semua request). Kalau dibagi, Set-Cookie dari
  // request pertama (mis. cookieCache Better Auth yang di-refresh pas
  // navigasi) ke-simpen di cookie jar context itu dan bisa "nyasar"/bentrok
  // sama header Cookie yang kita paksa-set manual di request berikutnya —
  // ini penyebab paling mungkin kenapa print pertama (portrait) sukses tapi
  // print kedua (landscape) langsung sesudahnya malah balik ke /login.
  // Fix: tiap generatePdfFromPath() jalan di browser context baru (incognito
  // style) yang cookie jar-nya kosong & terisolasi, ditutup lagi sesudahnya.
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  try {
    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ Cookie: cookieHeader });
    }
    // Diagnostik — cuma NAMA cookie yang di-log, bukan value-nya (jangan
    // pernah log session token mentah). Kalau nanti masih ke-redirect ke
    // /login, cek log ini: kalau nama cookie sesi Better Auth (biasa
    // "better-auth.session_token" / "__Secure-better-auth.session_token")
    // gak ada di daftar, berarti masalahnya di forwarding cookie-nya
    // (proxy/CDN di depan app strip header Cookie), bukan di baseURL/domain.
    console.log(
      "[generatePdfFromPath] origin:", origin,
      "path:", path,
      "cookie names forwarded:", cookieHeader ? cookieHeader.split(";").map((c) => c.trim().split("=")[0]) : "(kosong)"
    );

    const response = await page.goto(`${origin}${path}`, {
      waitUntil: "networkidle0",
      timeout: timeoutMs,
    });

    // Kalau requireRole() di halaman internal nge-redirect ke /login (cookie
    // sesi gak ke-forward / expired / origin salah), page.goto() TETAP
    // "berhasil" secara teknis (Puppeteer ikutin redirect-nya) — tanpa cek
    // ini, hasilnya adalah PDF halaman login yang ke-download diam-diam
    // seolah-olah berhasil generate laporan. Deteksi eksplisit biar gagal
    // dengan error yang jelas, bukan file PDF yang salah isinya.
    const finalUrl = page.url();
    if (/\/login(\?|$)/.test(new URL(finalUrl).pathname + new URL(finalUrl).search) || new URL(finalUrl).pathname.startsWith("/login")) {
      throw new Error(
        `Gagal generate PDF: sesi tidak terbawa ke request internal, malah ke-redirect ke halaman login (${finalUrl}). ` +
        `Cek cookie sesi ter-forward dengan benar, dan pastikan BETTER_AUTH_URL / NEXT_PUBLIC_BETTER_AUTH_URL di .env ` +
        `sudah diisi domain publik yang sebenarnya (bukan localhost) kalau ini di production.`
      );
    }
    if (response && response.status() >= 400) {
      throw new Error(`Gagal generate PDF: halaman internal ${path} merespons status ${response.status()}.`);
    }

    // Tunggu font custom (kalau ada) selesai load biar teks di PDF gak
    // "loncat" pakai fallback font sistem.
    await page.evaluate(() => document.fonts?.ready).catch(() => {});

    const pdfUint8 = await page.pdf({
      printBackground: true,
      // Sumber ukuran kertas & orientasi (A4 portrait/landscape) datang dari
      // `@page` CSS di halaman yang di-capture, bukan dari opsi di sini.
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfUint8);
  } finally {
    await page.close();
    await context.close();
  }
}

/** Dipanggil pas graceful shutdown server kalau perlu (opsional, jarang perlu di Next.js). */
export async function closePdfBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}
