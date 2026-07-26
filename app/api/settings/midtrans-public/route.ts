import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Endpoint publik untuk mengambil client key Midtrans yang aman dikirim ke frontend
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "siswa") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.pengaturanPembayaran.findFirst();
  if (!settings) {
    return NextResponse.json({ error: "Settings belum dikonfigurasi" }, { status: 404 });
  }

  const isProd = settings.environment === "production";
  const clientKey = isProd ? settings.productionClientKey : settings.sandboxClientKey;

  if (!clientKey) {
    return NextResponse.json({ error: "Client key belum dikonfigurasi" }, { status: 404 });
  }

  return NextResponse.json({ clientKey, isProd });
}
