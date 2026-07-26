import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { buatExportWorkbook } from "@/lib/excel-siswa";
import { requireApiRole } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireApiRole(["owner", "petugas"]);
  if (error) return error;

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
