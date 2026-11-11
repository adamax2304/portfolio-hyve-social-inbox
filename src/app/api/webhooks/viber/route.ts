import { NextRequest, NextResponse } from "next/server";
import { ChannelProvider } from "@prisma/client";
import { ingestInboundMessage } from "@/lib/inbox";

/**
 * Viber webhook receiver.
 *
 * Viber sends events with shape:
 * {
 *   event: "message",
 *   sender: { id, name, avatar, language },
 *   message: { type, text, ... }
 * }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Health check or non-message events
  if (body.event !== "message" || !body.message?.text || !body.sender?.id) {
    return NextResponse.json({ status: 0, status_message: "ok" });
  }

  const tenantSlug =
    request.nextUrl.searchParams.get("tenant") ?? "northstar-atelier";

  const result = await ingestInboundMessage({
    tenantSlug,
    provider: ChannelProvider.VIBER,
    channelLabel: "Viber Business",
    externalAccountId: String(body.sender.id),
    contactExternalId: String(body.sender.id),
    contactDisplayName: body.sender.name ?? "Viber User",
    contactUsername: body.sender.name,
    content: body.message.text,
    externalMessageId: body.message_token ? String(body.message_token) : undefined,
    metadata: body,
  });

  return NextResponse.json({ status: 0, status_message: "ok", ...result });
}

export async function GET() {
  return NextResponse.json({ ok: true, channel: "VIBER" });
}
