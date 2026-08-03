import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),

  // Eksplisit baseURL + trustedOrigins dari env, jangan andalkan auto-detect
  // Better Auth doang. Kalau app diakses lewat custom domain (mis.
  // spp.zenin.my.id) tapi BETTER_AUTH_URL di env gak persis sama (typo,
  // trailing slash, masih domain Railway bawaan, dst.), validasi sesi bisa
  // gagal diam-diam pas request datang dari origin yang "gak dikenal" —
  // termasuk request internal Puppeteer di fitur Custom Print PDF.
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_BETTER_AUTH_URL].filter(
    (v): v is string => Boolean(v)
  ),

  // Map nama tabel default Better Auth (user/session/account/verification)
  // ke nama tabel Indonesia yang udah didefinisiin di schema.prisma.
  user: {
    modelName: "akun",
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "siswa",
        input: false,
      },
    },
  },
  session: {
    modelName: "sesi",
    fields: {
      userId: "akunId",
    },
    // Cache sesi di cookie (signed, short-lived) supaya requireRole() di setiap
    // layout/page admin TIDAK query DB tiap kali pindah tab menu.
    // Tanpa ini, getSession() hit database di SETIAP navigasi -> lemot & tidak
    // konsisten tergantung kondisi koneksi DB saat itu.
    cookieCache: {
      enabled: true,
      maxAge: 60, // detik — sesi divalidasi ulang ke DB paling lama tiap 60 detik
    },
  },
  account: {
    modelName: "kredensial",
    fields: {
      userId: "akunId",
    },
  },
  verification: {
    modelName: "verifikasi",
  },

  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password: string) => {
        return await bcrypt.hash(password, 10);
      },
      verify: async ({ password, hash }: { password: string; hash: string }) => {
        return await bcrypt.compare(password, hash);
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
