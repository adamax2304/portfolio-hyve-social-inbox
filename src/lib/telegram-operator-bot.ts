/**
 * Thin Telegram Bot API client for the per-tenant operator bot.
 *
 * The operator bot is the bot that the OWNERS / OPERATORS chat with to
 * manage their workspace from inside Telegram. It is separate from any
 * customer-facing TELEGRAM ChannelConnection.
 */

const TG_API = "https://api.telegram.org";

type GetMe = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
};

async function call<T>(token: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${TG_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? "unknown"}`);
  }
  return data.result as T;
}

export async function getMe(token: string): Promise<GetMe> {
  return call<GetMe>(token, "getMe");
}

export async function setWebhook(token: string, url: string): Promise<boolean> {
  return call<boolean>(token, "setWebhook", {
    url,
    drop_pending_updates: true,
    allowed_updates: ["message", "callback_query"],
  });
}

export async function deleteWebhook(token: string): Promise<boolean> {
  return call<boolean>(token, "deleteWebhook");
}

export async function getUpdates(
  token: string,
  offset?: number,
): Promise<unknown[]> {
  const body: Record<string, unknown> = { timeout: 0 };
  if (offset !== undefined) body.offset = offset;
  return call<unknown[]>(token, "getUpdates", body);
}

export async function setMyCommands(token: string): Promise<boolean> {
  return call<boolean>(token, "setMyCommands", {
    commands: [
      { command: "start",     description: "Запустить рабочий кабинет" },
      { command: "messages",  description: "Открытые диалоги" },
      { command: "orders",    description: "Все заказы" },
      { command: "neworders", description: "Только новые заказы" },
      { command: "stats",     description: "Сводка по бизнесу" },
      { command: "help",      description: "Доступные команды" },
    ],
  });
}

export async function setChatMenuButton(token: string): Promise<boolean> {
  return call<boolean>(token, "setChatMenuButton", {
    menu_button: { type: "commands" },
  });
}

export async function sendMessage(
  token: string,
  chatId: string | number,
  text: string,
  extra?: Record<string, unknown>,
): Promise<unknown> {
  return call(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

export function makeReplyKeyboard() {
  return {
    keyboard: [
      [{ text: "📨 Сообщения" }, { text: "🛒 Заказы" }],
      [{ text: "🆕 Новые заказы" }, { text: "📊 Статистика" }],
      [{ text: "ℹ️ Помощь" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

export function maskToken(token: string) {
  if (token.length < 12) return "***";
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}
