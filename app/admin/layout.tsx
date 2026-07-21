import { requireRole } from "@/lib/require-role";
import { AdminShell } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["owner", "petugas"]);
  const role = session.user.role as "owner" | "petugas";

  return (
    <AdminShell role={role} userName={session.user.name || "Admin"}>
      {children}
    </AdminShell>
  );
}
