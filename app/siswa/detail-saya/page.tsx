"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Script from "next/script";

type Siswa = {
  id: string;
  nis: string;
  nisn: string | null;
  namaLengkap: string;
  jenisKelamin: "L" | "P";
  namaWali: string | null;
  kontakWali: string | null;
  fotoUrl: string | null;
  status: string;
  kelas: { namaKelas: string } | null;
};

type Tagihan = {
  id: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: string;
  jatuhTempo: string;
};

const BULAN_LABEL = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const STATUS_BADGE: Record<string, string> = {
  belum_bayar: "bg-secondary",
  menunggu_verifikasi: "bg-warning text-dark",
  lunas: "bg-success",
  terlambat: "bg-danger",
};

const STATUS_LABEL: Record<string, string> = {
  belum_bayar: "Belum Lunas",
  menunggu_verifikasi: "Menunggu Verifikasi",
  lunas: "Lunas",
  terlambat: "Terlambat",
};

// Pastikan script Snap.js sesuai environment (sandbox/production) cuma dimuat sekali
function waitForSnap(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).snap) { resolve(); return; }
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if ((window as any).snap) { clearInterval(iv); resolve(); }
      else if (tries > 100) { clearInterval(iv); reject(new Error("Snap timeout")); }
    }, 100);
  });
}

type MidtransConfig = { clientKey: string; isProd: boolean } | null;

export default function DetailSayaPage() {
  const router = useRouter();
  const [siswa, setSiswa] = useState<Siswa | null>(null);
  const [tagihan, setTagihan] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bayarLoadingId, setBayarLoadingId] = useState<string | null>(null);
  const [midtrans, setMidtrans] = useState<MidtransConfig>(null);

  useEffect(() => {
    fetch("/api/settings/midtrans-public")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMidtrans(data); });
  }, []);

  async function muatData() {
    setLoading(true);
    const [resSiswa, resTagihan] = await Promise.all([
      fetch("/api/siswa/saya"),
      fetch("/api/tagihan/saya"),
    ]);

    if (resSiswa.ok) setSiswa(await resSiswa.json());
    if (resTagihan.ok) setTagihan(await resTagihan.json());
    setLoading(false);
  }

  useEffect(() => {
    muatData();
  }, []);

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  async function handleBayar(id: string) {
    setError("");
    setBayarLoadingId(id);

    const res = await fetch(`/api/tagihan/${id}/bayar`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Gagal memulai pembayaran");
      setBayarLoadingId(null);
      return;
    }

    try {
      await waitForSnap();
    } catch {
      setError("Sistem pembayaran tidak bisa dimuat (timeout). Coba refresh halaman.");
      setBayarLoadingId(null);
      return;
    }

    // @ts-expect-error -- window.snap disuntik oleh script Midtrans
    window.snap.pay(data.token, {
      onSuccess: () => muatData(),
      onPending: () => muatData(),
      onError: () => setError("Pembayaran gagal, coba lagi."),
      onClose: () => {},
    });

    setBayarLoadingId(null);
  }

  if (loading) {
    return (
      <div className="container py-4">
        <p className="text-muted">Memuat...</p>
      </div>
    );
  }

  if (!siswa) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">
          Akun ini belum terhubung ke data siswa. Hubungi petugas sekolah.
        </div>
        <button className="btn btn-outline-secondary" onClick={handleLogout}>Keluar</button>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      {midtrans && (
        <Script
          src={midtrans.isProd
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js"}
          data-client-key={midtrans.clientKey}
          strategy="afterInteractive"
        />
      )}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 mb-0">Detail Saya</h1>
        <button className="btn btn-sm btn-outline-secondary" onClick={handleLogout}>Keluar</button>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card mb-4">
        <div className="card-body d-flex gap-3 align-items-center">
          <img
            src={siswa.fotoUrl || "https://placehold.co/80x80?text=Foto"}
            alt="Foto profil"
            width={80}
            height={80}
            className="rounded-circle"
            style={{ objectFit: "cover" }}
          />
          <div>
            <h2 className="h5 mb-1">{siswa.namaLengkap}</h2>
            <div className="text-muted small">
              NIS {siswa.nis}{siswa.nisn ? ` · NISN ${siswa.nisn}` : ""}
            </div>
            <div className="text-muted small">
              Kelas {siswa.kelas?.namaKelas || "-"} · {siswa.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
            </div>
            {siswa.namaWali && (
              <div className="text-muted small">Wali: {siswa.namaWali} {siswa.kontakWali ? `(${siswa.kontakWali})` : ""}</div>
            )}
          </div>
        </div>
      </div>

      <h2 className="h6 mb-3">Tagihan SPP</h2>
      <div className="list-group">
        {tagihan.map((t) => (
          <div key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">{BULAN_LABEL[t.bulan]} {t.tahun}</div>
              <div className="small text-muted">
                Rp {t.nominal.toLocaleString("id-ID")} · Jatuh tempo {new Date(t.jatuhTempo).toLocaleDateString("id-ID")}
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
              {(t.status === "belum_bayar" || t.status === "terlambat") && (
                <button
                  className="btn btn-sm btn-primary"
                  disabled={bayarLoadingId === t.id}
                  onClick={() => handleBayar(t.id)}
                >
                  {bayarLoadingId === t.id ? "..." : "Bayar Sekarang"}
                </button>
              )}
            </div>
          </div>
        ))}
        {tagihan.length === 0 && (
          <div className="list-group-item text-center text-muted">Belum ada tagihan.</div>
        )}
      </div>
    </div>
  );
}
