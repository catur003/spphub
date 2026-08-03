import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { syncNominalKosongLain } from "@/lib/tagihan-nominal";

export async function POST(_req: NextRequest) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const updatedCount = await syncNominalKosongLain();

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Berhasil menyinkronkan ${updatedCount} tagihan Rp 0 menjadi nominal default jenis tagihannya masing-masing.`,
    });
  } catch (error: any) {
    console.error("[POST /api/tagihan-lain/sync-nominal] Error:", error);
    return NextResponse.json(
      { error: "Gagal menyinkronkan nominal: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
