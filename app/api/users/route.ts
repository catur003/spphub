import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireApiRole(["owner"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role");

    const users = await prisma.akun.findMany({
      where: roleParam ? { role: roleParam as any } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("[GET /api/users] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pengguna: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireApiRole(["owner"]);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Nama, email, password, dan role wajib diisi" },
        { status: 400 }
      );
    }

    if (!["owner", "petugas", "siswa"].includes(role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }

    const existingEmail = await prisma.akun.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAkun = await prisma.$transaction(async (tx) => {
      const akun = await tx.akun.create({
        data: {
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          role,
        },
      });

      await tx.kredensial.create({
        data: {
          akunId: akun.id,
          accountId: akun.id,
          providerId: "credential",
          password: hashedPassword,
        },
      });

      return akun;
    });

    return NextResponse.json(newAkun, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/users] Error:", error);
    return NextResponse.json(
      { error: "Gagal membuat pengguna baru: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
