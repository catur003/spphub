import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { encrypt, decrypt, encryptionKeyTersedia } from "@/lib/crypto";

export async function GET() {
  const { error } = await requireApiRole(["owner"]);
  if (error) return error;

  let pengaturan = await prisma.pengaturanPembayaran.findFirst();
  if (!pengaturan) {
    pengaturan = await prisma.pengaturanPembayaran.create({ data: {} });
  }

  return NextResponse.json({
    ...pengaturan,
    sandboxServerKey: decrypt(pengaturan.sandboxServerKey),
    productionServerKey: decrypt(pengaturan.productionServerKey),
    // Dulu satu-satunya sinyal kalau ENCRYPTION_KEY belum diset cuma
    // console.error di server (gak pernah kelihatan admin). Owner bisa
    // gak sadar server key Midtrans-nya tersimpan PLAINTEXT di database
    // selama berbulan-bulan. Flag ini biar halaman Settings bisa nampilin
    // warning eksplisit di UI.
    enkripsiAktif: encryptionKeyTersedia(),
  });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireApiRole(["owner"]);
  if (error) return error;

  const body = await req.json();
  const {
    environment,
    sandboxClientKey,
    sandboxServerKey,
    productionClientKey,
    productionServerKey,
  } = body;

  if (!["sandbox", "production"].includes(environment)) {
    return NextResponse.json({ error: "environment harus sandbox atau production" }, { status: 400 });
  }

  let pengaturan = await prisma.pengaturanPembayaran.findFirst();
  const data = {
    environment,
    sandboxClientKey: sandboxClientKey || null,
    sandboxServerKey: encrypt(sandboxServerKey || null),
    productionClientKey: productionClientKey || null,
    productionServerKey: encrypt(productionServerKey || null),
  };

  pengaturan = pengaturan
    ? await prisma.pengaturanPembayaran.update({ where: { id: pengaturan.id }, data })
    : await prisma.pengaturanPembayaran.create({ data });

  return NextResponse.json({
    ...pengaturan,
    sandboxServerKey: decrypt(pengaturan.sandboxServerKey),
    productionServerKey: decrypt(pengaturan.productionServerKey),
  });
}
