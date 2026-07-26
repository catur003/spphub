import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiRole(["owner", "petugas"]);
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.pengumuman.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pengumuman:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiRole(["owner", "petugas"]);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.judul || !body.isi) {
      return NextResponse.json({ error: "Judul dan isi tidak boleh kosong" }, { status: 400 });
    }

    const updated = await prisma.pengumuman.update({
      where: { id },
      data: {
        judul: body.judul,
        isi: body.isi,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating pengumuman:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
