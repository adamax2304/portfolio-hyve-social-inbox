/**
 * Service-bot webhook — handles inline button presses (callback_query)
 * on the platform-owner's notifications. Currently:
 *   • access:approve:<requestId>  → generate login+password, create AppUser,
 *                                    show creds in chat (admin copies & forwards)
 *   • access:reject:<requestId>   → mark rejected, edit original message
 *
 * Uses direct libsql (not Prisma) — see src/lib/access-request-db.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  answerCallback,
  editServiceMessage,
  escapeHtml,
  sendServiceMessage,
} from "@/lib/service-bot";
import {
  approveAccessRequest,
  createAppUserDirect,
  getAccessRequest,
  getAccessRequestCounts,
  listRecentAccessRequests,
  rejectAccessRequest,
} from "@/lib/access-request-db";
import {
  getTelegramSetupRequest,
  markTelegramSetupStatus,
} from "@/lib/telegram-setup-db";
import { prisma } from "@/lib/prisma";

type Update = {
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { message_id: number };
  };
  message?: {
    chat: { id: number };
    from?: { id: number };
    text?: string;
  };
};

export async function POST(req: NextRequest) {
  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const adminChatId = process.env.SERVICE_BOT_ADMIN_CHAT_ID;
  if (!adminChatId) return NextResponse.json({ ok: true });

  // ───── 1. Handle text commands from admin (/access, /tenants, /stats) ─────
  const msg = update.message;
  if (msg?.text && msg.from && String(msg.from.id) === String(adminChatId)) {
    await handleAdminCommand(msg.text.trim());
    return NextResponse.json({ ok: true });
  }

  // ───── 2. Handle inline button presses ─────
  const cb = update.callback_query;
  if (!cb || !cb.data) return NextResponse.json({ ok: true });

  // Verify the click came from the platform owner's chat
  if (String(cb.from.id) !== String(adminChatId)) {
    await answerCallback(cb.id, "Доступ запрещён");
    return NextResponse.json({ ok: true });
  }

  const parts = cb.data.split(":");
  if (!parts[0] || !parts[1] || !parts[2]) {
    await answerCallback(cb.id, "Неизвестная команда");
    return NextResponse.json({ ok: true });
  }

  // ─── Telegram setup requests (self-setup & managed) ───
  if (parts[0] === "tgsetup") {
    return handleTgSetupCallback(
      cb.id,
      parts[1],
      parts[2],
      String(cb.from.id),
    );
  }

  if (parts[0] !== "access") {
    await answerCallback(cb.id, "Неизвестная команда");
    return NextResponse.json({ ok: true });
  }

  const action = parts[1];
  const requestId = parts[2];

  let reqRow;
  try {
    reqRow = await getAccessRequest(requestId);
  } catch (e) {
    console.error("[service-webhook] getAccessRequest:", e);
    await answerCallback(cb.id, "Ошибка БД");
    return NextResponse.json({ ok: true });
  }

  if (!reqRow) {
    await answerCallback(cb.id, "Запрос не найден");
    return NextResponse.json({ ok: true });
  }

  if (reqRow.status !== "PENDING") {
    await answerCallback(
      cb.id,
      reqRow.status === "APPROVED" ? "Уже одобрено" : "Уже отклонено",
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    try {
      await rejectAccessRequest({
        id: requestId,
        approvedBy: String(cb.from.id),
      });
    } catch (e) {
      console.error("[service-webhook] reject:", e);
    }
    if (reqRow.notifyMessageId) {
      await editServiceMessage(
        reqRow.notifyMessageId,
        formatRejectedMessage(reqRow.contact, reqRow.contactType),
      );
    }
    await answerCallback(cb.id, "Запрос отклонён");
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    const login = `hyve_${randomHex(8)}`;
    const password = randomPassword(12);
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      await createAppUserDirect({
        name: reqRow.contact,
        email: login,
        passwordHash,
        telegramHandle:
          reqRow.contactType === "telegram" ? reqRow.contact : null,
      });
    } catch (e) {
      console.error("[service-webhook] createAppUser:", e);
      await answerCallback(cb.id, "Ошибка при создании пользователя");
      return NextResponse.json({ ok: true });
    }

    try {
      await approveAccessRequest({
        id: requestId,
        generatedLogin: login,
        approvedBy: String(cb.from.id),
      });
    } catch (e) {
      console.error("[service-webhook] approve update:", e);
    }

    if (reqRow.notifyMessageId) {
      await editServiceMessage(
        reqRow.notifyMessageId,
        formatApprovedMessage(reqRow.contact, reqRow.contactType, login),
      );
    }
    await sendServiceMessage(formatCredsMessage(reqRow.contact, login, password));
    await answerCallback(cb.id, "Доступ создан ✓");
    return NextResponse.json({ ok: true });
  }

  await answerCallback(cb.id, "Неизвестное действие");
  return NextResponse.json({ ok: true });
}

// ──────────────── helpers ────────────────

function randomHex(n: number): string {
  const buf = new Uint8Array(Math.ceil(n / 2));
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, n);
}

function randomPassword(len: number): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[buf[i] % alphabet.length];
  }
  return out;
}

function formatApprovedMessage(
  contact: string,
  contactType: string,
  login: string,
): string {
  return [
    `✅ <b>Доступ к Hyve выдан</b>`,
    `${"—".repeat(20)}`,
    contactType === "telegram"
      ? `<b>Telegram:</b> ${escapeHtml(contact)}`
      : `<b>Email:</b> ${escapeHtml(contact)}`,
    `<b>Логин:</b> <code>${escapeHtml(login)}</code>`,
    ``,
    `<i>Учётные данные отправлены отдельным сообщением — скопируйте и перешлите клиенту.</i>`,
  ].join("\n");
}

function formatRejectedMessage(contact: string, contactType: string): string {
  return [
    `❌ <b>Запрос отклонён</b>`,
    `${"—".repeat(20)}`,
    contactType === "telegram"
      ? `<b>Telegram:</b> ${escapeHtml(contact)}`
      : `<b>Email:</b> ${escapeHtml(contact)}`,
  ].join("\n");
}

function formatCredsMessage(
  contact: string,
  login: string,
  password: string,
): string {
  return [
    `📋 <b>Учётные данные для клиента</b>`,
    `${"—".repeat(20)}`,
    `Контакт: ${escapeHtml(contact)}`,
    ``,
    `<b>Скопируйте сообщение ниже и отправьте клиенту:</b>`,
    ``,
    `<pre>Доступ к Hyve\n` +
      `Сайт: https://hyve-inbox.vercel.app\n\n` +
      `Логин: ${escapeHtml(login)}\n` +
      `Пароль: ${escapeHtml(password)}\n\n` +
      `Войдите и пройдите онбординг — настройте каналы и AI.</pre>`,
  ].join("\n");
}

// ───────────── Admin chat commands ─────────────
async function handleAdminCommand(text: string): Promise<void> {
  const cmd = text.toLowerCase().split(/\s+/)[0];

  if (cmd === "/start" || cmd === "/help") {
    await sendServiceMessage(
      [
        "👋 <b>Hyve · Сервисный бот</b>",
        "─".repeat(20),
        "Команды для управления платформой:",
        "",
        "• <code>/access</code> — последние заявки на доступ",
        "• <code>/tenants</code> — все workspaces клиентов",
        "• <code>/stats</code> — метрики платформы",
        "• <code>/help</code> — этот список",
        "",
        "Когда приходит новая заявка — нажмите кнопку «✅ Одобрить» прямо в сообщении: бот сгенерирует логин и пароль и пришлёт сюда для пересылки клиенту.",
      ].join("\n"),
    );
    return;
  }

  if (cmd === "/access") {
    try {
      const [counts, recent] = await Promise.all([
        getAccessRequestCounts(),
        listRecentAccessRequests(10),
      ]);
      const lines = [
        `🔑 <b>Заявки на доступ</b>`,
        "─".repeat(20),
        `Ожидают: <b>${counts.pending}</b>`,
        `Одобрено: <b>${counts.approved}</b>`,
        `Отклонено: <b>${counts.rejected}</b>`,
        `Всего: <b>${counts.total}</b>`,
        "",
        "<b>Последние 10:</b>",
      ];
      if (recent.length === 0) {
        lines.push("<i>(пусто)</i>");
      } else {
        for (const r of recent) {
          const flag =
            r.status === "PENDING" ? "⏳" : r.status === "APPROVED" ? "✅" : "❌";
          lines.push(
            `${flag} <code>${escapeHtml(r.contact)}</code>` +
              (r.generatedLogin ? ` → <code>${escapeHtml(r.generatedLogin)}</code>` : ""),
          );
        }
      }
      await sendServiceMessage(lines.join("\n"));
    } catch (e) {
      await sendServiceMessage(`❌ Ошибка: ${(e as Error).message}`);
    }
    return;
  }

  if (cmd === "/tenants") {
    try {
      const tenants = await prisma.tenant.findMany({
        include: {
          memberships: { include: { user: true } },
          channels: true,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      const lines = [`👥 <b>Все workspaces (${tenants.length})</b>`, "─".repeat(20)];
      if (tenants.length === 0) {
        lines.push("<i>(пусто)</i>");
      } else {
        for (const t of tenants) {
          const owner = t.memberships.find((m) => m.role === "OWNER")?.user;
          const conn = t.channels.filter((c) => c.status === "CONNECTED").length;
          lines.push(
            `• <b>${escapeHtml(t.name)}</b> <code>${escapeHtml(t.slug)}</code>\n` +
              `   ${owner ? escapeHtml(owner.email) : "—"} · ${t.memberships.length}👤 · ${conn}🔌`,
          );
        }
      }
      await sendServiceMessage(lines.join("\n"));
    } catch (e) {
      await sendServiceMessage(`❌ Ошибка: ${(e as Error).message}`);
    }
    return;
  }

  if (cmd === "/stats") {
    try {
      const [tenantsCount, usersCount, conversationsCount, messagesCount, ordersCount, channelsCount] =
        await Promise.all([
          prisma.tenant.count(),
          prisma.appUser.count(),
          prisma.conversation.count(),
          prisma.message.count(),
          prisma.order.count(),
          prisma.channelConnection.count({ where: { status: "CONNECTED" } }),
        ]);
      await sendServiceMessage(
        [
          `📊 <b>Метрики Hyve</b>`,
          "─".repeat(20),
          `Workspaces: <b>${tenantsCount}</b>`,
          `Пользователей: <b>${usersCount}</b>`,
          `Подключено каналов: <b>${channelsCount}</b>`,
          `Диалогов: <b>${conversationsCount}</b>`,
          `Сообщений: <b>${messagesCount}</b>`,
          `Заказов: <b>${ordersCount}</b>`,
        ].join("\n"),
      );
    } catch (e) {
      await sendServiceMessage(`❌ Ошибка: ${(e as Error).message}`);
    }
    return;
  }

  await sendServiceMessage(
    "🤔 Неизвестная команда. Доступно: <code>/access /tenants /stats /help</code>",
  );
}

// ───────────── Telegram setup request callbacks ─────────────
async function handleTgSetupCallback(
  callbackId: string,
  action: string,
  requestId: string,
  fromId: string,
): Promise<NextResponse> {
  let reqRow;
  try {
    reqRow = await getTelegramSetupRequest(requestId);
  } catch (e) {
    console.error("[service-webhook] getTelegramSetupRequest:", e);
    await answerCallback(callbackId, "Ошибка БД");
    return NextResponse.json({ ok: true });
  }
  if (!reqRow) {
    await answerCallback(callbackId, "Заявка не найдена");
    return NextResponse.json({ ok: true });
  }

  // Allow re-marking from any non-terminal state
  if (reqRow.status === "REJECTED") {
    await answerCallback(callbackId, "Уже отклонено");
    return NextResponse.json({ ok: true });
  }
  if (reqRow.status === "GRANTED" && action !== "reject") {
    await answerCallback(callbackId, "Доступ уже выдан");
    return NextResponse.json({ ok: true });
  }

  const sep = "─".repeat(20);
  const contactLine =
    reqRow.contactType === "telegram"
      ? `<b>Telegram:</b> ${escapeHtml(reqRow.contact)}`
      : reqRow.contactType === "phone"
      ? `<b>Телефон:</b> ${escapeHtml(reqRow.contact)}`
      : `<b>Email:</b> ${escapeHtml(reqRow.contact)}`;

  if (action === "contacted") {
    try {
      await markTelegramSetupStatus(requestId, "CONTACTED", fromId);
    } catch (e) {
      console.error("[service-webhook] tgsetup contacted:", e);
    }
    if (reqRow.notifyMessageId) {
      await editServiceMessage(
        reqRow.notifyMessageId,
        [
          `📩 <b>Связались с клиентом</b>`,
          sep,
          contactLine,
          `<b>Тип заявки:</b> ${reqRow.flow === "self" ? "сам через бота" : "под ключ"}`,
        ].join("\n"),
      );
    }
    await answerCallback(callbackId, "Помечено: связались ✓");
    return NextResponse.json({ ok: true });
  }

  if (action === "granted") {
    try {
      await markTelegramSetupStatus(requestId, "GRANTED", fromId);
    } catch (e) {
      console.error("[service-webhook] tgsetup granted:", e);
    }
    if (reqRow.notifyMessageId) {
      await editServiceMessage(
        reqRow.notifyMessageId,
        [
          `🔓 <b>Доступ к боту выдан</b>`,
          sep,
          contactLine,
          reqRow.botToken
            ? `<b>Bot token использовался:</b> <code>${escapeHtml(
                reqRow.botToken.slice(0, 8) + "…",
              )}</code>`
            : "",
          ``,
          `<i>Дальше клиент сам подключает каналы в своём боте.</i>`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
    await answerCallback(callbackId, "Доступ помечен как выданный ✓");
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    try {
      await markTelegramSetupStatus(requestId, "REJECTED", fromId);
    } catch (e) {
      console.error("[service-webhook] tgsetup reject:", e);
    }
    if (reqRow.notifyMessageId) {
      await editServiceMessage(
        reqRow.notifyMessageId,
        [`❌ <b>Заявка отклонена</b>`, sep, contactLine].join("\n"),
      );
    }
    await answerCallback(callbackId, "Отклонено");
    return NextResponse.json({ ok: true });
  }

  await answerCallback(callbackId, "Неизвестное действие");
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "hyve-service-bot-webhook" });
}
