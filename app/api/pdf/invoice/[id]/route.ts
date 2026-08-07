import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generatePdfFromPath } from "@/lib/generate-pdf";
import { getInternalOrigin } from "@/lib/request-context";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tagihan = await prisma.tagihanSpp.findUnique({
    where: { id },
    select: { id: true, bulan: true, tahun: true, siswa: { select: { namaLengkap: true, akunId: true } } },
  });
  if (!tagihan) {
    return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  }

  const isAdmin = session.user.role === "owner" || session.user.role === "petugas";
  const isOwner = tagihan.siswa?.akunId === session.user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const { origin, cookieHeader } = await getInternalOrigin();
    const pdfBuffer = await generatePdfFromPath({
      origin,
      path: `/invoice/${id}`,
      cookieHeader,
    });

    const invoiceNo = `INV-${tagihan.tahun}-${String(tagihan.bulan).padStart(2, "0")}-${id.slice(-5).toUpperCase()}`;
    const filename = `Invoice_${tagihan.siswa?.namaLengkap.replace(/\s+/g, "_") || "SPP"}_${invoiceNo}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/pdf/invoice/:id] Gagal generate PDF:", error);
    return NextResponse.json({ error: "Gagal generate PDF: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
