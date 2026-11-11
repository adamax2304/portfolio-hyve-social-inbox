import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security";
import { ChannelProvider, SecretKind } from "@prisma/client";

export async function dispatchTelegramMessage(
  tenantId: string,
  conversationId: string,
  text: string,
): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true },
  });

  if (!conversation || conversation.provider !== ChannelProvider.TELEGRAM) {
    return false;
  }

  const secret = await prisma.integrationSecret.findFirst({
    where: {
      tenantId,
      provider: ChannelProvider.TELEGRAM,
      secretKind: SecretKind.BOT_TOKEN,
    },
  });

  if (!secret) {
    console.warn(`[Telegram] No BOT_TOKEN found for tenant ${tenantId}`);
    return false;
  }

  const token = decryptSecret(secret.encryptedPayload);
  const chatId = conversation.contact.externalUserId;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Telegram] sendMessage failed (${res.status}): ${body}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Telegram] Network error:", err);
    return false;
  }
}
