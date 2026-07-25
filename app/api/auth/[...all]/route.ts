import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

const nextJsHandler = toNextJsHandler(auth);

async function autoRepairCredentials() {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE kredensial SET accountId = akunId WHERE providerId = 'credential' AND accountId != akunId`
    );
  } catch (e) {
    // Ignore error if raw sql unsupported
  }
}

export async function GET(req: any, ctx: any) {
  await autoRepairCredentials();
  return nextJsHandler.GET(req, ctx);
}

export async function POST(req: any, ctx: any) {
  await autoRepairCredentials();
  return nextJsHandler.POST(req, ctx);
}
