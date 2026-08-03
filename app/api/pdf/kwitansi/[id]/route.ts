import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generatePdfFromPath } from "@/lib/generate-pdf";
import { getInternalOrigin } from "@/lib/request-context";

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Cek otorisasi sekali di sini dulu, biar gagal cepat (401/403) daripada
  // buang waktu buka Chromium buat nge-capture halaman /login.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tagihan = await prisma.tagihanSpp.findUnique({
    where: { id },
    select: { id: true, bulan: true, tahun: true, siswa: { select: { namaLengkap: true, akunId: true } } },
  });
  if (!tagihan) {
    return NextResponse.json({ error: "Kwitansi tidak ditemukan" }, { status: 404 });
  }

  const isAdmin = session.user.role === "owner" || session.user.role === "petugas";
  const isOwner = tagihan.siswa.akunId === session.user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const { origin, cookieHeader } = await getInternalOrigin();
    const pdfBuffer = await generatePdfFromPath({
      origin,
      path: `/kwitansi/${id}`,
      cookieHeader,
    });

    const filename = `Kwitansi_SPP_${tagihan.siswa.namaLengkap.replace(/\s+/g, "_")}_${BULAN_LABEL[tagihan.bulan]}_${tagihan.tahun}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/pdf/kwitansi/:id] Gagal generate PDF:", error);
    return NextResponse.json({ error: "Gagal generate PDF: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
