import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function checkAccess() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) return null;
  return session;
}

export async function GET(req: NextRequest) {
  try {
    const session = await checkAccess();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get("bulan");
    const tahun = searchParams.get("tahun");
    const kelasId = searchParams.get("kelasId");
    const status = searchParams.get("status");
    const q = searchParams.get("q") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {
      ...(bulan ? { bulan: Number(bulan) } : {}),
      ...(tahun ? { tahun: Number(tahun) } : {}),
      ...(status ? { status: status as never } : {}),
      ...(kelasId ? { siswa: { kelasId } } : {}),
    };

    if (q) {
      where.siswa = {
        ...(where.siswa || {}),
        OR: [
          { namaLengkap: { contains: q } },
          { nis: { contains: q } },
          { nisn: { contains: q } },
        ],
      };
    }

    if (startDate || endDate) {
      where.jatuhTempo = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate + "T23:59:59.999Z") } : {}),
      };
    }

    const daftar = await prisma.tagihanSpp.findMany({
      where,
      include: {
        siswa: { select: { namaLengkap: true, nis: true, nisn: true, kelas: true } },
        pembayaran: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    });

    const ringkasan = daftar.reduce(
      (acc, t) => {
        acc.totalTagihan += 1;
        acc.totalNominal += t.nominal;
        if (t.status === "lunas") {
          acc.totalLunas += 1;
          acc.nominalLunas += t.nominal;
        } else {
          acc.totalBelumLunas += 1;
          acc.nominalBelumLunas += t.nominal;
        }
        return acc;
      },
      { totalTagihan: 0, totalNominal: 0, totalLunas: 0, nominalLunas: 0, totalBelumLunas: 0, nominalBelumLunas: 0 }
    );

    return NextResponse.json({ ringkasan, daftar });
  } catch (error: any) {
    console.error("[GET /api/laporan] Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat laporan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
