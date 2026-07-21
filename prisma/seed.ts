import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth";

async function main() {
  // 1. ProfilSekolah — 1 baris default kalau belum ada
  const profil = await prisma.profilSekolah.findFirst();
  if (!profil) {
    await prisma.profilSekolah.create({
      data: { nama: "Nama Sekolah (ganti di Settings)", nominalSppDefault: 0 },
    });
    console.log("✔ ProfilSekolah default dibuat");
  } else {
    console.log("… ProfilSekolah udah ada, dilewati");
  }

  // 2. PengaturanPembayaran — 1 baris default (sandbox, key kosong)
  const pengaturan = await prisma.pengaturanPembayaran.findFirst();
  if (!pengaturan) {
    await prisma.pengaturanPembayaran.create({ data: { environment: "sandbox" } });
    console.log("✔ PengaturanPembayaran default dibuat (isi key-nya lewat halaman Settings)");
  } else {
    console.log("… PengaturanPembayaran udah ada, dilewati");
  }

  // 3. TahunAjaran aktif — biar generate tagihan langsung bisa dipakai
  const tahunAjaran = await prisma.tahunAjaran.findFirst();
  if (!tahunAjaran) {
    const now = new Date();
    const tahunAwal = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1; // asumsi tahun ajaran mulai Juli
    await prisma.tahunAjaran.create({
      data: { nama: `${tahunAwal}/${tahunAwal + 1}`, aktif: true },
    });
    console.log(`✔ TahunAjaran ${tahunAwal}/${tahunAwal + 1} dibuat & diaktifkan`);
  } else {
    console.log("… TahunAjaran udah ada, dilewati");
  }

  // 4. Akun Owner pertama — cuma dibuat sekali, lewat Better Auth
  // (biar password ke-hash dengan benar sesuai algoritma Better Auth,
  // BUKAN di-insert manual ke tabel kredensial)
  const sudahAdaOwner = await prisma.akun.findFirst({ where: { role: "owner" } });
  if (sudahAdaOwner) {
    console.log("… Sudah ada akun Owner, dilewati");
  } else {
    const email = process.env.SEED_OWNER_EMAIL;
    const password = process.env.SEED_OWNER_PASSWORD;
    const name = process.env.SEED_OWNER_NAME || "Owner";

    if (!email || !password) {
      console.warn(
        "⚠ SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD belum diisi di .env — akun Owner TIDAK dibuat.\n" +
          "  Isi dulu di .env lalu jalankan ulang `npx prisma db seed`."
      );
    } else {
      const hasil = await auth.api.signUpEmail({ body: { email, password, name } });
      await prisma.akun.update({
        where: { id: hasil.user.id },
        data: { role: "owner" },
      });
      console.log(`✔ Akun Owner dibuat: ${email} (role di-set manual ke owner setelah signup)`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
