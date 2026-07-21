import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function checkOwner() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "owner") return null;
  return session;
}

export async function GET() {
  const session = await checkOwner();
  if (!session) return NextResponse.json({ error: "Hanya Owner yang boleh akses" }, { status: 403 });

  let pengaturan = await prisma.pengaturanPembayaran.findFirst();
  if (!pengaturan) {
    pengaturan = await prisma.pengaturanPembayaran.create({ data: {} });
  }
  return NextResponse.json(pengaturan);
}

export async function PUT(req: NextRequest) {
  const session = await checkOwner();
  if (!session) return NextResponse.json({ error: "Hanya Owner yang boleh akses" }, { status: 403 });

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
    sandboxServerKey: sandboxServerKey || null,
    productionClientKey: productionClientKey || null,
    productionServerKey: productionServerKey || null,
  };

  pengaturan = pengaturan
    ? await prisma.pengaturanPembayaran.update({ where: { id: pengaturan.id }, data })
    : await prisma.pengaturanPembayaran.create({ data });

  return NextResponse.json(pengaturan);
}
