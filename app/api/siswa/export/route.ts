import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { buatExportWorkbook } from "@/lib/excel-siswa";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kelasId = searchParams.get("kelasId") || undefined;
  const status = searchParams.get("status") || undefined;

  const daftar = await prisma.siswa.findMany({
    where: {
      ...(kelasId ? { kelasId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: { kelas: true, akun: { select: { email: true } } },
    orderBy: { namaLengkap: "asc" },
  });

  const wb = buatExportWorkbook(daftar);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="data-siswa-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
