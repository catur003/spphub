import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import KwitansiClient from "./KwitansiClient";

export default async function KwitansiPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id } = await params;
  const tagihan = await prisma.tagihanSpp.findUnique({
    where: { id },
    include: {
      siswa: { include: { kelas: true } },
      tahunAjaran: true,
      pembayaran: {
        where: { status: "success" },
        orderBy: { paidAt: "desc" }
      }
    }
  });

  if (!tagihan) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <div className="alert alert-danger">Kwitansi/Tagihan tidak ditemukan.</div>
      </div>
    );
  }

  // Cek otorisasi
  const isAdmin = session.user.role === "owner" || session.user.role === "petugas";
  const isOwner = tagihan.siswa.akunId === session.user.id;
  if (!isAdmin && !isOwner) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <div className="alert alert-warning">Akses ditolak. Anda tidak berhak melihat kwitansi ini.</div>
      </div>
    );
  }

  const profil = await prisma.profilSekolah.findFirst();

  // Parsing JSON safely
  const tagihanClean = JSON.parse(JSON.stringify(tagihan));
  const profilClean = JSON.parse(JSON.stringify(profil));

  return <KwitansiClient tagihan={tagihanClean} profil={profilClean} />;
}
