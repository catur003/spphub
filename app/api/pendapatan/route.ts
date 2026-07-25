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

export async function GET(req: NextRequest) {
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const kategori = searchParams.get("kategori") || "";

    const where: any = {};
    if (kategori) where.kategori = kategori;
    if (q) {
      where.OR = [
        { judul: { contains: q } },
        { keterangan: { contains: q } },
        { penerima: { contains: q } },
      ];
    }

    const list = await prisma.pendapatanLain.findMany({
      where,
      orderBy: { tanggal: "desc" },
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("[GET /api/pendapatan] Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data pendapatan" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { judul, kategori, nominal, tanggal, keterangan, penerima } = body;

    if (!judul || !nominal || Number(nominal) <= 0) {
      return NextResponse.json({ error: "Judul dan nominal wajib diisi dan lebih besar dari 0" }, { status: 400 });
    }

    const item = await prisma.pendapatanLain.create({
      data: {
        judul: String(judul).trim(),
        kategori: kategori || "Lain-lain",
        nominal: Number(nominal),
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        keterangan: keterangan ? String(keterangan).trim() : null,
        penerima: penerima ? String(penerima).trim() : session.user.name || null,
      },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("[POST /api/pendapatan] Error:", error);
    return NextResponse.json({ error: "Gagal menambah data pendapatan: " + error.message }, { status: 500 });
  }
}
