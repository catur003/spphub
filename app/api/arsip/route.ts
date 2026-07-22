import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const kategori = searchParams.get("kategori") || "";
  const siswaId = searchParams.get("siswaId") || "";

  try {
    const where: any = {};
    if (q) {
      where.OR = [
        { judul: { contains: q } },
        { keterangan: { contains: q } },
        { siswa: { namaLengkap: { contains: q } } },
      ];
    }
    if (kategori) {
      where.kategori = kategori;
    }
    if (siswaId) {
      where.siswaId = siswaId;
    }

    const arsip = await prisma.arsipDigital.findMany({
      where,
      orderBy: { tanggal: "desc" },
      include: {
        siswa: { select: { id: true, namaLengkap: true, nis: true } },
      },
    });

    return NextResponse.json(arsip);
  } catch (error) {
    console.error("Error fetching arsip:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user.role !== "owner" && session.user.role !== "petugas")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { judul, kategori, fileUrl, fileType, siswaId, tanggal, keterangan } = body;

    if (!judul || !fileUrl || !kategori) {
      return NextResponse.json({ error: "Judul, kategori, dan File URL wajib diisi" }, { status: 400 });
    }

    const arsip = await prisma.arsipDigital.create({
      data: {
        judul,
        kategori,
        fileUrl,
        fileType: fileType || (fileUrl.endsWith(".pdf") ? "pdf" : "image"),
        siswaId: siswaId || null,
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        keterangan: keterangan || null,
      },
      include: {
        siswa: { select: { id: true, namaLengkap: true, nis: true } },
      },
    });

    return NextResponse.json(arsip, { status: 201 });
  } catch (error) {
    console.error("Error creating arsip:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
