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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const siswa = await prisma.siswa.findUnique({
      where: { id },
      include: {
        kelas: true,
        akun: { select: { email: true } },
        tagihan: {
          orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
          take: 12,
        },
      },
    });

    if (!siswa) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    return NextResponse.json(siswa);
  } catch (error: any) {
    console.error("[GET /api/siswa/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data siswa: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    if (body.nis) {
      const nisDipakai = await prisma.siswa.findFirst({
        where: { nis: body.nis, NOT: { id } },
      });
      if (nisDipakai) {
        return NextResponse.json({ error: "NIS sudah dipakai siswa lain" }, { status: 400 });
      }
    }

    const siswaSekarang = await prisma.siswa.findUnique({
      where: { id },
      select: { akunId: true },
    });
    if (!siswaSekarang) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    let akunIdBaru: string | undefined;

    if (!siswaSekarang.akunId) {
      if (body.buatAkun && body.email && body.password) {
        const emailDipakai = await prisma.akun.findUnique({ where: { email: body.email } });
        if (emailDipakai) {
          return NextResponse.json({ error: "Email sudah dipakai akun lain" }, { status: 400 });
        }
        try {
          const hasil = await auth.api.signUpEmail({
            body: {
              email: body.email,
              password: body.password,
              name: body.namaLengkap || body.nis,
            },
          });
          akunIdBaru = hasil.user.id;
        } catch {
          return NextResponse.json(
            { error: "Gagal membuat akun. Pastikan email valid dan password minimal 8 karakter." },
            { status: 400 }
          );
        }
      }
    }

    if (siswaSekarang.akunId) {
      const akunId = siswaSekarang.akunId;

      if (body.gantiEmail && body.emailBaru) {
        const emailDipakai = await prisma.akun.findFirst({
          where: { email: body.emailBaru, NOT: { id: akunId } },
        });
        if (emailDipakai) {
          return NextResponse.json({ error: "Email baru sudah dipakai akun lain" }, { status: 400 });
        }
        await prisma.akun.update({
          where: { id: akunId },
          data: { email: body.emailBaru },
        });
      }

      if (body.resetPassword && body.passwordBaru) {
        if (body.passwordBaru.length < 8) {
          return NextResponse.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
        }
        const hashBaru = await bcrypt.hash(body.passwordBaru, 10);
        await prisma.kredensial.updateMany({
          where: { akunId, providerId: "credential" },
          data: { password: hashBaru },
        });
      }

      if (body.namaLengkap) {
        await prisma.akun.update({
          where: { id: akunId },
          data: { name: body.namaLengkap },
        });
      }
    }

    const siswa = await prisma.siswa.update({
      where: { id },
      data: {
        kelasId: body.kelasId || null,
        nis: body.nis,
        nisn: body.nisn || null,
        namaLengkap: body.namaLengkap,
        jenisKelamin: body.jenisKelamin,
        tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
        namaWali: body.namaWali || null,
        kontakWali: body.kontakWali || null,
        fotoUrl: body.fotoUrl !== undefined ? body.fotoUrl : undefined,
        status: body.status,
        ...(akunIdBaru ? { akunId: akunIdBaru } : {}),
      },
      include: { kelas: true, akun: { select: { email: true } } },
    });

    return NextResponse.json(siswa);
  } catch (error: any) {
    console.error("[PUT /api/siswa/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui siswa: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAccess();
    if (!session || session.user.role !== "owner") {
      return NextResponse.json({ error: "Hanya Owner yang boleh hapus siswa" }, { status: 403 });
    }

    const { id } = await params;

    const punyaTagihan = await prisma.tagihanSpp.count({ where: { siswaId: id } });
    if (punyaTagihan > 0) {
      return NextResponse.json(
        { error: "Siswa punya riwayat tagihan, tidak bisa dihapus. Ubah status jadi nonaktif saja." },
        { status: 400 }
      );
    }

    await prisma.siswa.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/siswa/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus siswa: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
