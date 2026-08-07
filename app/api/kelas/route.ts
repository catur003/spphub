import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function GET() {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const kelas = await prisma.kelas.findMany({
      orderBy: [{ tingkat: "asc" }, { namaKelas: "asc" }],
      select: {
        id: true,
        namaKelas: true,
        tingkat: true,
        nominalSpp: true,
        waliKelas: true,
        _count: { select: { siswa: true } },
      },
    });

    const res = NextResponse.json(kelas);
    // no-store: sebelumnya max-age=60 bikin browser nyimpen response GET
    // /api/kelas selama 60 detik. Setelah "Set SPP"/edit, halaman manggil
    // ulang fetch tapi browser ngasih data lama dari cache -> nominal SPP
    // kelihatannya belum keupdate sampai user refresh manual (hard refresh
    // yang skip cache). Ini akar masalah bug #2.
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: any) {
    console.error("[GET /api/kelas] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data kelas: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    if (!body.namaKelas || !body.tingkat) {
      return NextResponse.json({ error: "namaKelas dan tingkat wajib diisi" }, { status: 400 });
    }

    const namaKelasTrim = String(body.namaKelas).trim();
    const tingkatNum = Number(body.tingkat);

    // Cek duplikat manual: model Kelas gak punya @@unique constraint di
    // schema, jadi P2002 di bawah gak pernah kepicu. Duplikat dianggap sama
    // kalau namaKelas DAN tingkat-nya identik — karena jurusan yang sama
    // boleh punya kelas beda tingkat (mis. "RPL 1" tingkat 10 vs 11 itu sah,
    // bukan duplikat). Gak pakai mode:"insensitive" karena provider MySQL
    // gak dukung opsi itu di Prisma — tapi collation default MySQL
    // (utf8mb4_general_ci/unicode_ci) udah case-insensitive secara native.
    const existing = await prisma.kelas.findFirst({
      where: {
        tingkat: tingkatNum,
        namaKelas: namaKelasTrim,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Kelas "${namaKelasTrim}" tingkat ${tingkatNum} sudah ada.` },
        { status: 400 }
      );
    }

    const kelas = await prisma.kelas.create({
      data: {
        namaKelas: namaKelasTrim,
        tingkat: tingkatNum,
        ...(body.nominalSpp !== undefined ? { nominalSpp: Number(body.nominalSpp) } : {}),
        ...(body.waliKelas !== undefined ? { waliKelas: String(body.waliKelas).trim() } : {}),
      },
    });
    return NextResponse.json(kelas, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/kelas] Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Nama kelas sudah ada, gunakan nama kelas lain." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Gagal menyimpan kelas: " + (error.message || "Terjadi kesalahan pada server") },
      { status: 500 }
    );
  }
}
