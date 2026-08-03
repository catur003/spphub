import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { bacaWorkbook, parseBarisSiswa, SiswaTervalidasi } from "@/lib/excel-siswa";
import { requireApiRole } from "@/lib/api-auth";

type HasilBaris = { baris: number; status: "berhasil" | "gagal"; alasan?: string; nama?: string };

type BarisSiap = {
  idx: number;
  nomorBaris: number;
  data: SiswaTervalidasi;
  kelasId: string | null;
  butuhAkun: boolean;
};

const UKURAN_CHUNK = 500;

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireApiRole(["owner", "petugas"]);
    if (error) return error;

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

    // Slot hasil per baris, diisi belakangan di pass mana pun baris itu
    // diproses — urutan tampil ke user tetap sesuai urutan baris di file.
    const hasil: (HasilBaris | null)[] = new Array(barisMentah.length).fill(null);
    const siapSimpan: BarisSiap[] = [];

    // PASS 1 — parsing, validasi NIS duplikat, resolve/otomatis-buat kelas.
    // Kelas baru dibuat sinkron di sini, tapi ini jarang kejadian (cuma
    // sebanyak NAMA KELAS unik yang belum ada, bukan sebanyak baris siswa),
    // jadi bukan sumber lag.
    for (let i = 0; i < barisMentah.length; i++) {
      const nomorBaris = i + 2; // Baris 1 adalah header
      const parsed = parseBarisSiswa(barisMentah[i]);

      if ("error" in parsed) {
        hasil[i] = { baris: nomorBaris, status: "gagal", alasan: parsed.error };
        continue;
      }

      const { data } = parsed;

      if (nisSudahAda.has(data.nis) || nisDiFileIni.has(data.nis)) {
        hasil[i] = {
          baris: nomorBaris,
          status: "gagal",
          alasan: `NIS "${data.nis}" sudah ada di sistem (dilewati agar tidak duplikat)`,
          nama: data.namaLengkap,
        };
        continue;
      }
      nisDiFileIni.add(data.nis);

      let kelasId: string | null = null;
      if (data.namaKelas) {
        const keyKelas = data.namaKelas.trim().toLowerCase();
        if (petaKelas.has(keyKelas)) {
          kelasId = petaKelas.get(keyKelas)!;
        } else {
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

      siapSimpan.push({
        idx: i,
        nomorBaris,
        data,
        kelasId,
        butuhAkun: Boolean(data.email && data.password),
      });
    }

    // PASS 2A — baris TANPA akun login: insert MASSAL (createMany), bukan
    // create() satu-satu per baris kayak sebelumnya. Ini penyebab utama lag
    // pas data banyak: tiap create() = 1 round-trip DB terpisah, ratusan
    // baris = ratusan round-trip sekuensial. Di-chunk per 500 baris biar
    // query-nya gak kegedean sekali kirim.
    const tanpaAkun = siapSimpan.filter((s) => !s.butuhAkun);
    const perluAkun = siapSimpan.filter((s) => s.butuhAkun);

    for (let c = 0; c < tanpaAkun.length; c += UKURAN_CHUNK) {
      const chunk = tanpaAkun.slice(c, c + UKURAN_CHUNK);
      try {
        await prisma.siswa.createMany({
          data: chunk.map((s) => ({
            namaLengkap: s.data.namaLengkap,
            nis: s.data.nis,
            nisn: s.data.nisn,
            kelasId: s.kelasId,
            jenisKelamin: s.data.jenisKelamin,
            tanggalLahir: s.data.tanggalLahir,
            namaWali: s.data.namaWali,
            kontakWali: s.data.kontakWali,
            status: s.data.status,
          })),
          skipDuplicates: true,
        });
        for (const s of chunk) {
          hasil[s.idx] = { baris: s.nomorBaris, status: "berhasil", nama: s.data.namaLengkap };
        }
      } catch (e: any) {
        // createMany gak ngasih hasil per-baris kalau gagal — lebih jujur
        // tandai semua baris di chunk ini "gagal" daripada nebak-nebak mana
        // yang sempat kesimpan.
        for (const s of chunk) {
          hasil[s.idx] = {
            baris: s.nomorBaris,
            status: "gagal",
            alasan: "Gagal simpan ke database: " + (e.message || "unknown error"),
            nama: s.data.namaLengkap,
          };
        }
      }
    }

    // PASS 2B — baris yang butuh akun login: TETAP satu-satu (bikin akun =
    // hashing password per baris + harus nyambung ke siswa-nya lewat
    // akunId, gak bisa di-batch). Tapi cek email yang udah kepake di-query
    // SEKALI di awal (bukan satu findUnique per baris kayak sebelumnya).
    if (perluAkun.length > 0) {
      const emailDiFile = perluAkun.map((s) => s.data.email!);
      const akunTerpakai = new Set(
        (
          await prisma.akun.findMany({
            where: { email: { in: emailDiFile } },
            select: { email: true },
          })
        ).map((a) => a.email)
      );

      for (const s of perluAkun) {
        let akunId: string | null = null;
        let pesanAkun = "";

        if (akunTerpakai.has(s.data.email!)) {
          pesanAkun = ` (email ${s.data.email} sudah ada, siswa dibuat tanpa akun baru)`;
        } else {
          try {
            const hasilAuth = await auth.api.signUpEmail({
              body: {
                email: s.data.email!,
                password: s.data.password!,
                name: s.data.namaLengkap,
              },
            });
            akunId = hasilAuth.user.id;
            akunTerpakai.add(s.data.email!);
          } catch {
            pesanAkun = ` (gagal buat akun: periksa email/password)`;
          }
        }

        try {
          await prisma.siswa.create({
            data: {
              namaLengkap: s.data.namaLengkap,
              nis: s.data.nis,
              nisn: s.data.nisn,
              kelasId: s.kelasId,
              jenisKelamin: s.data.jenisKelamin,
              tanggalLahir: s.data.tanggalLahir,
              namaWali: s.data.namaWali,
              kontakWali: s.data.kontakWali,
              status: s.data.status,
              ...(akunId ? { akunId } : {}),
            },
          });
          hasil[s.idx] = { baris: s.nomorBaris, status: "berhasil", nama: s.data.namaLengkap + pesanAkun };
        } catch (e: any) {
          hasil[s.idx] = {
            baris: s.nomorBaris,
            status: "gagal",
            alasan: "Gagal simpan ke database: " + e.message,
            nama: s.data.namaLengkap,
          };
        }
      }
    }

    const hasilFinal = hasil as HasilBaris[]; // semua slot pasti keisi salah satu pass di atas
    const berhasil = hasilFinal.filter((h) => h.status === "berhasil").length;
    const gagal = hasilFinal.filter((h) => h.status === "gagal");

    return NextResponse.json({ total: barisMentah.length, berhasil, gagal });
  } catch (error: any) {
    console.error("[POST /api/siswa/import] Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses file import: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
