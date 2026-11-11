import { prisma } from "@/lib/prisma";
import { sendMessage, makeReplyKeyboard } from "@/lib/telegram-operator-bot";

const labels: Record<string, string> = {
  NEW: "🆕 Новый",
  CONFIRMED: "✅ Подтверждён",
  IN_PROGRESS: "🛠 В работе",
  COMPLETED: "✔️ Выполнен",
  CANCELLED: "❌ Отменён",
};

/**
 * Process a single text message from a Telegram user that's chatting with
 * the operator bot. Always replies with something — even when the result
 * is empty (so the bot's menu buttons feel responsive).
 */
export async function handleOperatorBotMessage(
  tenantId: string,
  token: string,
  chatId: number,
  text: string,
) {
  const cmd = text.trim().toLowerCase();

  // ───── /messages | 📨 Сообщения ─────
  if (cmd === "/messages" || cmd === "📨 сообщения") {
    const conversations = await prisma.conversation.findMany({
      where: { tenantId, status: { in: ["OPEN", "PENDING", "ESCALATED"] } },
      include: { contact: true, messages: { take: 1, orderBy: { createdAt: "desc" } } },
      orderBy: { lastMessageAt: "desc" },
      take: 10,
    });
    if (conversations.length === 0) {
      await sendMessage(
        token,
        chatId,
        "📭 <b>Открытых диалогов нет.</b>\n\nКак только клиент напишет — увидите сообщение здесь.",
        { reply_markup: makeReplyKeyboard() },
      );
      return;
    }
    const lines = conversations.map((c, i) => {
      const last = c.messages[0]?.content ?? "—";
      return `<b>${i + 1}. ${c.contact.displayName}</b> · ${c.provider}\n   <i>${escapeHtml(last.slice(0, 80))}</i>`;
    });
    await sendMessage(
      token,
      chatId,
      `📨 <b>Открытые диалоги (${conversations.length}):</b>\n\n${lines.join("\n\n")}`,
      { reply_markup: makeReplyKeyboard() },
    );
    return;
  }

  // ───── /orders | 🛒 Заказы ─────
  if (cmd === "/orders" || cmd === "🛒 заказы") {
    const orders = await prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    if (orders.length === 0) {
      await sendMessage(
        token,
        chatId,
        "📦 <b>Заказов пока нет.</b>\n\nКак только AI или оператор оформит заказ — он появится здесь.",
        { reply_markup: makeReplyKeyboard() },
      );
      return;
    }
    const lines = orders.map(
      (o, i) =>
        `<b>${i + 1}. ${escapeHtml(o.contactName)}</b> ${labels[o.status] ?? o.status}` +
        (o.totalAmount ? ` · ${escapeHtml(o.totalAmount)}` : ""),
    );
    await sendMessage(
      token,
      chatId,
      `🛒 <b>Все заказы (${orders.length}):</b>\n\n${lines.join("\n")}`,
      { reply_markup: makeReplyKeyboard() },
    );
    return;
  }

  // ───── /neworders | 🆕 Новые заказы ─────
  if (cmd === "/neworders" || cmd === "🆕 новые заказы") {
    const orders = await prisma.order.findMany({
      where: { tenantId, status: "NEW" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    if (orders.length === 0) {
      await sendMessage(
        token,
        chatId,
        "✨ <b>Новых заказов нет</b> — все обработаны!\n\nХороший знак 🎉",
        { reply_markup: makeReplyKeyboard() },
      );
      return;
    }
    const lines = orders.map((o, i) => {
      const items = (() => {
        try {
          const arr = JSON.parse(o.itemsJson) as { name: string }[];
          return arr.map((it) => `• ${escapeHtml(it.name)}`).join("\n   ");
        } catch {
          return "—";
        }
      })();
      return (
        `<b>${i + 1}. ${escapeHtml(o.contactName)}</b>` +
        (o.contactPhone ? ` · ${escapeHtml(o.contactPhone)}` : "") +
        `\n   ${items}` +
        (o.totalAmount ? `\n   💵 ${escapeHtml(o.totalAmount)}` : "") +
        (o.deliveryInfo ? `\n   📍 ${escapeHtml(o.deliveryInfo)}` : "")
      );
    });
    await sendMessage(
      token,
      chatId,
      `🆕 <b>Новые заказы (${orders.length}):</b>\n\n${lines.join("\n\n")}`,
      { reply_markup: makeReplyKeyboard() },
    );
    return;
  }

  // ───── /stats | 📊 Статистика ─────
  if (cmd === "/stats" || cmd === "📊 статистика") {
    const [conversations, orders, channels, totalOrders] = await Promise.all([
      prisma.conversation.count({ where: { tenantId, status: { in: ["OPEN", "ESCALATED"] } } }),
      prisma.order.count({ where: { tenantId, status: "NEW" } }),
      prisma.channelConnection.count({ where: { tenantId, status: "CONNECTED" } }),
      prisma.order.count({ where: { tenantId } }),
    ]);
    await sendMessage(
      token,
      chatId,
      `📊 <b>Сводка по бизнесу:</b>\n\n` +
        `💬 Открытых диалогов: <b>${conversations}</b>\n` +
        `🆕 Новых заказов: <b>${orders}</b>\n` +
        `🛒 Всего заказов: <b>${totalOrders}</b>\n` +
        `🔌 Подключено каналов: <b>${channels}</b>`,
      { reply_markup: makeReplyKeyboard() },
    );
    return;
  }

  // ───── /start, /help, ℹ️ Помощь ─────
  if (cmd === "/start" || cmd === "/help" || cmd === "ℹ️ помощь") {
    await sendMessage(
      token,
      chatId,
      `👋 <b>Hyve — управление в Telegram</b>\n\n` +
        `Доступные команды:\n` +
        `/messages — открытые диалоги\n` +
        `/orders — все заказы\n` +
        `/neworders — только новые заказы\n` +
        `/stats — сводка по бизнесу\n\n` +
        `Используйте кнопки меню снизу для быстрого доступа 👇`,
      { reply_markup: makeReplyKeyboard() },
    );
    return;
  }

  // Default
  await sendMessage(
    token,
    chatId,
    "🤔 Не понял команду. Используйте кнопки меню или /help.",
    { reply_markup: makeReplyKeyboard() },
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
