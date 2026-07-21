import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function checkAccess() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await checkAccess();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kelas = await prisma.kelas.findMany({
    orderBy: [{ tingkat: "asc" }, { namaKelas: "asc" }],
    include: { _count: { select: { siswa: true } } },
  });
  return NextResponse.json(kelas);
}

export async function POST(req: NextRequest) {
  const session = await checkAccess();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.namaKelas || !body.tingkat) {
    return NextResponse.json({ error: "namaKelas dan tingkat wajib diisi" }, { status: 400 });
  }

  const kelas = await prisma.kelas.create({
    data: { namaKelas: body.namaKelas, tingkat: Number(body.tingkat) },
  });
  return NextResponse.json(kelas, { status: 201 });
}
