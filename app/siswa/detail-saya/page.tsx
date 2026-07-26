"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DetailSayaRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/siswa");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center text-ink-500">
      <div className="mr-2 h-6 w-6 animate-spin rounded-full border-[3px] border-accent-soft border-t-accent" />
      <span>Mengalihkan ke Portal Siswa Terbaru...</span>
    </div>
  );
}
