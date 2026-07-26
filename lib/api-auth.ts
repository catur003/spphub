import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export type Peran = "owner" | "petugas" | "siswa";

type HasilCekPeran =
  | { session: Awaited<ReturnType<typeof auth.api.getSession>>; error: null }
  | { session: null; error: NextResponse };

/**
 * Satu-satunya tempat logic "cek login + cek role" untuk semua API route.
 * Sebelumnya logic ini di-copy-paste di ~25 file berbeda — sekarang tinggal:
 *
 *   const { session, error } = await requireApiRole(["owner", "petugas"]);
 *   if (error) return error;
 *
 * Ganti aturan role cukup di 1 tempat ini.
 */
export async function requireApiRole(allowed: Peran[]): Promise<HasilCekPeran> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !allowed.includes(session.user.role as Peran)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, error: null };
}

/** Sama seperti requireApiRole, tapi pesan error khusus buat aksi yang hanya boleh Owner. */
export async function requireApiOwner(): Promise<HasilCekPeran> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== "owner") {
    return {
      session: null,
      error: NextResponse.json({ error: "Hanya Owner yang boleh mengakses ini" }, { status: 403 }),
    };
  }

  return { session, error: null };
}
