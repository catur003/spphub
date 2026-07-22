"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DetailSayaRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/siswa");
  }, [router]);

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 text-muted">
      <div className="spinner-border text-primary me-2" />
      <span>Mengalihkan ke Portal Siswa Terbaru...</span>
    </div>
  );
}
