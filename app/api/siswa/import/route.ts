import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { bacaWorkbook, parseBarisSiswa } from "@/lib/excel-siswa";

type HasilBaris = { baris: number; status: "berhasil" | "gagal"; alasan?: string; nama?: string };

export async function POST(req: NextRequest) {
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
  } catch {
    return NextResponse.json({ error: "Gagal membaca file. Pastikan format .xlsx atau .csv sesuai template." }, { status: 400 });
  }

  if (barisMentah.length === 0) {
    return NextResponse.json({ error: "File kosong / tidak ada baris data." }, { status: 400 });
  }

  const semuaKelas = await prisma.kelas.findMany();
  const petaKelas = new Map(semuaKelas.map((k) => [k.namaKelas.trim().toLowerCase(), k.id]));

  const nisSudahAda = new Set((await prisma.siswa.findMany({ select: { nis: true } })).map((s) => s.nis));
  const nisDiFileIni = new Set<string>();

  const hasil: HasilBaris[] = [];

  for (let i = 0; i < barisMentah.length; i++) {
    const nomorBaris = i + 2; // +2: baris 1 adalah header
    const parsed = parseBarisSiswa(barisMentah[i]);

    if ("error" in parsed) {
      hasil.push({ baris: nomorBaris, status: "gagal", alasan: parsed.error });
      continue;
    }

    const { data } = parsed;

    if (nisSudahAda.has(data.nis) || nisDiFileIni.has(data.nis)) {
      hasil.push({ baris: nomorBaris, status: "gagal", alasan: `NIS "${data.nis}" sudah dipakai`, nama: data.namaLengkap });
      continue;
    }

    let kelasId: string | null = null;
    if (data.namaKelas) {
      kelasId = petaKelas.get(data.namaKelas.trim().toLowerCase()) || null;
      if (!kelasId) {
        hasil.push({
          baris: nomorBaris,
          status: "gagal",
          alasan: `Kelas "${data.namaKelas}" tidak ditemukan. Buat kelasnya dulu atau kosongkan kolom Kelas.`,
          nama: data.namaLengkap,
        });
        continue;
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
        },
      });
      nisDiFileIni.add(data.nis);
      hasil.push({ baris: nomorBaris, status: "berhasil", nama: data.namaLengkap });
    } catch (e) {
      hasil.push({ baris: nomorBaris, status: "gagal", alasan: "Gagal simpan ke database: " + (e as Error).message, nama: data.namaLengkap });
    }
  }

  const berhasil = hasil.filter((h) => h.status === "berhasil").length;
  const gagal = hasil.filter((h) => h.status === "gagal");

  return NextResponse.json({ total: barisMentah.length, berhasil, gagal });
}
