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
    const tagihan = await prisma.tagihanLain.findUnique({
      where: { id },
      select: {
        id: true,
        nominal: true,
        status: true,
        jatuhTempo: true,
        keterangan: true,
        createdAt: true,
        jenisTagihanLain: { select: { nama: true } },
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
    console.error("[GET /api/tagihan-lain/[id]] Error:", error);
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

    const tagihan = await prisma.tagihanLain.update({
      where: { id },
      data: { status: body.status },
    });

    return NextResponse.json(tagihan);
  } catch (error: any) {
    console.error("[PATCH /api/tagihan-lain/[id]] Error:", error);
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

    const punyaPembayaranSukses = await prisma.pembayaranLain.findFirst({
      where: { tagihanLainId: id, status: "success" },
      select: { id: true },
    });

    if (punyaPembayaranSukses) {
      const tagihan = await prisma.tagihanLain.findUnique({
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
    }

    await prisma.tagihanLain.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/tagihan-lain/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus tagihan: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
