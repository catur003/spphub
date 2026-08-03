import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, requireApiOwner } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { id } = await params;
    const siswa = await prisma.siswa.findUnique({
      where: { id },
      include: {
        kelas: true,
        akun: { select: { email: true } },
        tagihan: {
          orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
          take: 3,
        },
        tagihanLain: {
          orderBy: { jatuhTempo: "desc" },
          take: 3,
          include: { jenisTagihanLain: { select: { nama: true } } },
        },
      },
    });

    if (!siswa) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    return NextResponse.json(siswa);
  } catch (error: any) {
    console.error("[GET /api/siswa/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data siswa: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

    const { id } = await params;
    const body = await req.json();

    if (body.nis) {
      const nisDipakai = await prisma.siswa.findFirst({
        where: { nis: body.nis, NOT: { id } },
      });
      if (nisDipakai) {
        return NextResponse.json({ error: "NIS sudah dipakai siswa lain" }, { status: 400 });
      }
    }

    const siswaSekarang = await prisma.siswa.findUnique({
      where: { id },
      select: { akunId: true },
    });
    if (!siswaSekarang) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    let akunIdBaru: string | undefined;

    if (!siswaSekarang.akunId) {
      if (body.buatAkun && body.email && body.password) {
        const emailDipakai = await prisma.akun.findUnique({ where: { email: body.email } });
        if (emailDipakai) {
          return NextResponse.json({ error: "Email sudah dipakai akun lain" }, { status: 400 });
        }
        try {
          const hashedPassword = await bcrypt.hash(body.password, 10);
          const newAkun = await prisma.$transaction(async (tx) => {
            const akun = await tx.akun.create({
              data: {
                name: body.namaLengkap || body.nis,
                email: String(body.email).trim().toLowerCase(),
                role: "siswa",
              },
            });

            await tx.kredensial.create({
              data: {
                akunId: akun.id,
                accountId: akun.id,
                providerId: "credential",
                password: hashedPassword,
              },
            });

            return akun;
          });
          akunIdBaru = newAkun.id;
        } catch (err: any) {
          return NextResponse.json(
            { error: "Gagal membuat akun: " + (err.message || "Email / password tidak valid") },
            { status: 400 }
          );
        }
      }
    }

    if (siswaSekarang.akunId) {
      const akunId = siswaSekarang.akunId;

      if (body.gantiEmail && body.emailBaru) {
        const emailDipakai = await prisma.akun.findFirst({
          where: { email: body.emailBaru, NOT: { id: akunId } },
        });
        if (emailDipakai) {
          return NextResponse.json({ error: "Email baru sudah dipakai akun lain" }, { status: 400 });
        }
        await prisma.akun.update({
          where: { id: akunId },
          data: { email: body.emailBaru },
        });
      }

      if (body.resetPassword && body.passwordBaru) {
        if (body.passwordBaru.length < 8) {
          return NextResponse.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
        }
        const hashBaru = await bcrypt.hash(body.passwordBaru, 10);
        await prisma.kredensial.updateMany({
          where: { akunId, providerId: "credential" },
          data: { password: hashBaru },
        });
      }

      if (body.namaLengkap) {
        await prisma.akun.update({
          where: { id: akunId },
          data: { name: body.namaLengkap },
        });
      }
    }

    const siswa = await prisma.siswa.update({
      where: { id },
      data: {
        kelasId: body.kelasId || null,
        nis: body.nis,
        nisn: body.nisn || null,
        namaLengkap: body.namaLengkap,
        jenisKelamin: body.jenisKelamin,
        tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
        namaWali: body.namaWali || null,
        kontakWali: body.kontakWali || null,
        fotoUrl: body.fotoUrl !== undefined ? body.fotoUrl : undefined,
        status: body.status,
        ...(akunIdBaru ? { akunId: akunIdBaru } : {}),
      },
      include: { kelas: true, akun: { select: { email: true } } },
    });

    return NextResponse.json(siswa);
  } catch (error: any) {
    console.error("[PUT /api/siswa/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui siswa: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

const STATUS_SISWA_NONAKTIF_HAPUS = ["nonaktif", "lulus", "pindah"];

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: errAkses } = await requireApiOwner();
    if (errAkses) return errAkses;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const confirmHapusLunas = body?.confirmHapusLunas === true;

    const siswa = await prisma.siswa.findUnique({
      where: { id },
      select: { akunId: true, status: true },
    });

    if (!siswa) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    // PENTING: cek riwayat lunas lewat status TagihanSpp/TagihanLain
    // ("lunas"), BUKAN lewat tabel Pembayaran/PembayaranLain saja. Tagihan
    // yang ditandai lunas manual (pembayaran tunai lewat tombol "Tandai
    // LUNAS") cuma PATCH status tagihan-nya, gak pernah bikin row di
    // Pembayaran — jadi kalau cuma ngecek tabel Pembayaran, siswa yang
    // semua tagihannya lunas tunai lolos tanpa proteksi sama sekali
    // (riwayatnya ikut kehapus permanen lewat cascade delete Siswa ->
    // TagihanSpp / TagihanLain). Status "lunas" di tagihan itu sendiri
    // adalah sumber kebenaran tunggal, konsisten dipakai baik oleh PATCH
    // manual maupun webhook Midtrans (lihat app/api/midtrans/webhook).
    const [tagihanLunas, tagihanLainLunas] = await Promise.all([
      prisma.tagihanSpp.findMany({
        where: { siswaId: id, status: "lunas" },
        select: { nominal: true },
      }),
      prisma.tagihanLain.findMany({
        where: { siswaId: id, status: "lunas" },
        select: { nominal: true },
      }),
    ]);

    const jumlahLunas = tagihanLunas.length + tagihanLainLunas.length;

    if (jumlahLunas > 0) {
      const totalNominal =
        tagihanLunas.reduce((acc, t) => acc + t.nominal, 0) +
        tagihanLainLunas.reduce((acc, t) => acc + t.nominal, 0);

      const siswaNonAktif = siswa.status
        ? STATUS_SISWA_NONAKTIF_HAPUS.includes(siswa.status)
        : false;

      // Sama seperti hapus tagihan massal: siswa AKTIF dengan riwayat
      // lunas SELALU ditolak, gak ada jalan bypass. Siswa
      // nonaktif/lulus/pindah boleh dihapus, tapi cuma kalau frontend
      // sudah eksplisit konfirmasi (user ngetik "HAPUS" di modal).
      if (!siswaNonAktif || !confirmHapusLunas) {
        return NextResponse.json(
          {
            error: siswaNonAktif
              ? "Siswa ini punya riwayat tagihan lunas. Konfirmasi diperlukan sebelum menghapus."
              : "Siswa ini masih berstatus aktif dan punya riwayat tagihan lunas. Menghapus siswa akan menghapus permanen riwayat tagihan & keuangannya juga. Ubah status siswa jadi 'nonaktif'/'pindah'/'lulus' dulu lewat form edit kalau memang mau dihapus, jangan dihapus langsung selagi aktif.",
            butuhKonfirmasi: siswaNonAktif,
            jumlahLunas,
            totalNominal,
          },
          { status: 409 }
        );
      }
      // Catatan: nominal tagihan lunas ini akan hilang dari Laporan
      // Keuangan bulan terkait. Peringatan ini sudah ditampilkan ke user
      // di modal konfirmasi FE.
    }

    await prisma.siswa.delete({ where: { id } });

    if (siswa.akunId) {
      await prisma.akun.delete({ where: { id: siswa.akunId } }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/siswa/[id]] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus siswa: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
