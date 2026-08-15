import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPP Sekolah Digital",
  description: "Sistem pembayaran SPP sekolah",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}
      <script defer src="https://zenin.my.id/track.js?v=2" data-site="cmsugskcv000lem1hdc7s873p"></script>
      </body>
    </html>
  );
}
