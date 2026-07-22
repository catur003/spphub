import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { bacaWorkbook, parseBarisSiswa } from "@/lib/excel-siswa";

type HasilBaris = { baris: number; status: "berhasil" | "gagal"; alasan?: string; nama?: string };

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !["owner", "petugas"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "File tidak ditemukan. Upload file .xlsx atau .csv." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let barisMentah;
    try {
      barisMentah = bacaWorkbook(buffer);
    } catch (e: any) {
      return NextResponse.json(
        { error: "Gagal membaca file. Pastikan format file .xlsx atau .csv valid: " + e.message },
        { status: 400 }
      );
    }

    if (barisMentah.length === 0) {
      return NextResponse.json({ error: "File kosong / tidak ada baris data." }, { status: 400 });
    }

    // Ambil daftar kelas yang ada di DB
    const semuaKelas = await prisma.kelas.findMany();
    const petaKelas = new Map(semuaKelas.map((k) => [k.namaKelas.trim().toLowerCase(), k.id]));

    const nisSudahAda = new Set((await prisma.siswa.findMany({ select: { nis: true } })).map((s) => s.nis));
    const nisDiFileIni = new Set<string>();

    const hasil: HasilBaris[] = [];

    for (let i = 0; i < barisMentah.length; i++) {
      const nomorBaris = i + 2; // Baris 1 adalah header
      const parsed = parseBarisSiswa(barisMentah[i]);

      if ("error" in parsed) {
        hasil.push({ baris: nomorBaris, status: "gagal", alasan: parsed.error });
        continue;
      }

      const { data } = parsed;

      if (nisSudahAda.has(data.nis) || nisDiFileIni.has(data.nis)) {
        hasil.push({
          baris: nomorBaris,
          status: "gagal",
          alasan: `NIS "${data.nis}" sudah ada di sistem (dilewati agar tidak duplikat)`,
          nama: data.namaLengkap,
        });
        continue;
      }

      // Cari atau Otomatis Buat Kelas jika belum ada di database
      let kelasId: string | null = null;
      if (data.namaKelas) {
        const keyKelas = data.namaKelas.trim().toLowerCase();
        if (petaKelas.has(keyKelas)) {
          kelasId = petaKelas.get(keyKelas)!;
        } else {
          // Otomatis buat kelas baru jika belum ada
          try {
            const tingkatHitung = parseInt(data.namaKelas.replace(/\D/g, "")) || 10;
            const kelasBaru = await prisma.kelas.create({
              data: {
                namaKelas: data.namaKelas.trim(),
                tingkat: tingkatHitung,
                nominalSpp: 0,
              },
            });
            kelasId = kelasBaru.id;
            petaKelas.set(keyKelas, kelasBaru.id);
          } catch {
            kelasId = null;
          }
        }
      }

      // Buat akun login (opsional) jika email & password diisi
      let akunId: string | null = null;
      let pesanAkun = "";

      if (data.email && data.password) {
        try {
          const akunSudahAda = await prisma.akun.findUnique({ where: { email: data.email } });
          if (akunSudahAda) {
            pesanAkun = ` (email ${data.email} sudah ada, siswa dibuat tanpa akun baru)`;
          } else {
            const hasilAuth = await auth.api.signUpEmail({
              body: {
                email: data.email,
                password: data.password,
                name: data.namaLengkap,
              },
            });
            akunId = hasilAuth.user.id;
          }
        } catch {
          pesanAkun = ` (gagal buat akun: periksa email/password)`;
        }
      }

      try {
        await prisma.siswa.create({
          data: {
            namaLengkap: data.namaLengkap,
            nis: data.nis,
            nisn: data.nisn,
            kelasId,
            jenisKelamin: data.jenisKelamin,
            tanggalLahir: data.tanggalLahir,
            namaWali: data.namaWali,
            kontakWali: data.kontakWali,
            status: data.status,
            ...(akunId ? { akunId } : {}),
          },
        });
        nisDiFileIni.add(data.nis);
        hasil.push({
          baris: nomorBaris,
          status: "berhasil",
          nama: data.namaLengkap + pesanAkun,
        });
      } catch (e: any) {
        hasil.push({
          baris: nomorBaris,
          status: "gagal",
          alasan: "Gagal simpan ke database: " + e.message,
          nama: data.namaLengkap,
        });
      }
    }

    const berhasil = hasil.filter((h) => h.status === "berhasil").length;
    const gagal = hasil.filter((h) => h.status === "gagal");

    return NextResponse.json({ total: barisMentah.length, berhasil, gagal });
  } catch (error: any) {
    console.error("[POST /api/siswa/import] Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses file import: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
