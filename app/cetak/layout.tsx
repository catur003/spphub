import type { Metadata } from "next";

// Halaman /cetak/* sengaja TIDAK bernaung di bawah app/admin/layout.tsx
// (yang punya sidebar/topbar) — ini dokumen bersih yang didesain dari nol
// buat kertas A4, dibuka langsung oleh Puppeteer (lihat lib/generate-pdf.ts)
// maupun dilihat manual oleh admin lewat tombol "Cetak PDF".
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CetakLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#e2e8f0]">{children}</div>;
}
