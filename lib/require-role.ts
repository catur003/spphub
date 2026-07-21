import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type Peran = "owner" | "petugas" | "siswa";

export async function requireRole(allowed: Peran[]) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  if (!allowed.includes(session.user.role as Peran)) {
    redirect("/login");
  }

  return session;
}
