import { NextRequest, NextResponse } from "next/server";
import { ChannelProvider } from "@prisma/client";
import { ingestInboundMessage } from "@/lib/inbox";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = body.message;

  if (!message?.text || !message?.from?.id) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const tenantSlug =
    request.nextUrl.searchParams.get("tenant") ?? "northstar-atelier";

  const result = await ingestInboundMessage({
    tenantSlug,
    provider: ChannelProvider.TELEGRAM,
    channelLabel: "Telegram Operator Hub",
    externalAccountId: String(body.message.chat?.id ?? "telegram-chat"),
    contactExternalId: String(message.from.id),
    contactDisplayName:
      [message.from.first_name, message.from.last_name]
        .filter(Boolean)
        .join(" ") ||
      message.from.username ||
      "Telegram User",
    contactUsername: message.from.username,
    content: message.text,
    externalMessageId: String(message.message_id),
    metadata: body,
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
