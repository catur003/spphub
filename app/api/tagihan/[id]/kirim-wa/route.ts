import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { kirimPesanFonnte, normalisasiNoHp } from "@/lib/fonnte";

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tagihan = await prisma.tagihanSpp.findUnique({
      where: { id },
      include: {
        siswa: { select: { namaLengkap: true, nis: true, kontakWali: true, namaWali: true, kelas: true } },
        tahunAjaran: true,
      },
    });

    if (!tagihan) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    const targetHp = tagihan.siswa.kontakWali;
    if (!targetHp) {
      return NextResponse.json({ error: "Kontak Wali / No HP siswa belum diisi" }, { status: 400 });
    }

    const profil = await prisma.profilSekolah.findFirst();
    const namaSekolah = profil?.nama || "Sekolah";
    const namaBulan = BULAN_LABEL[tagihan.bulan] || String(tagihan.bulan);
    const nominalRp = `Rp ${tagihan.nominal.toLocaleString("id-ID")}`;
    const tglTempo = new Date(tagihan.jatuhTempo).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const pesan =
      `Yth. Bapak/Ibu Wali dari *${tagihan.siswa.namaLengkap}* (Kelas ${tagihan.siswa.kelas?.namaKelas || "-"}),\n\n` +
      `Informasi tagihan *SPP Bulan ${namaBulan} ${tagihan.tahun}* sebesar *${nominalRp}* pada ${namaSekolah}.\n` +
      `Jatuh tempo pembayaran: *${tglTempo}*.\n` +
      `Status saat ini: *${tagihan.status.toUpperCase()}*.\n\n` +
      `Mohon dapat melakukan pembayaran melalui portal siswa atau mengirim konfirmasi ke sekolah. Terima kasih.`;

    // Cek Fonnte Token
    if (profil?.fonnteToken) {
      try {
        await kirimPesanFonnte({
          token: profil.fonnteToken,
          target: targetHp,
          pesan,
        });
        return NextResponse.json({
          status: "berhasil",
          method: "fonnte",
          message: `Notifikasi WA Fonnte berhasil dikirim ke ${targetHp}`,
        });
      } catch (err: any) {
        console.error("[Fonnte Auto-Send Error]:", err);
        // Fallback to wa.me URL
      }
    }

    // Fallback: Kembalikan link WhatsApp Direct
    const hpClean = normalisasiNoHp(targetHp);
    const waUrl = `https://wa.me/${hpClean}?text=${encodeURIComponent(pesan)}`;

    return NextResponse.json({
      status: "berhasil",
      method: "wa_link",
      waUrl,
      message: "Token Fonnte belum aktif. Menggunakan WhatsApp Direct Link.",
    });
  } catch (error: any) {
    console.error("[POST /api/tagihan/[id]/kirim-wa] Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses pengiriman WA: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
