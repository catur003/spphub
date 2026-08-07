import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const kelasId = searchParams.get("kelasId") || undefined;
    const tingkat = searchParams.get("tingkat") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const siswa = await prisma.siswa.findMany({
      where: {
        ...(kelasId
          ? { kelasId }
          : tingkat
          ? { kelas: { tingkat: Number(tingkat) } }
          : {}),
        ...(status ? { status } : {}),
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
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const body = await req.json();
    if (!body.namaLengkap || !body.nis || !body.jenisKelamin) {
      return NextResponse.json(
        { error: "namaLengkap, nis, dan jenisKelamin wajib diisi" },
        { status: 400 }
      );
    }

    const nis = String(body.nis).trim();
    // Normalisasi ke null, JANGAN "" — kolom nisn itu @unique, jadi dua siswa
    // tanpa NISN yang dikirim sebagai string kosong akan bentrok unique
    // constraint (NULL boleh duplikat di MySQL, "" tidak).
    const nisn = body.nisn ? String(body.nisn).trim() : null;

    const nisDipakai = await prisma.siswa.findUnique({ where: { nis } });
    if (nisDipakai) {
      return NextResponse.json({ error: "NIS sudah dipakai siswa lain" }, { status: 400 });
    }

    // NISN juga @unique di schema tapi dulu gak pernah divalidasi di sini —
    // duplikatnya baru meledak jadi P2002 dan kekirim ke user sebagai error
    // 500 "Unique constraint failed" yang gak ada artinya buat admin.
    if (nisn) {
      const nisnDipakai = await prisma.siswa.findUnique({ where: { nisn } });
      if (nisnDipakai) {
        return NextResponse.json({ error: "NISN sudah dipakai siswa lain" }, { status: 400 });
      }
    }

    const buatAkun = Boolean(body.buatAkun && body.email && body.password);
    // Email dinormalisasi SEKALI di sini lalu dipakai baik buat cek duplikat
    // maupun buat nyimpen. Dulu cek duplikat pakai body.email mentah tapi yang
    // disimpan versi lowercase — bikin data email campur case & cek duplikat
    // bisa meleset.
    const email = buatAkun ? String(body.email).trim().toLowerCase() : null;
    const password = buatAkun ? String(body.password) : null;

    if (buatAkun) {
      if (!password || password.length < 8) {
        return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
      }
      const emailDipakai = await prisma.akun.findUnique({ where: { email: email! } });
      if (emailDipakai) {
        return NextResponse.json({ error: "Email sudah dipakai akun lain" }, { status: 400 });
      }
    }

    const hashedPassword = buatAkun ? await bcrypt.hash(password!, 10) : null;

    const dataSiswa = {
      kelasId: body.kelasId || null,
      nis,
      nisn,
      namaLengkap: String(body.namaLengkap).trim(),
      jenisKelamin: body.jenisKelamin,
      tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
      namaWali: body.namaWali || null,
      kontakWali: body.kontakWali || null,
      fotoUrl: body.fotoUrl || null,
      status: body.status || "aktif",
    };

    // SATU transaksi buat akun + kredensial + siswa. Dulu akun & kredensial
    // dibuat di transaksi sendiri lalu siswa.create dipanggil DI LUAR-nya —
    // kalau siswa.create gagal (mis. kelasId FK invalid, nisn bentrok), akun
    // + kredensial-nya nyangkut jadi yatim dan emailnya keburu "kepakai"
    // tanpa ada siswa yang megang.
    let siswa;
    try {
      siswa = await prisma.$transaction(async (tx) => {
        let akunId: string | undefined;

        if (buatAkun) {
          const akun = await tx.akun.create({
            data: {
              name: dataSiswa.namaLengkap,
              email: email!,
              role: "siswa",
            },
          });

          await tx.kredensial.create({
            data: {
              akunId: akun.id,
              accountId: akun.id,
              providerId: "credential",
              password: hashedPassword!,
            },
          });

          akunId = akun.id;
        }

        return tx.siswa.create({ data: { ...dataSiswa, ...(akunId ? { akunId } : {}) } });
      });
    } catch (err: any) {
      // Jaring pengaman kalau ada yang nyelip lewat race condition antara
      // pengecekan di atas dan insert-nya.
      if (err?.code === "P2002") {
        const target = String(err?.meta?.target || "");
        const kolom = target.includes("nisn")
          ? "NISN"
          : target.includes("nis")
          ? "NIS"
          : target.includes("email")
          ? "Email"
          : "Data";
        return NextResponse.json({ error: `${kolom} sudah dipakai akun/siswa lain` }, { status: 400 });
      }
      throw err;
    }

    return NextResponse.json(siswa, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/siswa] Error:", error);
    return NextResponse.json(
      { error: "Gagal menambah siswa: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
