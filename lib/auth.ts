import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),

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
