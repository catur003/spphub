"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    if (signInError) {
      setError("Email atau password salah.");
      setLoading(false);
      return;
    }

    const role = (data?.user as { role?: string })?.role;

    if (role === "siswa") {
      router.push("/siswa/detail-saya");
    } else {
      router.push("/admin/dashboard");
    }
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-[400px] rounded-card border border-border-soft bg-white p-8 shadow-sm2">
        <h1 className="mb-6 text-center text-xl font-semibold text-ink-900">
          Login SPP Sekolah
        </h1>

        {error && (
          <div className="mb-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Email</label>
            <input
              type="email"
              className="w-full rounded-control border border-border-soft px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Password</label>
            <input
              type="password"
              className="w-full rounded-control border border-border-soft px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-control bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
