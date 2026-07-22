import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (!body.status) {
      return NextResponse.json({ error: "status wajib diisi" }, { status: 400 });
    }

    const tagihan = await prisma.tagihanSpp.update({
      where: { id },
      data: { status: body.status },
    });

    return NextResponse.json(tagihan);
  } catch (error: any) {
    console.error("[PATCH /api/tagihan/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.tagihanSpp.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/tagihan/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
