import { headers } from "next/headers";

/**
 * Ambil origin (protocol + host) & header Cookie mentah dari request yang
 * lagi diproses. Dipakai di route /api/pdf/* buat nyuruh Puppeteer buka
 * halaman internal (misal /kwitansi/abc123) dengan sesi login yang sama
 * persis kayak yang lagi dipakai user — biar gak ke-redirect ke /login.
 */
export async function getInternalOrigin(): Promise<{ origin: string; cookieHeader: string }> {
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const cookieHeader = h.get("cookie") || "";
  return { origin: `${proto}://${host}`, cookieHeader };
}
