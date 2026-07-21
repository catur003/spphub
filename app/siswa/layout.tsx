import { requireRole } from "@/lib/require-role";

export default async function SiswaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["siswa"]);

  return <>{children}</>;
}
