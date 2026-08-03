"use client";

import { IconPrinter } from "@/components/admin/icons";

export default function PrintButton({ label = "Cetak Printer" }: { label?: string }) {
  return (
    <button
      className="rounded-full border border-border-soft bg-white px-4 py-1.5 text-sm font-semibold text-ink-700 transition hover:bg-surface print:hidden"
      onClick={() => window.print()}
    >
      <span className="inline-flex items-center gap-1.5">
        <IconPrinter className="h-4 w-4" /> {label}
      </span>
    </button>
  );
}
