import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { bulan, tahun, nominal, tahunAjaranId, jatuhTempo } = body;

  if (!bulan || !tahun || !nominal || !tahunAjaranId || !jatuhTempo) {
    return NextResponse.json(
      { error: "bulan, tahun, nominal, tahunAjaranId, dan jatuhTempo wajib diisi" },
      { status: 400 }
    );
  }

  const siswaAktif = await prisma.siswa.findMany({
    where: { status: "aktif" },
    select: { id: true },
  });

  const existing = await prisma.tagihanSpp.findMany({
    where: { tahunAjaranId, bulan: Number(bulan), tahun: Number(tahun) },
    select: { siswaId: true },
  });
  const sudahAda = new Set(existing.map((t) => t.siswaId));

  const siswaBaru = siswaAktif.filter((s) => !sudahAda.has(s.id));

  if (siswaBaru.length === 0) {
    return NextResponse.json({ dibuat: 0, dilewati: siswaAktif.length });
  }

  await prisma.tagihanSpp.createMany({
    data: siswaBaru.map((s) => ({
      siswaId: s.id,
      tahunAjaranId,
      bulan: Number(bulan),
      tahun: Number(tahun),
      nominal: Number(nominal),
      jatuhTempo: new Date(jatuhTempo),
      status: "belum_bayar" as const,
    })),
  });

  return NextResponse.json({
    dibuat: siswaBaru.length,
    dilewati: siswaAktif.length - siswaBaru.length,
  });
}
