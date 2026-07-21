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
  const session = await checkAccess();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bulan = searchParams.get("bulan");
  const tahun = searchParams.get("tahun");
  const kelasId = searchParams.get("kelasId");

  const where = {
    ...(bulan ? { bulan: Number(bulan) } : {}),
    ...(tahun ? { tahun: Number(tahun) } : {}),
    ...(kelasId ? { siswa: { kelasId } } : {}),
  };

  const daftar = await prisma.tagihanSpp.findMany({
    where,
    include: { siswa: { select: { namaLengkap: true, nis: true, kelas: true } } },
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
}
