import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const bulan = searchParams.get("bulan");
  const tahun = searchParams.get("tahun");
  const kelasId = searchParams.get("kelasId") || undefined;
  const tingkat = searchParams.get("tingkat") || undefined;
  const q = searchParams.get("q") || undefined;

  const siswaFilter =
    kelasId
      ? { kelasId }
      : tingkat
      ? { kelas: { tingkat: Number(tingkat) } }
      : undefined;

  const qFilter = q
    ? {
        OR: [
          { namaLengkap: { contains: q } },
          { nis: { contains: q } },
          { nisn: { contains: q } },
        ],
      }
    : undefined;

  const siswaWhere =
    siswaFilter || qFilter
      ? { ...(siswaFilter || {}), ...(qFilter || {}) }
      : undefined;

  try {
    const tagihan = await prisma.tagihanSpp.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(bulan ? { bulan: Number(bulan) } : {}),
        ...(tahun ? { tahun: Number(tahun) } : {}),
        ...(siswaWhere ? { siswa: siswaWhere } : {}),
      },
      select: {
        id: true,
        bulan: true,
        tahun: true,
        nominal: true,
        status: true,
        jatuhTempo: true,
        siswa: {
          select: {
            id: true,
            namaLengkap: true,
            nis: true,
            nisn: true,
            jenisKelamin: true,
            namaWali: true,
            kontakWali: true,
            fotoUrl: true,
            kelas: { select: { id: true, namaKelas: true, tingkat: true, waliKelas: true } },
          },
        },
      },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      take: q ? 50 : 300,
    });

    const res = NextResponse.json(tagihan);
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
    return res;
  } catch (error: any) {
    console.error("[GET /api/tagihan] error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
