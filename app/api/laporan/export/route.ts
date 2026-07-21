import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { buatLaporanWorkbook } from "@/lib/excel-laporan";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const wb = buatLaporanWorkbook(daftar);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-tagihan-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
