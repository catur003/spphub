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
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const kelas = await prisma.kelas.findUnique({
      where: { id },
      include: {
        siswa: {
          select: {
            id: true,
            namaLengkap: true,
            nis: true,
            nisn: true,
            jenisKelamin: true,
            status: true,
            fotoUrl: true,
            namaWali: true,
            kontakWali: true,
            tagihan: {
              select: {
                id: true,
                nominal: true,
                status: true,
              },
            },
          },
          orderBy: { namaLengkap: "asc" },
        },
      },
    });

    if (!kelas) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    // Hitung Rekap Pembayaran Per Kelas
    let totalNominalTagihan = 0;
    let totalNominalLunas = 0;
    let totalNominalTunggakan = 0;
    let jumlahLunasCount = 0;
    let jumlahBelumCount = 0;

    kelas.siswa.forEach((s) => {
      s.tagihan.forEach((t) => {
        totalNominalTagihan += t.nominal;
        if (t.status === "lunas") {
          totalNominalLunas += t.nominal;
          jumlahLunasCount++;
        } else {
          totalNominalTunggakan += t.nominal;
          jumlahBelumCount++;
        }
      });
    });

    return NextResponse.json({
      ...kelas,
      rekap: {
        totalSiswa: kelas.siswa.length,
        totalNominalTagihan,
        totalNominalLunas,
        totalNominalTunggakan,
        jumlahLunasCount,
        jumlahBelumCount,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/kelas/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil detail kelas: " + (error.message || "Unknown error") },
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
    const body = await req.json().catch(() => ({}));

    const kelas = await prisma.kelas.update({
      where: { id },
      data: {
        ...(body.namaKelas ? { namaKelas: String(body.namaKelas).trim() } : {}),
        ...(body.tingkat ? { tingkat: Number(body.tingkat) } : {}),
        ...(body.nominalSpp !== undefined ? { nominalSpp: Number(body.nominalSpp) } : {}),
        ...(body.waliKelas !== undefined ? { waliKelas: String(body.waliKelas).trim() } : {}),
      },
    });
    return NextResponse.json(kelas);
  } catch (error: any) {
    console.error("[PUT /api/kelas/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui kelas: " + (error.message || "Unknown error") },
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
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const dipakai = await prisma.siswa.count({ where: { kelasId: id } });
    if (dipakai > 0) {
      return NextResponse.json(
        { error: "Kelas masih dipakai siswa, tidak bisa dihapus" },
        { status: 400 }
      );
    }

    await prisma.kelas.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/kelas/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kelas: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
