import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

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
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Cek duplikat manual (sama seperti POST), abaikan record ini sendiri.
    if (body.namaKelas && body.tingkat) {
      const namaKelasTrim = String(body.namaKelas).trim();
      const tingkatNum = Number(body.tingkat);
      const existing = await prisma.kelas.findFirst({
        where: {
          id: { not: id },
          tingkat: tingkatNum,
          namaKelas: { equals: namaKelasTrim, mode: "insensitive" },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: `Kelas "${namaKelasTrim}" tingkat ${tingkatNum} sudah ada.` },
          { status: 400 }
        );
      }
    }

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
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

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
