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
const PREFIX = "enc:";

function ambilKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  // Terima key panjang berapapun, di-hash jadi 32 byte yang valid buat AES-256
  return crypto.createHash("sha256").update(raw).digest();
}

/** Apakah nilai tersimpan ini hasil enkripsi kita (bukan data lama plaintext)? */
export function terenkripsi(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.startsWith(PREFIX);
}

export function encrypt(plainText: string | null | undefined): string | null {
  if (!plainText) return plainText ?? null;
  const key = ambilKey();
  if (!key) return plainText; // ENCRYPTION_KEY belum diset -> simpan apa adanya

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMA, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/**
 * Kembalikan plaintext, atau `null` kalau gagal dekrip.
 *
 * PENTING: dulu fungsi ini mengembalikan ciphertext mentah ("enc:...") kalau
 * gagal — itu bikin kegagalan jadi SENYAP dan berbahaya. Kalau ENCRYPTION_KEY
 * hilang/berubah (mis. redeploy Railway tanpa env var), server key Midtrans
 * yang dipakai jadi string sampah, sehingga:
 *   - verifySignature() SELALU false -> semua webhook Midtrans ditolak 403
 *     -> tagihan yang sudah dibayar TIDAK PERNAH jadi lunas, tanpa error
 *     yang kelihatan di mana pun.
 *   - Snap/CoreApi dibangun dengan key sampah -> 401 dari Midtrans.
 * Sekarang gagal dekrip = null + log error, biar ketahuan dan pemanggilnya
 * bisa kasih pesan yang jelas ke admin.
 */
export function decrypt(stored: string | null | undefined): string | null {
  if (!stored) return stored ?? null;
  if (!terenkripsi(stored)) return stored; // data lama / belum dienkripsi, kembalikan apa adanya

  const key = ambilKey();
  if (!key) {
    console.error(
      "[crypto] Ada data terenkripsi di DB tapi ENCRYPTION_KEY belum diset. " +
        "Isi ENCRYPTION_KEY di environment, atau simpan ulang Server Key Midtrans di halaman Settings."
    );
    return null;
  }

  try {
    const [, ivHex, tagHex, dataHex] = stored.split(":");
    if (!ivHex || !tagHex || !dataHex) throw new Error("Format ciphertext tidak lengkap");
    const decipher = crypto.createDecipheriv(ALGORITMA, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return plain.toString("utf8");
  } catch (err) {
    console.error(
      "[crypto] Gagal dekrip data. Kemungkinan besar ENCRYPTION_KEY berubah sejak data ini disimpan. " +
        "Simpan ulang Server Key Midtrans di halaman Settings pakai key yang sekarang.",
      err
    );
    return null;
  }
}
