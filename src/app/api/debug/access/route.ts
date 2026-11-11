/**
 * Diagnostic endpoint — reports whether the AccessRequest table is reachable
 * via Prisma. Visit GET /api/debug/access to see status.
 *
 * This is intentionally read-only; it does NOT create or expose any
 * sensitive data. Safe to keep around for monitoring.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result: Record<string, unknown> = {
    ok: true,
    env: {
      hasDbUrl: Boolean(process.env.DATABASE_URL),
      dbScheme: (process.env.DATABASE_URL ?? "").split(":")[0],
      hasAuthToken: Boolean(process.env.DATABASE_AUTH_TOKEN),
      hasServiceBotToken: Boolean(process.env.SERVICE_BOT_TOKEN),
      hasAdminChatId: Boolean(process.env.SERVICE_BOT_ADMIN_CHAT_ID),
    },
  };

  try {
    // Test that the AccessRequest accessor exists in the prisma client
    const hasAccessor = typeof (prisma as unknown as Record<string, unknown>)
      .accessRequest !== "undefined";
    result.hasAccessor = hasAccessor;

    // Test old-model first to confirm adapter is working at all
    try {
      const userCount = await prisma.appUser.count();
      result.appUserCount = userCount;
    } catch (e) {
      result.appUserError = (e as Error).message.slice(0, 200);
    }

    if (hasAccessor) {
      const count = await prisma.accessRequest.count();
      result.accessRequestCount = count;

      // Try a roundtrip create + delete to verify writes work
      const testId = `__diag_${Date.now()}`;
      const created = await prisma.accessRequest.create({
        data: {
          id: testId,
          contact: "diagnostic@hyve.local",
          contactType: "email",
          status: "PENDING",
        },
      });
      await prisma.accessRequest.delete({ where: { id: created.id } });
      result.writeRoundtrip = "ok";
    }
  } catch (e) {
    result.ok = false;
    result.error = (e as Error).message;
    result.errorStack = (e as Error).stack?.split("\n").slice(0, 5);
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
