import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChannelProvider } from "@prisma/client";
import { ingestInboundMessage } from "@/lib/inbox";

const inboundSchema = z.object({
  tenantSlug: z.string().min(1),
  provider: z.nativeEnum(ChannelProvider),
  channelLabel: z.string().optional(),
  externalAccountId: z.string().optional(),
  contactExternalId: z.string().min(1),
  contactDisplayName: z.string().min(1),
  contactUsername: z.string().optional(),
  content: z.string().min(1),
  externalMessageId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const body = inboundSchema.parse(await request.json());
  const result = await ingestInboundMessage(body);

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
