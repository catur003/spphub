import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { fetchInternal } from "@/lib/server-fetch";
import KopSurat from "@/components/cetak/KopSurat";
import PrintButton from "@/components/cetak/PrintButton";
import { IconDownload } from "@/components/admin/icons";

function rupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default async function CetakLaporanKeuanganPage({
  searchParams,
}: {
  searchParams: Promise<{ orientation?: string }>;
}) {
  await requireRole(["owner", "petugas"]);
  const sp = await searchParams;
  const orientation = sp.orientation === "landscape" ? "landscape" : "portrait";

  const [dashRes, profil] = await Promise.all([
    fetchInternal("/api/dashboard"),
    prisma.profilSekolah.findFirst(),
  ]);
  const d = dashRes.ok ? await dashRes.json() : null;

  const data = {
    totalPemasukan: d?.saldoKas || 0,
    labaRugiNet: d?.labaRugi || 0,
    totalUtangPegawaiAktif: d?.utangPegawaiTotal || 0,
    sppTunggakanTotal: d?.sppBelumDibayarTotal || 0,
    pendapatanBulanIni: d?.pendapatanBulanIni || 0,
  };

  return (
    <div className="mx-auto w-full max-w-[900px] p-4 print:p-0">
      <style>{`@page { size: A4 ${orientation}; margin: 14mm 12mm; }`}</style>

      {/* Kontrol — gak ikut tercetak/ke-PDF */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/admin/keuangan/laporan" className="rounded-full border border-border-soft bg-white px-4 py-1.5 text-sm font-semibold text-ink-700 transition hover:bg-surface">
          ← Kembali
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-full border border-border-soft bg-white text-sm font-semibold">
            <Link href="/cetak/laporan-keuangan?orientation=portrait" className={`px-3 py-1.5 ${orientation === "portrait" ? "bg-accent text-white" : "text-ink-700 hover:bg-surface"}`}>
              Portrait
            </Link>
            <Link href="/cetak/laporan-keuangan?orientation=landscape" className={`px-3 py-1.5 ${orientation === "landscape" ? "bg-accent text-white" : "text-ink-700 hover:bg-surface"}`}>
              Landscape
            </Link>
          </div>
          <PrintButton />
          <a
            href={`/api/pdf/laporan-keuangan?orientation=${orientation}`}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-white transition hover:bg-accent-hover"
          >
            <span className="inline-flex items-center gap-1.5"><IconDownload className="h-4 w-4" /> Download PDF</span>
          </a>
        </div>
      </div>

      {/* Dokumen A4 */}
      <div className="rounded-card bg-white p-8 shadow-sm2 print:rounded-none print:p-0 print:shadow-none">
        <KopSurat profil={profil} judul="Laporan Keuangan Sekolah" subjudul={`Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`} />

        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr style={{ breakInside: "avoid" }}>
              <td className="border border-ink-900/10 px-3 py-2.5 text-ink-700">Total Saldo Kas Utama</td>
              <td className="border border-ink-900/10 px-3 py-2.5 text-right font-bold text-accent">{rupiah(data.totalPemasukan)}</td>
            </tr>
            <tr style={{ breakInside: "avoid" }}>
              <td className="border border-ink-900/10 px-3 py-2.5 text-ink-700">Pendapatan SPP Bulan Ini</td>
              <td className="border border-ink-900/10 px-3 py-2.5 text-right font-bold text-ink-900">{rupiah(data.pendapatanBulanIni)}</td>
            </tr>
            <tr style={{ breakInside: "avoid" }}>
              <td className="border border-ink-900/10 px-3 py-2.5 text-ink-700">Laba / Rugi Net (Surplus)</td>
              <td className="border border-ink-900/10 px-3 py-2.5 text-right font-bold text-status-lunas">{rupiah(data.labaRugiNet)}</td>
            </tr>
            <tr style={{ breakInside: "avoid" }}>
              <td className="border border-ink-900/10 px-3 py-2.5 text-ink-700">Total Sisa Utang Pegawai (Kasbon)</td>
              <td className="border border-ink-900/10 px-3 py-2.5 text-right font-bold text-status-terlambat">{rupiah(data.totalUtangPegawaiAktif)}</td>
            </tr>
            <tr style={{ breakInside: "avoid" }}>
              <td className="border border-ink-900/10 px-3 py-2.5 text-ink-700">Total Piutang SPP Belum Dibayar</td>
              <td className="border border-ink-900/10 px-3 py-2.5 text-right font-bold text-status-belum">{rupiah(data.sppTunggakanTotal)}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-4 text-xs italic text-ink-500">
          Rekap ini bersifat akumulatif (all-time) berdasarkan data sistem SPP Sekolah Digital per tanggal cetak di atas.
        </p>

        <div className="mt-10 flex items-end justify-between text-xs text-ink-500">
          <div>Dicetak pada: {new Date().toLocaleString("id-ID")}</div>
          <div className="min-w-[160px] text-center">
            <div className="mb-10">Mengetahui, Kepala Sekolah / Yayasan</div>
            <div className="border-b border-ink-900/30 pb-1 font-semibold text-ink-900">{profil?.nama || "Administrasi Keuangan"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
