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
  const page = await browser.newPage();
  try {
    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ Cookie: cookieHeader });
    }

    await page.goto(`${origin}${path}`, {
      waitUntil: "networkidle0",
      timeout: timeoutMs,
    });

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
