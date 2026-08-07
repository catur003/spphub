import { NextResponse } from "next/server";
import { buatTemplateWorkbook } from "@/lib/excel-siswa";
import { requireApiRole } from "@/lib/api-auth";

export async function GET() {
  try {
    // Dulu endpoint ini gak ada auth check sama sekali — beda sendiri dari
    // seluruh API lain di proyek ini yang konsisten pakai requireApiRole().
    // Isinya cuma template kosong (bukan data siswa asli), jadi risikonya
    // rendah, tapi tetap membocorkan struktur kolom internal (nama field
    // yang dipakai sistem import) ke siapa pun tanpa login. Endpoint ini
    // cuma dipakai dari halaman admin import siswa, jadi dibatasi sama
    // seperti POST /api/siswa/import (owner/petugas).
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const uint8Buffer = buatTemplateWorkbook();

    return new NextResponse(new Uint8Array(uint8Buffer), {
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
