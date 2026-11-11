const channelLabels: Record<string, string> = {
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  MESSENGER: "Messenger",
  WEBCHAT: "Web Chat",
};

const statusLabels: Record<string, string> = {
  CONNECTED: "Connected",
  PENDING: "Pending setup",
  ERROR: "Needs attention",
  DISCONNECTED: "Disconnected",
  OPEN: "Open",
  ESCALATED: "Escalated",
  CLOSED: "Closed",
  SUGGEST: "AI drafts",
  AUTO: "AI autopilot",
  OFF: "Manual only",
  STARTER: "Starter",
  GROWTH: "Growth",
  SCALE: "Scale",
  OWNER: "Owner",
  ADMIN: "Admin",
  AGENT: "Agent",
  VIEWER: "Viewer",
  DRAFT: "Draft",
  IN_PROGRESS: "In progress",
  READY: "Ready to launch",
  LIVE: "Live",
  ACCESS_TOKEN: "Access token",
  REFRESH_TOKEN: "Refresh token",
  WEBHOOK_SECRET: "Webhook secret",
  BOT_TOKEN: "Bot token",
  API_KEY: "API key",
  VERIFY_TOKEN: "Verify token",
};

export function titleizeToken(value: string) {
  return statusLabels[value] ?? channelLabels[value] ?? value.replaceAll("_", " ");
}

export function formatRelativeTime(date: Date) {
  const diff = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round(diff / (1000 * 60));

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);

  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  return formatter.format(days, "day");
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Day separator label for chat threads (Telegram-style):
 * Today / Yesterday / DayName / Date.
 */
export function formatDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return "Сегодня";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const wasYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (wasYesterday) return "Вчера";

  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays >= 0 && diffDays < 7) {
    return d.toLocaleDateString("ru-RU", { weekday: "long" });
  }
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
