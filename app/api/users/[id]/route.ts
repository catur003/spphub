import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";

async function checkOwnerAccess() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "owner") {
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
    if (!session) return NextResponse.json({ error: "Hanya Owner yang berhak mengelola akun pengguna" }, { status: 403 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, role, password } = body;

    const targetUser = await prisma.akun.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    // Permission Protection 1: Owner tidak boleh menurunkan dirinya sendiri dari role owner
    if (session.user.id === id && role && role !== "owner") {
      return NextResponse.json(
        { error: "Anda tidak dapat menurunkan peran (role) akun Anda sendiri dari Owner" },
        { status: 400 }
      );
    }

    // Permission Protection 2: Minimal harus ada 1 Owner di sistem
    if (targetUser.role === "owner" && role === "petugas") {
      const totalOwner = await prisma.akun.count({ where: { role: "owner" } });
      if (totalOwner <= 1) {
        return NextResponse.json(
          { error: "Sistem harus memiliki minimal 1 akun Owner yang aktif" },
          { status: 400 }
        );
      }
    }

    const dataAkun: any = {};
    if (name) dataAkun.name = String(name).trim();
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
    if (!session) return NextResponse.json({ error: "Hanya Owner yang berhak mengelola akun pengguna" }, { status: 403 });

    const { id } = await params;

    // Protection 1: Cek hapus akun sendiri
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri saat sedang terhubung" },
        { status: 400 }
      );
    }

    // Protection 2: Minimal 1 Owner
    const targetUser = await prisma.akun.findUnique({ where: { id } });
    if (targetUser?.role === "owner") {
      const totalOwner = await prisma.akun.count({ where: { role: "owner" } });
      if (totalOwner <= 1) {
        return NextResponse.json(
          { error: "Tidak dapat menghapus satu-satunya akun Owner pada sistem" },
          { status: 400 }
        );
      }
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
