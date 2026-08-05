import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";

const STATUS_VALID = ["belum_bayar", "menunggu_verifikasi", "lunas", "terlambat"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth } = await import("@/lib/auth");
    const { headers } = await import("next/headers");
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tagihan = await prisma.tagihanSpp.findUnique({
      where: { id },
      select: {
        id: true,
        bulan: true,
        tahun: true,
        nominal: true,
        status: true,
        jatuhTempo: true,
        createdAt: true,
        siswa: {
          select: {
            akunId: true,
            namaLengkap: true,
            nis: true,
            nisn: true,
            namaWali: true,
            kontakWali: true,
            kelas: { select: { namaKelas: true, waliKelas: true } },
          },
        },
      },
    });

    if (!tagihan) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    const isAdmin = session.user.role === "owner" || session.user.role === "petugas";
    const isOwner = tagihan.siswa?.akunId === session.user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    return NextResponse.json(tagihan);
  } catch (error: any) {
    console.error("[GET /api/tagihan/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (!body.status) {
      return NextResponse.json({ error: "status wajib diisi" }, { status: 400 });
    }

    if (!STATUS_VALID.includes(body.status)) {
      return NextResponse.json(
        { error: `status tidak valid. Pilihan: ${STATUS_VALID.join(", ")}` },
        { status: 400 }
      );
    }

    // PENTING: status "lunas" TIDAK boleh diset lewat endpoint ini. Dulu
    // tombol "Tandai LUNAS" di admin nembak ke sini, jadi tagihan berubah
    // jadi lunas TANPA row Pembayaran sama sekali — akibatnya pembayaran
    // tunai gak pernah kelihatan di grafik tren dashboard (yang baca tabel
    // Pembayaran status success) dan halaman /kwitansi/[id] kosong karena
    // ikut nyari row Pembayaran. Satu-satunya jalan sah buat melunaskan
    // manual adalah POST /api/tagihan/[id]/verifikasi, yang bikin
    // Pembayaran + update status dalam satu transaksi. Pelunasan otomatis
    // dari Midtrans juga lewat jalurnya sendiri (webhook / cek-status).
    if (body.status === "lunas") {
      return NextResponse.json(
        {
          error:
            "Status 'lunas' tidak bisa diset lewat endpoint ini. Gunakan POST /api/tagihan/[id]/verifikasi supaya riwayat pembayarannya ikut tercatat.",
        },
        { status: 400 }
      );
    }

    const tagihan = await prisma.tagihanSpp.update({
      where: { id },
      data: { status: body.status },
    });

    return NextResponse.json(tagihan);
  } catch (error: any) {
    console.error("[PATCH /api/tagihan/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

const STATUS_SISWA_NONAKTIF = ["nonaktif", "lulus", "pindah"];

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: errAkses } = await requireApiRole(["owner", "petugas"]);
    if (errAkses) return errAkses;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const confirmHapusLunas = body?.confirmHapusLunas === true;

    // Sama seperti hapus siswa: Pembayaran ikut ke-cascade-delete kalau
    // tagihan ini dihapus. Tolak kalau sudah ada pembayaran yang sukses.
    const punyaPembayaranSukses = await prisma.pembayaran.findFirst({
      where: { tagihanSppId: id, status: "success" },
      select: { id: true },
    });

    if (punyaPembayaranSukses) {
      // Pengecualian: siswa nonaktif/lulus/pindah dengan tagihan lunas boleh
      // dihapus, TAPI hanya kalau frontend sudah eksplisit konfirmasi (user
      // ngetik "HAPUS" di modal). Tanpa flag ini, perilaku sama persis
      // seperti sebelumnya (ditolak) - siswa aktif tetap selalu ditolak.
      const tagihan = await prisma.tagihanSpp.findUnique({
        where: { id },
        select: { siswa: { select: { status: true } } },
      });
      const siswaNonAktif = tagihan?.siswa?.status
        ? STATUS_SISWA_NONAKTIF.includes(tagihan.siswa.status)
        : false;

      if (!siswaNonAktif || !confirmHapusLunas) {
        return NextResponse.json(
          {
            error:
              "Tagihan ini sudah punya pembayaran sukses. Menghapusnya akan menghapus permanen riwayat pembayaran itu juga. Kalau memang salah input, ubah statusnya saja, jangan dihapus.",
          },
          { status: 409 }
        );
      }
      // Catatan: nominal pembayaran ini akan hilang dari Laporan Keuangan
      // bulan terkait karena dihitung langsung dari tabel Pembayaran.
      // Peringatan ini sudah ditampilkan ke user di modal konfirmasi FE.
    }

    await prisma.tagihanSpp.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/tagihan/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
