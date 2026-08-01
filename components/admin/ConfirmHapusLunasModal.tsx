"use client";

import { useState } from "react";

type Props = {
  show: boolean;
  /** Jumlah tagihan lunas (siswa nonaktif/lulus/pindah) yang akan dihapus */
  jumlahTagihan: number;
  /** Total nominal yang akan hilang dari Laporan Keuangan */
  totalNominal: number;
  /** Berapa banyak tagihan lain (belum lunas / normal) yang ikut terhapus di aksi yang sama, kalau ada */
  jumlahTagihanLain?: number;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const KATA_KONFIRMASI = "HAPUS";

function formatRupiah(n: number): string {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
}

/**
 * Modal konfirmasi khusus untuk menghapus tagihan LUNAS milik siswa
 * nonaktif/lulus/pindah. Sengaja dibuat terpisah dari ConfirmModal.tsx
 * (dipakai di banyak halaman lain) supaya perubahan ini terisolasi dan
 * gak berisiko mengubah perilaku modal konfirmasi lain di aplikasi.
 */
export default function ConfirmHapusLunasModal({
  show,
  jumlahTagihan,
  totalNominal,
  jumlahTagihanLain = 0,
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  const [ketikan, setKetikan] = useState("");

  if (!show) return null;

  const cocok = ketikan.trim().toUpperCase() === KATA_KONFIRMASI;

  function handleClose() {
    setKetikan("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[1070] flex items-center justify-center bg-ink-900/60 p-4"
      role="dialog"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
          <h5 className="text-base font-bold text-red-700">⚠ Hapus Tagihan Lunas</h5>
          <button
            type="button"
            aria-label="Tutup"
            className="text-xl leading-none text-ink-500 hover:text-ink-900"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-ink-700">
            <strong>{jumlahTagihan}</strong> tagihan yang dipilih sudah <strong>LUNAS</strong> dan
            akan dihapus permanen beserta riwayat pembayarannya (total{" "}
            <strong>{formatRupiah(totalNominal)}</strong>).
          </p>
          <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">
            Angka pendapatan di <strong>Laporan Keuangan</strong> pada bulan terkait akan{" "}
            <strong>berkurang otomatis</strong> mengikuti nominal & tanggal pembayaran yang dihapus.
            Aksi ini <strong>tidak bisa dibatalkan</strong>.
          </p>
          {jumlahTagihanLain > 0 && (
            <p className="text-xs text-ink-500">
              {jumlahTagihanLain} tagihan lain yang dipilih (belum ada pembayaran sukses) akan ikut
              dihapus seperti biasa.
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">
              Ketik <strong>HAPUS</strong> untuk melanjutkan
            </label>
            <input
              autoFocus
              className="w-full rounded-control border border-red-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              placeholder="HAPUS"
              value={ketikan}
              onChange={(e) => setKetikan(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">
          <button
            type="button"
            className="rounded-control border border-border-soft px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface"
            onClick={handleClose}
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!cocok || loading}
            className="rounded-control bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              if (!cocok) return;
              onConfirm();
            }}
          >
            {loading ? "Menghapus..." : `Ya, Hapus ${jumlahTagihan} Tagihan Lunas`}
          </button>
        </div>
      </div>
    </div>
  );
}
