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
    const kelasId = searchParams.get("kelasId") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const siswa = await prisma.siswa.findMany({
      where: {
        ...(kelasId ? { kelasId } : {}),
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
      include: { kelas: true, akun: { select: { email: true } } },
      orderBy: { namaLengkap: "asc" },
      take: limit || (q ? 20 : 100), // Batasi query search maksimal 20 data biar cepat & ringan
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
      const hasil = await auth.api.signUpEmail({
        body: {
          email: body.email,
          password: body.password,
          name: body.namaLengkap,
        },
      });
      akunId = hasil.user.id;
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
