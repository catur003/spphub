/**
 * Fonnte WhatsApp Gateway Integration Helper
 * API Documentation: https://fonnte.com/api/
 */

export function normalisasiNoHp(no: string): string {
  if (!no) return "";
  let clean = no.replace(/\D/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  }
  return clean;
}

export type FonnteSendParams = {
  token: string;
  target: string;
  pesan: string;
};

export type FonnteResponse = {
  status: boolean;
  detail?: string;
  id?: string[];
  process?: string;
};

export async function kirimPesanFonnte({
  token,
  target,
  pesan,
}: FonnteSendParams): Promise<FonnteResponse> {
  const targetClean = normalisasiNoHp(target);
  if (!targetClean) {
    throw new Error("Nomor HP target tidak valid");
  }

  if (!token) {
    throw new Error("Token Fonnte belum diatur");
  }

  const formData = new FormData();
  formData.append("target", targetClean);
  formData.append("message", pesan);
  formData.append("countryCode", "62");

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token.trim(),
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === false) {
    throw new Error(data.reason || data.detail || "Gagal mengirim pesan via Fonnte");
  }

  return data;
}
