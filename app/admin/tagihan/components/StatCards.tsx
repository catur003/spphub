"use client";

import { formatRupiah } from "../types";
import { IconClipboard, IconCheckCircle, IconClock, IconMoney } from "@/components/admin/icons";

type Props = {
  totalTagihan: number;
  totalLunas: number;
  totalBelum: number;
  totalNominal: number;
};

export default function StatCards({ totalTagihan, totalLunas, totalBelum, totalNominal }: Props) {
  const cards = [
    {
      icon: <IconClipboard className="h-4 w-4" />,
      accent: "border-l-sky-500 bg-sky-50/60",
      badgeBg: "bg-sky-100",
      valueColor: "text-sky-700",
      value: totalTagihan,
      label: "Total Tagihan (Tampil)",
    },
    {
      icon: <IconCheckCircle className="h-4 w-4" />,
      accent: "border-l-status-lunas bg-emerald-50/60",
      badgeBg: "bg-emerald-100",
      valueColor: "text-status-lunas",
      value: totalLunas,
      label: "Sudah Lunas",
    },
    {
      icon: <IconClock className="h-4 w-4" />,
      accent: "border-l-status-terlambat bg-red-50/60",
      badgeBg: "bg-red-100",
      valueColor: "text-status-terlambat",
      value: totalBelum,
      label: "Belum / Terlambat",
    },
    {
      icon: <IconMoney className="h-4 w-4" />,
      accent: "border-l-accent bg-accent-soft/60",
      badgeBg: "bg-accent-soft",
      valueColor: "text-accent-hover",
      value: formatRupiah(totalNominal),
      label: "Total Nominal",
      small: true,
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-card border-l-4 p-[1.1rem] shadow-sm2 ${c.accent}`}
        >
          <div
            className={`mb-2 flex h-9 w-9 items-center justify-center rounded-control ${c.badgeBg} ${c.valueColor}`}
          >
            {c.icon}
          </div>
          <div className={`font-extrabold ${c.valueColor} ${c.small ? "text-[1.1rem]" : "text-2xl"}`}>
            {c.value}
          </div>
          <div className="text-xs font-medium text-ink-500">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
