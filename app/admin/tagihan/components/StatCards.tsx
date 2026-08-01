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
    { icon: <IconClipboard className="h-4 w-4" />, bg: "bg-accent-soft", value: totalTagihan, label: "Total Tagihan (Tampil)" },
    { icon: <IconCheckCircle className="h-4 w-4" />, bg: "bg-green-100", value: totalLunas, label: "Sudah Lunas" },
    { icon: <IconClock className="h-4 w-4" />, bg: "bg-red-100", value: totalBelum, label: "Belum / Terlambat" },
    {
      icon: <IconMoney className="h-4 w-4" />,
      bg: "bg-green-50",
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
          className="rounded-card border border-border-soft bg-white p-[1.1rem] shadow-sm2"
        >
          <div
            className={`mb-2 flex h-9 w-9 items-center justify-center rounded-control ${c.bg}`}
          >
            {c.icon}
          </div>
          <div className={`font-extrabold text-ink-900 ${c.small ? "text-[1.1rem]" : "text-2xl"}`}>
            {c.value}
          </div>
          <div className="text-xs font-medium text-ink-500">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
