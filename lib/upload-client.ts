// Helper upload gambar sisi client — dipakai bareng oleh form Siswa (foto
// profil) dan Settings (logo sekolah). Sebelumnya logic kompresi+upload cuma
// ada duplikat di app/admin/siswa/types.ts; diekstrak ke sini biar gak
// kecopy-paste lagi tiap ada fitur upload gambar baru.

export const MIME_GAMBAR_DIIZINKAN = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type KompresOpts = {
  /** Ukuran maksimal sisi terpanjang, px. */
  maxPx?: number;
  quality?: number;
  /** Format output. Default JPEG. Set "keep" untuk pertahankan mime asli
   *  (penting buat logo PNG transparan — encode ulang ke JPEG bikin
   *  background transparan jadi hitam/putih solid). */
  outputType?: string | "keep";
};

/** Kompres gambar di sisi client sebelum diunggah. */
export function kompresGambar(file: File, opts: KompresOpts = {}): Promise<Blob> {
  const maxPx = opts.maxPx ?? 400;
  const quality = opts.quality ?? 0.82;
  const outputType = opts.outputType === "keep" ? (file.type || "image/jpeg") : (opts.outputType ?? "image/jpeg");

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxPx || h > maxPx) {
          if (w > h) {
            h = Math.round((h * maxPx) / w);
            w = maxPx;
          } else {
            w = Math.round((w * maxPx) / h);
            h = maxPx;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob || file), outputType, quality);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Kompres + unggah gambar ke endpoint /api/upload, kembalikan URL hasil. */
export async function uploadGambar(
  file: File,
  namaFile: string,
  kompresOpts: KompresOpts = {}
): Promise<string> {
  // Dicegat di client duluan: kompresGambar() pakai <img>.onload yang GAK
  // PERNAH fire buat file non-gambar, jadi promise-nya menggantung selamanya
  // dan spinner "Mengunggah..." muter tanpa ujung. Server juga nolak, tapi
  // request-nya gak pernah sampai ke sana.
  if (!MIME_GAMBAR_DIIZINKAN.includes(file.type)) {
    throw new Error("Format gambar harus JPG, PNG, WEBP, atau GIF.");
  }

  const blobKompres = await kompresGambar(file, kompresOpts);
  const formData = new FormData();
  formData.append("file", blobKompres, namaFile);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gagal mengunggah gambar");
  return data.url;
}
