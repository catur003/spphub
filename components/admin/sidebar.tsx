"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  IconDashboard, IconUsers, IconLayers, IconCalendar, IconReceipt,
  IconChart, IconSettings, IconLogout, IconMenu, IconX, IconChevronLeft, IconMegaphone,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isSubItem?: boolean;
};

type NavGroup = {
  header?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ href: "/admin/dashboard", label: "Dashboard", icon: IconDashboard }],
  },
  {
    header: "MASTER",
    items: [
      { href: "/admin/siswa", label: "Siswa", icon: IconUsers },
      { href: "/admin/kelas", label: "Kelas", icon: IconLayers },
      { href: "/admin/tahun-ajaran", label: "Tahun Ajaran", icon: IconCalendar },
    ],
  },
  {
    header: "TRANSAKSI",
    items: [
      { href: "/admin/tagihan", label: "Tagihan SPP", icon: IconReceipt },
      { href: "/admin/keuangan/pendapatan", label: "Pembayaran (Kas)", icon: IconReceipt, isSubItem: true },
      { href: "/admin/keuangan/utang-pegawai", label: "Utang Pegawai", icon: IconUsers, isSubItem: true },
    ],
  },
  {
    header: "LAPORAN",
    items: [
      { href: "/admin/keuangan/laporan", label: "Laporan Kas", icon: IconChart },
      { href: "/admin/laporan", label: "Laporan SPP", icon: IconChart },
    ],
  },
  {
    header: "SISTEM",
    items: [
      { href: "/admin/pengumuman", label: "Pengumuman", icon: IconMegaphone },
      { href: "/admin/pengguna", label: "Kelola User", icon: IconUsers },
    ],
  },
];

interface AdminShellProps {
  role: "owner" | "petugas";
  userName: string;
  children: React.ReactNode;
}

export function AdminShell({ role, userName, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  const groups = NAV_GROUPS.map((g) => {
    if (g.header === "SISTEM" && role === "owner") {
      return {
        ...g,
        items: [
          ...g.items,
          { href: "/admin/settings", label: "Pengaturan", icon: IconSettings },
        ],
      };
    }
    return g;
  });

  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="app-shell">
      <style>{`
        .sidebar-group-header {
          font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: rgba(255,255,255,0.45);
          padding: 0.75rem 0.9rem 0.25rem 0.9rem; margin-top: 0.4rem;
        }
        .app-sidebar.collapsed .sidebar-group-header { display: none; }
        .sub-menu-indent {
          margin-left: 14px;
          border-left: 2px solid rgba(255,255,255,0.12);
          padding-left: 6px;
        }
        .app-sidebar.collapsed .sub-menu-indent { margin-left: 0; padding-left: 0; border-left: none; }
      `}</style>

      {/* Topbar khusus mobile */}
      <div className="app-topbar">
        <button className="app-topbar__menu-btn" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
          <IconMenu width={20} height={20} />
        </button>
        <span className="fw-semibold" style={{ fontSize: "0.95rem" }}>SPP Admin</span>
      </div>

      <div className={`app-sidebar__backdrop ${mobileOpen ? "show" : ""}`} onClick={() => setMobileOpen(false)} />

      <aside className={`app-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="app-sidebar__brand">
          <div className="app-sidebar__brand-badge">SP</div>
          <span className="app-sidebar__brand-text">SPP Sekolah Digital</span>
          <button
            className="app-topbar__menu-btn d-lg-none ms-auto"
            style={{ background: "transparent", borderColor: "rgba(255,255,255,0.15)", color: "white" }}
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          >
            <IconX width={18} height={18} />
          </button>
        </div>

        <button
          className="app-sidebar__collapse-btn d-none d-lg-flex"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        >
          <IconChevronLeft />
        </button>

        <nav className="app-sidebar__nav">
          {groups.map((group, idx) => (
            <div key={idx}>
              {group.header && (
                <div className="sidebar-group-header">{group.header}</div>
              )}
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`app-sidebar__link ${active ? "active" : ""} ${item.isSubItem ? "sub-menu-indent" : ""}`}
                  >
                    <Icon />
                    <span className="app-sidebar__label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="app-sidebar__foot">
          <div className="app-sidebar__avatar">{initials || "U"}</div>
          <div className="app-sidebar__foot-text">
            <div className="text-white" style={{ fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.2 }}>
              {userName}
            </div>
            <small>{role === "owner" ? "Owner" : "Petugas"}</small>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Keluar"
            style={{ background: "transparent", border: "none", color: "var(--sidebar-ink-dim)", flexShrink: 0 }}
          >
            <IconLogout width={18} height={18} />
          </button>
        </div>
      </aside>

      <main className={`app-main ${collapsed ? "collapsed" : ""}`}>
        <div className="app-page-enter">{children}</div>
      </main>
    </div>
  );
}
