import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import crypto from "crypto";

// Whitelist tipe gambar. Dulu route ini nerima Blob APA PUN tanpa dicek —
// artinya file non-gambar (bahkan .html/.svg berisi script) bisa diunggah dan
// URL-nya nyangkut di kolom fotoUrl.
const MIME_DIIZINKAN = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Batas atas kalau upload beneran masuk Cloudinary. */
const MAKS_BYTE = 2 * 1024 * 1024; // 2 MB

/** Batas jauh lebih ketat buat fallback base64, karena hasilnya masuk ke
 *  kolom `fotoUrl` (@db.LongText) di DB, bukan ke CDN — dan kolom itu ikut
 *  kekirim di SETIAP GET /api/siswa. Base64 juga nambah ~33% dari ukuran asli. */
const MAKS_BYTE_BASE64 = 400 * 1024; // 400 KB

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "File gambar tidak ditemukan" }, { status: 400 });
    }

    const mimeType = file.type || "";
    if (!MIME_DIIZINKAN.includes(mimeType)) {
      return NextResponse.json(
        { error: "Format file harus JPG, PNG, WEBP, atau GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAKS_BYTE) {
      return NextResponse.json(
        { error: `Ukuran foto maksimal ${Math.round(MAKS_BYTE / 1024 / 1024)} MB.` },
        { status: 400 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ——— OPSI 1: Jika Cloudinary ENV Terpasang ———
    if (cloudName && (uploadPreset || (apiKey && apiSecret))) {
      const cloudinaryForm = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      cloudinaryForm.append("file", blob, (file as File).name || "photo.jpg");

      if (uploadPreset) {
        cloudinaryForm.append("upload_preset", uploadPreset);
      } else if (apiKey && apiSecret) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signatureStr = `timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash("sha1").update(signatureStr).digest("hex");

        cloudinaryForm.append("api_key", apiKey);
        cloudinaryForm.append("timestamp", timestamp);
        cloudinaryForm.append("signature", signature);
      }

      const resCloudinary = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: cloudinaryForm,
      });

      if (resCloudinary.ok) {
        const dataCloud = await resCloudinary.json();
        return NextResponse.json({ url: dataCloud.secure_url });
      } else {
        const errCloud = await resCloudinary.json().catch(() => ({}));
        console.error("[Cloudinary Upload Error]:", errCloud);
      }
    }

    // ——— OPSI 2: Fallback ke Base64 (jika Cloudinary ENV belum diisi) ———
    if (file.size > MAKS_BYTE_BASE64) {
      return NextResponse.json(
        {
          error: `Cloudinary belum dikonfigurasi, jadi foto disimpan langsung ke database dan ukurannya dibatasi ${Math.round(
            MAKS_BYTE_BASE64 / 1024
          )} KB. Kompres fotonya dulu, atau isi ENV Cloudinary supaya bisa upload sampai ${Math.round(
            MAKS_BYTE / 1024 / 1024
          )} MB.`,
        },
        { status: 400 }
      );
    }

    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      note: "Cloudinary ENV belum dikonfigurasi, gambar disimpan sebagai Data URL.",
    });
  } catch (error: any) {
    console.error("[POST /api/upload] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengunggah foto: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
