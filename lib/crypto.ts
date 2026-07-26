import crypto from "crypto";

/**
 * Enkripsi field sensitif (server key Midtrans) sebelum disimpan ke DB.
 *
 * Butuh env var ENCRYPTION_KEY (string bebas, minimal 32 karakter — generate
 * misalnya lewat `openssl rand -hex 32`). Kalau env var ini belum diisi,
 * fungsi ini jadi no-op (data disimpan apa adanya) supaya tidak mendadak
 * merusak instalasi yang sudah jalan — begitu ENCRYPTION_KEY diisi di
 * Railway, data yang baru disimpan/diubah otomatis mulai terenkripsi.
 */
const ALGORITMA = "aes-256-gcm";

function ambilKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  // Terima key panjang berapapun, di-hash jadi 32 byte yang valid buat AES-256
  return crypto.createHash("sha256").update(raw).digest();
}

export function encrypt(plainText: string | null | undefined): string | null {
  if (!plainText) return plainText ?? null;
  const key = ambilKey();
  if (!key) return plainText; // ENCRYPTION_KEY belum diset -> simpan apa adanya

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMA, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decrypt(stored: string | null | undefined): string | null {
  if (!stored) return stored ?? null;
  if (!stored.startsWith("enc:")) return stored; // data lama / belum dienkripsi, kembalikan apa adanya

  const key = ambilKey();
  if (!key) return stored; // gak bisa dekrip tanpa key -> kembalikan mentah (jangan crash)

  try {
    const [, ivHex, tagHex, dataHex] = stored.split(":");
    const decipher = crypto.createDecipheriv(ALGORITMA, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    return stored; // gagal dekrip -> jangan crash, kembalikan apa adanya
  }
}
