import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiRole(["owner", "petugas"]);
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.arsipDigital.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting arsip:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
