import { NextResponse } from "next/server";
import { buatTemplateWorkbook } from "@/lib/excel-siswa";
import { requireApiRole } from "@/lib/api-auth";

export async function GET() {
  try {
    // Satu-satunya route /api/siswa/* yang dulu kebuka tanpa login. Isinya
    // "cuma" template kosong, tapi tetap membocorkan struktur data internal
    // ke publik dan gak ada alasan endpoint ini bisa diakses tanpa sesi —
    // yang butuh template cuma admin di halaman Import Siswa.
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

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
