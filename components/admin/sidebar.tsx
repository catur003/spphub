"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  IconDashboard, IconUsers, IconLayers, IconCalendar, IconReceipt,
  IconChart, IconSettings, IconLogout, IconMenu, IconX, IconChevronLeft, IconMegaphone,
  IconMoney,
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
    header: "SPP",
    items: [
      { href: "/admin/tagihan", label: "Tagihan SPP", icon: IconReceipt },
      { href: "/admin/laporan", label: "Laporan SPP", icon: IconChart, isSubItem: true },
    ],
  },
  // NOTE: grup "Tagihan Lainnya" (seragam, pendaftaran/daftar ulang, dll)
  // BELUM dipasang di sini sengaja — halamannya belum dibikin (lihat
  // RENCANA-LANJUTAN.md Fase 3). Nge-link ke halaman yang belum ada bakal
  // jadi menu mati/404. Tambahin grup ini pas fiturnya udah jadi:
  // { header: "TAGIHAN LAINNYA", items: [
  //   { href: "/admin/tagihan-lainnya", label: "Tagihan Lainnya", icon: ... },
  //   { href: "/admin/tagihan-lainnya/laporan", label: "Laporan", icon: ..., isSubItem: true },
  // ]},
  {
    header: "KEUANGAN",
    items: [
      { href: "/admin/keuangan/pendapatan", label: "Kelola Pendapatan", icon: IconMoney },
      { href: "/admin/keuangan/pengeluaran", label: "Kelola Pengeluaran", icon: IconMoney },
      { href: "/admin/keuangan/utang-pegawai", label: "Utang Pegawai", icon: IconUsers },
      { href: "/admin/keuangan/laporan", label: "Laporan Kas", icon: IconChart, isSubItem: true },
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
    <div className="min-h-screen bg-surface">
      {/* Topbar khusus mobile */}
      <div className="sticky top-0 z-[1020] flex h-[60px] items-center gap-3 border-b border-border-soft bg-white px-4 min-[992px]:hidden">
        <button
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-control border border-border-soft bg-white text-ink-700 transition hover:bg-surface"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka menu"
        >
          <IconMenu width={20} height={20} />
        </button>
        <span className="text-[0.95rem] font-semibold">SPP Admin</span>
      </div>

      <div
        className={`fixed inset-0 z-[1035] bg-slate-900/50 transition-opacity duration-[250ms] ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-[1040] flex flex-col bg-gradient-to-b from-sidebar-bg to-sidebar-bg2 text-sidebar-ink shadow-lg2 transition-[width,transform] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          collapsed ? "w-[76px]" : "w-[260px]"
        } max-[991.98px]:w-[min(78vw,280px)] max-[991.98px]:-translate-x-full ${
          mobileOpen ? "max-[991.98px]:translate-x-0" : ""
        }`}
      >
        <div className="flex min-h-[60px] items-center gap-[0.65rem] overflow-hidden whitespace-nowrap border-b border-white/[0.08] p-[1.1rem]">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-accent text-[0.95rem] font-bold text-white">
            SP
          </div>
          <span
            className={`text-[0.95rem] font-semibold text-white transition-opacity duration-150 ${
              collapsed ? "pointer-events-none w-0 opacity-0 max-[991.98px]:pointer-events-auto max-[991.98px]:w-auto max-[991.98px]:opacity-100" : ""
            }`}
          >
            SPP Sekolah Digital
          </span>
          <button
            className="ml-auto flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-control border border-white/15 bg-transparent text-white min-[992px]:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          >
            <IconX width={18} height={18} />
          </button>
        </div>

        <button
          className={`absolute right-[-13px] top-[1.15rem] hidden h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-surface bg-accent text-white transition hover:bg-accent-hover min-[992px]:flex ${
            collapsed ? "[&>svg]:rotate-180" : ""
          }`}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        >
          <IconChevronLeft />
        </button>

        <nav className="flex flex-1 flex-col gap-[0.2rem] overflow-y-auto p-[0.9rem_0.7rem]">
          {groups.map((group, idx) => (
            <div key={idx}>
              {group.header && (
                <div
                  className={`mt-[0.4rem] p-[0.75rem_0.9rem_0.25rem_0.9rem] text-[0.65rem] font-bold uppercase tracking-[0.08em] text-white/45 ${
                    collapsed ? "hidden" : ""
                  }`}
                >
                  {group.header}
                </div>
              )}
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-[0.85rem] overflow-hidden whitespace-nowrap rounded-control p-[0.62rem_0.75rem] text-[0.89rem] font-medium text-sidebar-ink transition-colors hover:bg-white/[0.06] hover:text-white ${
                      active ? "bg-sidebar-active text-white shadow-md2" : ""
                    } ${
                      item.isSubItem && !collapsed
                        ? "ml-[14px] border-l-2 border-white/[0.12] pl-[6px]"
                        : ""
                    }`}
                  >
                    <Icon className="h-[19px] w-[19px] shrink-0" />
                    <span
                      className={`transition-opacity duration-150 ${
                        collapsed ? "pointer-events-none w-0 opacity-0 max-[991.98px]:pointer-events-auto max-[991.98px]:w-auto max-[991.98px]:opacity-100" : ""
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-[0.65rem] overflow-hidden whitespace-nowrap border-t border-white/[0.08] p-[0.9rem]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[0.78rem] font-semibold text-white">
            {initials || "U"}
          </div>
          <div
            className={`min-w-0 flex-1 transition-opacity duration-150 ${
              collapsed ? "pointer-events-none w-0 opacity-0 max-[991.98px]:pointer-events-auto max-[991.98px]:w-auto max-[991.98px]:opacity-100" : ""
            }`}
          >
            <div className="text-[0.82rem] font-semibold leading-tight text-white">{userName}</div>
            <small className="text-sidebar-ink-dim">{role === "owner" ? "Owner" : "Petugas"}</small>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Keluar"
            className="shrink-0 border-none bg-transparent text-sidebar-ink-dim"
          >
            <IconLogout width={18} height={18} />
          </button>
        </div>
      </aside>

      <main
        className={`min-h-screen transition-[margin-left] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] max-[991.98px]:!ml-0 ${
          collapsed ? "ml-[76px]" : "ml-[260px]"
        }`}
      >
        <div className="animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
}
