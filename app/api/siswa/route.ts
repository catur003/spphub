import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";

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
    const kelasId = searchParams.get("kelasId") || undefined;
    const tingkat = searchParams.get("tingkat") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const siswa = await prisma.siswa.findMany({
      where: {
        ...(kelasId
          ? { kelasId }
          : tingkat
          ? { kelas: { tingkat: Number(tingkat) } }
          : {}),
        ...(q
          ? {
              OR: [
                { namaLengkap: { contains: q } },
                { nis: { contains: q } },
                { nisn: { contains: q } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        nis: true,
        nisn: true,
        namaLengkap: true,
        jenisKelamin: true,
        tanggalLahir: true,
        namaWali: true,
        kontakWali: true,
        fotoUrl: true,
        status: true,
        createdAt: true,
        kelas: { select: { id: true, namaKelas: true, tingkat: true } },
        akun: { select: { email: true } },
      },
      orderBy: { namaLengkap: "asc" },
      ...(limit ? { take: limit } : {}),
    });

    return NextResponse.json(siswa);
  } catch (error: any) {
    console.error("[GET /api/siswa] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data siswa: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.namaLengkap || !body.nis || !body.jenisKelamin) {
      return NextResponse.json(
        { error: "namaLengkap, nis, dan jenisKelamin wajib diisi" },
        { status: 400 }
      );
    }

    const nisDipakai = await prisma.siswa.findUnique({ where: { nis: body.nis } });
    if (nisDipakai) {
      return NextResponse.json({ error: "NIS sudah dipakai siswa lain" }, { status: 400 });
    }

    let akunId: string | undefined;

    if (body.buatAkun && body.email && body.password) {
      const emailDipakai = await prisma.akun.findUnique({ where: { email: body.email } });
      if (emailDipakai) {
        return NextResponse.json({ error: "Email sudah dipakai akun lain" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(body.password, 10);
      const newAkun = await prisma.$transaction(async (tx) => {
        const akun = await tx.akun.create({
          data: {
            name: body.namaLengkap,
            email: String(body.email).trim().toLowerCase(),
            role: "siswa",
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
      akunId = newAkun.id;
    }

    const siswa = await prisma.siswa.create({
      data: {
        akunId,
        kelasId: body.kelasId || null,
        nis: body.nis,
        nisn: body.nisn || null,
        namaLengkap: body.namaLengkap,
        jenisKelamin: body.jenisKelamin,
        tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
        namaWali: body.namaWali || null,
        kontakWali: body.kontakWali || null,
        fotoUrl: body.fotoUrl || null,
        status: body.status || "aktif",
      },
    });

    return NextResponse.json(siswa, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/siswa] Error:", error);
    return NextResponse.json(
      { error: "Gagal menambah siswa: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
