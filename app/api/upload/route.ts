import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";

async function checkAccess() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return null;
  }
  return session;
}

export async function POST(req: NextRequest) {
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "File gambar tidak ditemukan" }, { status: 400 });
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
      const blob = new Blob([buffer], { type: file.type || "image/jpeg" });
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
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";
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
