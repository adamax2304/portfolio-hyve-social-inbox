import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security";
import { handleOperatorBotMessage } from "@/lib/operator-bot-handler";

type Update = {
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    data: string;
    message?: { chat: { id: number } };
  };
};

async function getDecryptedBotToken(tenantId: string): Promise<string | null> {
  const secret = await prisma.integrationSecret.findFirst({
    where: { tenantId, label: "Operator Bot Token" },
    orderBy: { updatedAt: "desc" },
  });
  if (!secret) return null;
  try {
    return decryptSecret(secret.encryptedPayload);
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const update = (await request.json()) as Update;

  const token = await getDecryptedBotToken(tenantId);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Bot not configured" }, { status: 200 });
  }

  if (!update.message?.text || !update.message.chat?.id) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const chatId = update.message.chat.id;
  const from = update.message.from;

  if (from) {
    await prisma.operatorBotSubscriber.upsert({
      where: { tenantId_chatId: { tenantId, chatId: String(chatId) } },
      update: { username: from.username, firstName: from.first_name },
      create: {
        tenantId,
        chatId: String(chatId),
        username: from.username,
        firstName: from.first_name,
      },
    });
  }

  try {
    await handleOperatorBotMessage(tenantId, token, chatId, update.message.text);
  } catch (e) {
    console.error("Operator bot error:", e);
  }

  return NextResponse.json({ ok: true });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  return NextResponse.json({ ok: true, tenantId, channel: "OPERATOR_BOT" });
}
