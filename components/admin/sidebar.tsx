"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  IconDashboard, IconUsers, IconLayers, IconCalendar, IconReceipt,
  IconChart, IconSettings, IconLogout, IconMenu, IconX, IconChevronLeft, IconMegaphone,
} from "./icons";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: IconDashboard },
  { href: "/admin/siswa", label: "Siswa", icon: IconUsers },
  { href: "/admin/kelas", label: "Kelas", icon: IconLayers },
  { href: "/admin/tahun-ajaran", label: "Tahun Ajaran", icon: IconCalendar },
  { href: "/admin/tagihan", label: "Tagihan", icon: IconReceipt },
  { href: "/admin/laporan", label: "Laporan", icon: IconChart },
  { href: "/admin/pengumuman", label: "Pengumuman", icon: IconMegaphone },
];

interface AdminShellProps {
  role: "owner" | "petugas";
  userName: string;
  children: React.ReactNode;
}

/**
 * Satu komponen client yang megang SEMUA state UI (collapsed desktop + open/close
 * mobile drawer) di 1 tempat, terus dipakai bareng buat sidebar & <main> supaya
 * margin-left <main> selalu sinkron sama lebar sidebar yang lagi ke-render.
 */
export function AdminShell({ role, userName, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Tutup drawer mobile otomatis tiap pindah halaman.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  const items = role === "owner"
    ? [...NAV_ITEMS, { href: "/admin/settings", label: "Settings", icon: IconSettings }]
    : NAV_ITEMS;

  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="app-shell">
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
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`app-sidebar__link ${active ? "active" : ""}`}>
                <Icon />
                <span className="app-sidebar__label">{item.label}</span>
              </Link>
            );
          })}
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
