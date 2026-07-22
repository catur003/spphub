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

export async function GET() {
  try {
    const session = await checkOwnerAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await prisma.akun.findMany({
      where: { role: { in: ["owner", "petugas"] } },
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
    const session = await checkOwnerAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Nama, email, password, dan role wajib diisi" },
        { status: 400 }
      );
    }

    if (!["owner", "petugas"].includes(role)) {
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
          name,
          email,
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
