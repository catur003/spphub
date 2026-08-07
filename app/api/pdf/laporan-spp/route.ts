import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generatePdfFromPath } from "@/lib/generate-pdf";
import { getInternalOrigin } from "@/lib/request-context";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { origin, cookieHeader } = await getInternalOrigin();
    const qs = req.nextUrl.search; // termasuk ?bulan=...&tahun=...&orientation=...
    const pdfBuffer = await generatePdfFromPath({
      origin,
      path: `/cetak/laporan-spp${qs}`,
      cookieHeader,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Laporan_SPP_${stamp}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/pdf/laporan-spp] Gagal generate PDF:", error);
    return NextResponse.json({ error: "Gagal generate PDF: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
