import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import KopSurat from "@/components/cetak/KopSurat";
import PrintButton from "@/components/cetak/PrintButton";
import { IconDownload } from "@/components/admin/icons";

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const STATUS_INFO: Record<string, { label: string; bg: string; color: string }> = {
  belum_bayar:         { label: "Belum Bayar",        bg: "#f3f4f6", color: "#374151" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", bg: "#fef9c3", color: "#854d0e" },
  lunas:               { label: "Lunas",               bg: "#dcfce7", color: "#15803d" },
  terlambat:           { label: "Terlambat",           bg: "#fee2e2", color: "#991b1b" },
};

function rupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

type SearchParams = {
  bulan?: string; tahun?: string; tingkat?: string; kelasId?: string;
  status?: string; q?: string; startDate?: string; endDate?: string;
  orientation?: string;
};

export default async function CetakLaporanSppPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(["owner", "petugas"]);
  const sp = await searchParams;
  const orientation = sp.orientation === "landscape" ? "landscape" : "portrait";

  const where: any = {
    ...(sp.bulan ? { bulan: Number(sp.bulan) } : {}),
    ...(sp.tahun ? { tahun: Number(sp.tahun) } : {}),
    ...(sp.status ? { status: sp.status as never } : {}),
    ...(sp.kelasId
      ? { siswa: { kelasId: sp.kelasId } }
      : sp.tingkat
      ? { siswa: { kelas: { tingkat: Number(sp.tingkat) } } }
      : {}),
  };
  if (sp.q) {
    where.siswa = {
      ...(where.siswa || {}),
      OR: [
        { namaLengkap: { contains: sp.q } },
        { nis: { contains: sp.q } },
        { nisn: { contains: sp.q } },
      ],
    };
  }
  if (sp.startDate || sp.endDate) {
    where.jatuhTempo = {
      ...(sp.startDate ? { gte: new Date(sp.startDate) } : {}),
      ...(sp.endDate ? { lte: new Date(sp.endDate + "T23:59:59.999Z") } : {}),
    };
  }

  const [daftar, profil] = await Promise.all([
    prisma.tagihanSpp.findMany({
      where,
      include: { siswa: { select: { namaLengkap: true, nis: true, nisn: true, kelas: true } } },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    }),
    prisma.profilSekolah.findFirst(),
  ]);

  const ringkasan = daftar.reduce(
    (acc, t) => {
      acc.totalTagihan += 1;
      acc.totalNominal += t.nominal;
      if (t.status === "lunas") {
        acc.totalLunas += 1;
        acc.nominalLunas += t.nominal;
      } else {
        acc.totalBelumLunas += 1;
        acc.nominalBelumLunas += t.nominal;
      }
      return acc;
    },
    { totalTagihan: 0, totalNominal: 0, totalLunas: 0, nominalLunas: 0, totalBelumLunas: 0, nominalBelumLunas: 0 }
  );

  const periodeLabel = `${sp.bulan ? BULAN_LABEL[Number(sp.bulan)] : "Semua Bulan"} ${sp.tahun || "Semua Tahun"}`;
  const qs = new URLSearchParams(
    Object.entries(sp).filter(([k, v]) => k !== "orientation" && v) as [string, string][]
  ).toString();

  // @page di bawah ini cuma dipakai browser pas benar-benar nge-print /
  // generate PDF (media type "print") — TIDAK pernah memengaruhi tampilan
  // di layar. Makanya toggle Portrait/Landscape kelihatan "gak ngefek":
  // URL & data-nya ganti, tapi lebar kontainer di layar statis. Supaya
  // preview di layar juga kelihatan berubah, lebar kontainer sengaja
  // dibikin ikut orientasi (kira-kira proporsi A4 di 96dpi), lalu di-reset
  // ke auto pas print supaya @page yang jadi sumber kebenaran ukuran kertas.
  const previewMaxWidth = orientation === "landscape" ? "max-w-[1123px]" : "max-w-[794px]";

  return (
    <div className={`mx-auto w-full ${previewMaxWidth} p-4 transition-[max-width] print:max-w-none print:p-0`}>
      <style>{`@page { size: A4 ${orientation}; margin: 14mm 12mm; }`}</style>

      {/* Kontrol — gak ikut tercetak/ke-PDF */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/admin/laporan" className="rounded-full border border-border-soft bg-white px-4 py-1.5 text-sm font-semibold text-ink-700 transition hover:bg-surface">
          ← Kembali
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-full border border-border-soft bg-white text-sm font-semibold">
            <Link
              href={`/cetak/laporan-spp?${qs}${qs ? "&" : ""}orientation=portrait`}
              className={`px-3 py-1.5 ${orientation === "portrait" ? "bg-accent text-white" : "text-ink-700 hover:bg-surface"}`}
            >
              Portrait
            </Link>
            <Link
              href={`/cetak/laporan-spp?${qs}${qs ? "&" : ""}orientation=landscape`}
              className={`px-3 py-1.5 ${orientation === "landscape" ? "bg-accent text-white" : "text-ink-700 hover:bg-surface"}`}
            >
              Landscape
            </Link>
          </div>
          <PrintButton />
          <a
            href={`/api/pdf/laporan-spp?${qs}${qs ? "&" : ""}orientation=${orientation}`}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-white transition hover:bg-accent-hover"
          >
            <span className="inline-flex items-center gap-1.5"><IconDownload className="h-4 w-4" /> Download PDF</span>
          </a>
        </div>
      </div>

      {/* Dokumen A4 */}
      <div className="rounded-card bg-white p-8 shadow-sm2 print:rounded-none print:p-0 print:shadow-none">
        <KopSurat profil={profil} judul="Laporan Pembayaran SPP" subjudul={`Periode: ${periodeLabel}`} />

        <div className="mb-6 grid grid-cols-4 gap-3">
          <div className="rounded-control border border-border-soft p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Total Tagihan</div>
            <div className="text-lg font-extrabold text-ink-900">{ringkasan.totalTagihan}</div>
            <div className="text-xs text-ink-500">{rupiah(ringkasan.totalNominal)}</div>
          </div>
          <div className="rounded-control border border-border-soft p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Sudah Lunas</div>
            <div className="text-lg font-extrabold text-status-lunas">{ringkasan.totalLunas}</div>
            <div className="text-xs text-ink-500">{rupiah(ringkasan.nominalLunas)}</div>
          </div>
          <div className="rounded-control border border-border-soft p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Belum Lunas</div>
            <div className="text-lg font-extrabold text-red-600">{ringkasan.totalBelumLunas}</div>
            <div className="text-xs text-ink-500">{rupiah(ringkasan.nominalBelumLunas)}</div>
          </div>
          <div className="rounded-control border border-border-soft p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Persentase Lunas</div>
            <div className="text-lg font-extrabold text-ink-900">
              {ringkasan.totalTagihan > 0 ? Math.round((ringkasan.totalLunas / ringkasan.totalTagihan) * 100) : 0}%
            </div>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead style={{ display: "table-header-group" }}>
            <tr>
              {["Siswa", "NIS", "Kelas", "Periode", "Nominal", "Status"].map((h) => (
                <th key={h} className="border border-ink-900/20 bg-surface px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daftar.map((t) => {
              const info = STATUS_INFO[t.status] || { label: t.status, bg: "#f3f4f6", color: "#374151" };
              return (
                <tr key={t.id} style={{ breakInside: "avoid" }}>
                  <td className="border border-ink-900/10 px-2.5 py-1.5 font-medium text-ink-900">{t.siswa?.namaLengkap || "-"}</td>
                  <td className="border border-ink-900/10 px-2.5 py-1.5 font-mono text-ink-500">{t.siswa?.nis || "-"}</td>
                  <td className="border border-ink-900/10 px-2.5 py-1.5">{t.siswa?.kelas?.namaKelas || "-"}</td>
                  <td className="border border-ink-900/10 px-2.5 py-1.5">{BULAN_LABEL[t.bulan]} {t.tahun}</td>
                  <td className="border border-ink-900/10 px-2.5 py-1.5 font-semibold text-ink-900">{rupiah(t.nominal)}</td>
                  <td className="border border-ink-900/10 px-2.5 py-1.5">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: info.bg, color: info.color }}>
                      {info.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {daftar.length === 0 && (
              <tr>
                <td colSpan={6} className="border border-ink-900/10 py-8 text-center text-ink-500">
                  Tidak ada data tagihan yang sesuai dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-10 flex items-end justify-between text-xs text-ink-500">
          <div>Dicetak pada: {new Date().toLocaleString("id-ID")}</div>
          <div className="min-w-[160px] text-center">
            <div className="mb-10">Mengetahui, Bendahara Sekolah</div>
            <div className="border-b border-ink-900/30 pb-1 font-semibold text-ink-900">{profil?.nama || "Administrasi SPP"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
