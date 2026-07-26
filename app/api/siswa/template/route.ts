import { NextResponse } from "next/server";
import { buatTemplateWorkbook } from "@/lib/excel-siswa";

export async function GET() {
  try {
    const uint8Buffer = buatTemplateWorkbook();

    return new NextResponse(uint8Buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="template-import-siswa.xlsx"',
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("[GET /api/siswa/template] Error:", error);
    return NextResponse.json({ error: "Gagal membuat template Excel" }, { status: 500 });
  }
}
