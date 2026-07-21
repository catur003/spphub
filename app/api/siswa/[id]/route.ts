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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAccess();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const siswa = await prisma.siswa.findUnique({
    where: { id },
    include: { kelas: true, akun: { select: { email: true } } },
  });

  if (!siswa) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
  return NextResponse.json(siswa);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      status: body.status,
    },
  });

  return NextResponse.json(siswa);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAccess();
  // Hapus siswa dibatasi cuma Owner (lihat catatan "Belum Diputuskan" di handoff)
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
}
