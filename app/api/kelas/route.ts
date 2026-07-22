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
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const kelas = await prisma.kelas.findMany({
      orderBy: [{ tingkat: "asc" }, { namaKelas: "asc" }],
      include: { _count: { select: { siswa: true } } },
    });
    return NextResponse.json(kelas);
  } catch (error: any) {
    console.error("[GET /api/kelas] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data kelas: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.namaKelas || !body.tingkat) {
      return NextResponse.json({ error: "namaKelas dan tingkat wajib diisi" }, { status: 400 });
    }

    const kelas = await prisma.kelas.create({
      data: {
        namaKelas: String(body.namaKelas).trim(),
        tingkat: Number(body.tingkat),
        ...(body.nominalSpp !== undefined ? { nominalSpp: Number(body.nominalSpp) } : {}),
        ...(body.waliKelas !== undefined ? { waliKelas: String(body.waliKelas).trim() } : {}),
      },
    });
    return NextResponse.json(kelas, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/kelas] Error:", error);

    // Prisma Unique Constraint Error (P2002)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Nama kelas sudah ada, gunakan nama kelas lain." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Gagal menyimpan kelas: " + (error.message || "Terjadi kesalahan pada server") },
      { status: 500 }
    );
  }
}
