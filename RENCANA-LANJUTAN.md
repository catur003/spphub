# Rencana Lanjutan — SPP Hub

Dokumen ini nyatetin sisa pekerjaan dari request "cari bug + optimisasi"
yang belum kelar di sesi ini, plus urutan pengerjaan yang disaranin biar
gak numpuk jadi satu perubahan raksasa yang susah ditest.

Status per poin bug awal:

| # | Bug/Request | Status |
|---|---|---|
| 1 | Tabel gak responsive di HP | ✅ Selesai (14 tabel) |
| 2 | Harus refresh manual setelah set SPP | ✅ Selesai (akar masalah: Cache-Control) |
| 3 | Tingkat → Kelas, Nama Kelas → Nama Jurusan | 🔶 Baru modul Kelas (`KelasTable`) |
| 4 | Emoji → ikon profesional + gradient bermotif | 🔶 Baru `KelasTable` + 9 ikon baru disiapin |
| 5 | Tab menu lemot | ✅ Selesai (akar masalah: session gak di-cache) |

---

## Tahap 1 — Rename terminologi "Tingkat" → "Kelas", "Nama Kelas" → "Nama Jurusan"

Prinsip: **cuma ganti label yang tampil ke user**, bukan nama field di
Prisma/API (`namaKelas`, `tingkat` tetep). Alasannya: rename field DB
butuh migration + nyentuh API routes, import/export Excel, dan query di
puluhan file sekaligus — resiko bikin data lama gak kebaca kalau ada yang
kelewat. Rename tampilan jauh lebih aman dan hasilnya sama-sama kelihatan
buat user.

File yang masih perlu disentuh (belum di sesi ini):
- `app/admin/kelas/components/KelasFormTambah.tsx` — label input "Nama
  Kelas" & "Tingkat"
- `app/admin/kelas/components/KelasEditModal.tsx` — sama
- `app/admin/kelas/components/KelasDetailModal.tsx` — header modal
- `app/admin/kelas/page.tsx` — subtitle halaman ("Data Kelas & Biaya SPP")
- `app/admin/siswa/components/SiswaFilterBar.tsx` — filter dropdown
  "Tingkat"
- `app/admin/siswa/components/NaikKelasModal.tsx` — teks "naik tingkat"
- `app/admin/tagihan/components/FilterToolbar.tsx` — filter "Tingkat"
- `app/admin/laporan/page.tsx` — kolom laporan yang nyebut tingkat/kelas

Estimasi: 1 sesi kerja (semua file kecil, tinggal ganti string label).

---

## Tahap 2 — Emoji → ikon SVG di sisa halaman

9 ikon baru udah ditambahin ke `components/admin/icons.tsx`
(`IconWarning`, `IconEdit`, `IconEye`, `IconTrash`, `IconPlus`,
`IconSave`, `IconMoney`, `IconSchool`, `IconCheckCircle`), plus ikon lama
yang udah ada duluan (`IconSearch`, `IconRefresh`, `IconFileText`, dst).
Kemungkinan masih perlu nambah beberapa lagi pas ngerjain (ikon printer,
lock/kunci, download/upload, bell/notifikasi, graduation cap beda dari
school, folder/arsip).

File yang masih pakai emoji (33 total, 1 udah kelar):
`app/admin/tagihan/page.tsx` + 4 komponennya, `app/admin/keuangan/laporan`,
`pengeluaran`, `utang-pegawai`, `pendapatan`, `app/admin/siswa/page.tsx` +
5 komponennya, `app/admin/settings/page.tsx`, `app/admin/laporan/page.tsx`,
`app/admin/pengguna/page.tsx`, `app/admin/arsip/page.tsx`,
`app/admin/pengumuman/page.tsx`, `app/admin/dashboard/page.tsx`,
`app/admin/tahun-ajaran/page.tsx`, `app/invoice/[id]/page.tsx`,
`app/kwitansi/[id]/KwitansiClient.tsx`, `app/siswa/page.tsx`.

Saran urutan: mulai dari halaman yang paling sering dibuka (dashboard,
tagihan, siswa) baru ke halaman keuangan/laporan/arsip yang lebih jarang.
`prisma/seed.ts` gak perlu disentuh (emoji di situ cuma buat log terminal
pas seeding, gak kelihatan user).

Estimasi: 2–3 sesi kerja (banyak file, tapi tiap file kerjanya
mekanis — cari emoji, ganti `<Icon.../>`).

---

## Tahap 3 — Background gradient bermotif (non-repeating)

Belum disentuh sama sekali. Rencana: bikin 1 gradient mesh/blob halus
(bukan pattern yang keulang kayak polkadot/grid) taro di `globals.css`
sebagai `background` di `<body>` atau di wrapper halaman admin
(`AdminShell` di `sidebar.tsx`), pakai warna yang udah ada di
`tailwind.config.ts` (`sidebar-bg`, `accent`, `surface`) biar konsisten,
bukan warna baru. Perlu keputusan dari Zen: mau gradient-nya di background
seluruh halaman admin, atau cuma di area sidebar/topbar/kartu login?

Estimasi: setengah sesi kerja + review visual bareng Zen (ini yang paling
butuh feedback langsung, karena "modern clean" itu subjektif).

---

## Catatan tambahan (di luar 5 bug awal, ketauan pas audit)

- Belum ada testing end-to-end di sandbox (gak ada akses `npm install`/
  network buat jalanin dev server). Semua fix di atas udah diverifikasi
  lewat pembacaan kode + tracing logic manual, tapi tetep perlu dicoba
  jalan beneran (terutama fix `cookieCache` better-auth — pastiin versi
  `better-auth` yang dipakai di `package.json` emang support opsi ini).
- Kalau nanti ngerjain Tahap 1, sekalian cek apa field `tingkat` (Int)
  masih relevan buat SMK yang strukturnya X/XI/XII + jurusan, atau malah
  lebih pas kalau `namaKelas` isinya udah gabungan ("XII RPL 1") dan
  `tingkat` cuma dipake buat sorting/filter — biar labelnya gak
  membingungkan admin yang input data.
