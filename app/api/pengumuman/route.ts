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
  const limit = searchParams.get("limit");

  try {
    const pengumuman = await prisma.pengumuman.findMany({
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit) : undefined,
    });
    return NextResponse.json(pengumuman);
  } catch (error) {
    console.error("Error fetching pengumuman:", error);
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
    if (!body.judul || !body.isi) {
      return NextResponse.json({ error: "Judul dan isi tidak boleh kosong" }, { status: 400 });
    }

    const pengumuman = await prisma.pengumuman.create({
      data: {
        judul: body.judul,
        isi: body.isi,
      },
    });

    return NextResponse.json(pengumuman, { status: 201 });
  } catch (error) {
    console.error("Error creating pengumuman:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
