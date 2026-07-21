import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),

  // Map nama tabel default Better Auth (user/session/account/verification)
  // ke nama tabel Indonesia yang udah didefinisiin di schema.prisma.
  // Nama field di dalamnya TETAP default (jangan diubah).
  user: {
    modelName: "akun",
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "siswa",
        input: false, // role nggak boleh diisi user pas signup, cuma admin yg set
      },
    },
  },
  session: {
    modelName: "sesi",
  },
  account: {
    modelName: "kredensial",
  },
  verification: {
    modelName: "verifikasi",
  },

  emailAndPassword: {
    enabled: true,
  },

  // Redirect beda tujuan sesuai role ditangani di halaman login (client-side)
  // setelah cek session.user.role — bukan di config ini.
});

export type Session = typeof auth.$Infer.Session;
