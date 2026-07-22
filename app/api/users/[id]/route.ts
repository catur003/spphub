import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";

async function checkOwnerAccess() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return null;
  }
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkOwnerAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, role, password } = body;

    const dataAkun: any = {};
    if (name) dataAkun.name = name;
    if (role && ["owner", "petugas"].includes(role)) dataAkun.role = role;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(dataAkun).length > 0) {
        await tx.akun.update({
          where: { id },
          data: dataAkun,
        });
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await tx.kredensial.updateMany({
          where: { akunId: id, providerId: "credential" },
          data: { password: hashedPassword },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PATCH /api/users/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data pengguna: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkOwnerAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    if (session.user.id === id) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri" },
        { status: 400 }
      );
    }

    await prisma.akun.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/users/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus pengguna: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
