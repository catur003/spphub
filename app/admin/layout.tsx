import { requireRole } from "@/lib/require-role";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["owner", "petugas"]);

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      <nav className="bg-dark text-white p-3" style={{ width: 220, flexShrink: 0 }}>
        <h5 className="mb-4">SPP Admin</h5>
        <ul className="nav nav-pills flex-column gap-1">
          <li className="nav-item">
            <Link className="nav-link text-white" href="/admin/dashboard">Dashboard</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link text-white" href="/admin/siswa">Siswa</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link text-white" href="/admin/kelas">Kelas</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link text-white" href="/admin/tahun-ajaran">Tahun Ajaran</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link text-white" href="/admin/tagihan">Tagihan</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link text-white" href="/admin/laporan">Laporan</Link>
          </li>
          {session.user.role === "owner" && (
            <li className="nav-item">
              <Link className="nav-link text-white" href="/admin/settings">Settings</Link>
            </li>
          )}
        </ul>
      </nav>
      <main className="flex-grow-1 bg-light">{children}</main>
    </div>
  );
}
