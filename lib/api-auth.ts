import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export type Peran = "owner" | "petugas" | "siswa";

/** Sesi yang sudah DIPASTIKAN ada (bukan null). */
export type SesiTervalidasi = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/**
 * PENTING: branch sukses pakai `SesiTervalidasi` (NonNullable), BUKAN tipe
 * mentah dari `auth.api.getSession` yang masih mengandung `null`. Kalau pakai
 * tipe mentah, TypeScript strict tetap menganggap `session` bisa null setelah
 * `if (error) return error;` — akibatnya setiap pemakaian `session.user.x`
 * (mis. app/api/pendapatan, /pengeluaran, /users/[id]) gagal compile dengan
 * "'session' is possibly 'null'". Narrowing lewat discriminant `error` cuma
 * menghapus branch gagal, bukan `null` di dalam branch sukses.
 */
type HasilCekPeran =
  | { session: SesiTervalidasi; error: null }
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
