import { headers } from "next/headers";

/**
 * Ambil origin (protocol + host) & header Cookie mentah dari request yang
 * lagi diproses. Dipakai di route /api/pdf/* buat nyuruh Puppeteer buka
 * halaman internal (misal /kwitansi/abc123) dengan sesi login yang sama
 * persis kayak yang lagi dipakai user — biar gak ke-redirect ke /login.
 *
 * KEAMANAN — JANGAN ambil origin dari header `Host`/`X-Forwarded-Host`:
 * header itu dikirim & dikontrol penuh oleh klien (bisa dipalsukan bebas
 * lewat curl/Burp, gak divalidasi middleware apa pun di app ini). Versi lama
 * fungsi ini pakai `h.get("host")` buat bangun origin, lalu origin itu
 * dipakai Puppeteer buat `page.goto()` DENGAN cookie sesi asli ikut
 * di-forward (`setExtraHTTPHeaders({ Cookie: cookieHeader })`, lihat
 * lib/generate-pdf.ts). Attacker cukup kirim request ke /api/pdf/* dengan
 * header `Host: attacker-domain.com`, dan server sendiri yang mengirim
 * cookie session korban ke domain attacker — SSRF + pencurian sesi, gak
 * perlu XSS/akses lain sama sekali.
 *
 * Fix: origin SELALU dari env var yang cuma bisa diisi lewat deploy config
 * (BETTER_AUTH_URL / NEXT_PUBLIC_BETTER_AUTH_URL), sama seperti yang dipakai
 * lib/auth.ts buat trustedOrigins — bukan dari apa pun yang datang di
 * request. Fallback localhost hanya buat dev lokal.
 */
export async function getInternalOrigin(): Promise<{ origin: string; cookieHeader: string }> {
  const origin =
    process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";

  const h = await headers();
  const cookieHeader = h.get("cookie") || "";
  return { origin: origin.replace(/\/+$/, ""), cookieHeader };
}
