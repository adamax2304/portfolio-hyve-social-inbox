import { NextRequest, NextResponse } from "next/server";
import { ChannelProvider } from "@prisma/client";
import { ingestInboundMessage } from "@/lib/inbox";

/**
 * Signal webhook receiver (signal-cli-rest-api / bbernhard format).
 *
 * Expected payload:
 * {
 *   account: "+1234567890",
 *   envelope: {
 *     source: "+9876543210",
 *     sourceName: "John",
 *     dataMessage: { message: "Hi" },
 *     timestamp: 1700000000000
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const env = body.envelope;
  const text = env?.dataMessage?.message;

  if (!text || !env?.source) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const tenantSlug =
    request.nextUrl.searchParams.get("tenant") ?? "northstar-atelier";

  const result = await ingestInboundMessage({
    tenantSlug,
    provider: ChannelProvider.SIGNAL,
    channelLabel: "Signal Messenger",
    externalAccountId: String(body.account ?? env.source),
    contactExternalId: String(env.source),
    contactDisplayName: env.sourceName ?? env.source,
    contactUsername: env.sourceNumber,
    content: text,
    externalMessageId: env.timestamp ? String(env.timestamp) : undefined,
    metadata: body,
  });

  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  return NextResponse.json({ ok: true, channel: "SIGNAL" });
}
