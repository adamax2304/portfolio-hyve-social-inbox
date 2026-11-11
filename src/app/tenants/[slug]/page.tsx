import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Bot,
  Camera,
  CheckCircle2,
  Clock,
  Globe,
  MessageCircle,
  Phone,
  Send,
  Settings2,
  ShoppingBag,
  Sparkles,
  UserRound,
  Users,
  WandSparkles,
  AlertCircle,
  Cable,
  Zap,
} from "lucide-react";
import {
  createOrder,
  simulateInboundLead,
  toggleChannel,
  updateOrderStatus,
} from "@/app/actions";
import { StatusPill } from "@/components/status-pill";
import { ChatComposer } from "@/components/chat-composer";
import { VoicePlayer } from "@/components/voice-player";
import { AiPresetSwitcher } from "@/components/ai-preset-switcher";
import { formatDay, formatRelativeTime, titleizeToken } from "@/lib/format";
import { getTenantWorkspace } from "@/lib/inbox";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getI18nBundle } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/format";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ conversation?: string; tab?: string }>;
};

type PlatformStyle = { color: string; bg: string; icon: React.ElementType };

function platformStyle(provider: string): PlatformStyle {
  const map: Record<string, PlatformStyle> = {
    INSTAGRAM: { color: "#E1306C", bg: "#FEE2EE", icon: Camera },
    WHATSAPP:  { color: "#128C7E", bg: "#D1FAE5", icon: Phone },
    TELEGRAM:  { color: "#229ED9", bg: "#DBEAFE", icon: Send },
    MESSENGER: { color: "#0084FF", bg: "#EFF6FF", icon: MessageCircle },
    WEBCHAT:   { color: "#8B4A31", bg: "#FEF3C7", icon: Globe },
    VIBER:     { color: "#7360F2", bg: "#EEE8FF", icon: MessageCircle },
    SIGNAL:    { color: "#3A76F0", bg: "#EBF2FF", icon: MessageCircle },
  };
  return map[provider] ?? { color: "#8B7F73", bg: "#F5F1EA", icon: MessageCircle };
}

// Order status colors only — labels come from translation
const orderStatusColors: Record<string, string> = {
  NEW:         "#D97706",
  CONFIRMED:   "#059669",
  IN_PROGRESS: "#229ED9",
  COMPLETED:   "#6b7280",
  CANCELLED:   "#DC2626",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "OPEN")
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "ESCALATED")
    return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
  return <Clock className="h-3.5 w-3.5 text-amber-400" />;
}

export default async function TenantPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { conversation: selectedId, tab } = await searchParams;
  const activeTab = tab === "orders" ? "orders" : "inbox";

  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, tenant: { slug } },
  });
  if (!membership) redirect("/dashboard");

  const workspace = await getTenantWorkspace(slug, selectedId);
  if (!workspace) notFound();

  const { tenant, selectedConversation, orders } = workspace;

  const tenantExt = tenant as unknown as {
    aiCollectOrders?: boolean;
    aiManagerInstructions?: string;
    aiUseManaged?: boolean;
  };

  const { locale, messages } = await getI18nBundle();
  const t = createTranslator(messages);

  // Localized order status labels (built from translations)
  const orderStatusLabels: Record<string, { label: string; color: string }> = {
    NEW:         { label: t("dashboard.orderNew"),         color: orderStatusColors.NEW },
    CONFIRMED:   { label: t("dashboard.orderConfirmed"),   color: orderStatusColors.CONFIRMED },
    IN_PROGRESS: { label: t("dashboard.orderInProgress"),  color: orderStatusColors.IN_PROGRESS },
    COMPLETED:   { label: t("dashboard.orderCompleted"),   color: orderStatusColors.COMPLETED },
    CANCELLED:   { label: t("dashboard.orderCancelled"),   color: orderStatusColors.CANCELLED },
  };

  const newOrderCount = orders.filter((o) => o.status === "NEW").length;

  return (
    <main className="page-enter mx-auto flex w-full max-w-[1700px] flex-1 flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6">
      {/* ── Header ── */}
      <header
        className="surface-panel flex flex-col gap-3 rounded-[28px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--text-faint)" }}
          >
            ← Dashboard
          </Link>
          <span style={{ color: "var(--text-faint)" }}>/</span>
          <h1 className="text-lg font-bold tracking-[-0.04em] sm:text-xl" style={{ color: "var(--text)" }}>
            {tenant.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="warm" value={tenant.plan} />
          <StatusPill tone={tenant.aiEnabled ? "cool" : "neutral"} value={tenant.aiMode} />
          <Link
            href={`/tenants/${tenant.slug}/setup`}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:bg-[var(--bg-muted)]"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <Settings2 className="h-3 w-3" />
            {t("workspace.settingsLink")}
          </Link>
        </div>
      </header>

      {/* ── Top compact strip: 4 panels ── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {/* Orders summary */}
        <div className="surface-panel rounded-[20px] p-4">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: newOrderCount > 0 ? "#FEF3C7" : "var(--accent-soft)" }}
            >
              <ShoppingBag
                className="h-4 w-4"
                style={{ color: newOrderCount > 0 ? "#D97706" : "var(--accent)" }}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                {t("workspace.ordersStripLabel")}
              </p>
              <p className="text-base font-bold" style={{ color: "var(--text)" }}>
                {newOrderCount > 0
                  ? t("workspace.ordersStripNew", { count: newOrderCount })
                  : t("workspace.ordersStripAllDone")}
              </p>
            </div>
          </div>
          <Link
            href={`/tenants/${tenant.slug}?tab=orders`}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition hover:opacity-90"
            style={{
              backgroundColor: activeTab === "orders" ? "var(--btn-fill)" : "var(--bg-muted)",
              color: activeTab === "orders" ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            {t("workspace.ordersStripOpen")}
          </Link>
        </div>

        {/* Channels with quick toggles */}
        <div className="surface-panel rounded-[20px] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Cable className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
              {t("workspace.channelsStripLabel", { count: tenant.channels.length })}
            </p>
          </div>
          <div className="space-y-1.5">
            {tenant.channels.slice(0, 3).map((ch) => {
              const ps = platformStyle(ch.provider);
              const Icon = ps.icon;
              const enabled = (ch as unknown as { enabled?: boolean }).enabled !== false;
              return (
                <div key={ch.id} className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: ps.bg }}
                  >
                    <Icon className="h-3 w-3" style={{ color: ps.color }} />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {titleizeToken(ch.provider)}
                  </p>
                  <form action={toggleChannel}>
                    <input type="hidden" name="tenantSlug" value={tenant.slug} />
                    <input type="hidden" name="channelId" value={ch.id} />
                    <input type="hidden" name="enable" value={enabled ? "false" : "true"} />
                    <span className="switch-row" data-on={enabled}>
                      <span className="switch-label">{enabled ? t("workspace.channelOn") : t("workspace.channelOff")}</span>
                      <button
                        type="submit"
                        className="switch-track switch-sm"
                        data-on={enabled}
                        aria-label={enabled ? t("workspace.channelDisableLabel") : t("workspace.channelEnableLabel")}
                      />
                    </span>
                  </form>
                </div>
              );
            })}
            {tenant.channels.length > 3 ? (
              <Link
                href={`/tenants/${tenant.slug}/setup`}
                className="block pt-1 text-[11px] font-semibold hover:underline"
                style={{ color: "var(--accent)" }}
              >
                {t("workspace.moreInSettings", { count: tenant.channels.length - 3 })}
              </Link>
            ) : null}
          </div>
        </div>

        {/* Online team */}
        <div className="surface-panel rounded-[20px] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
              {t("workspace.onlineLabel", { count: tenant.memberships.length })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tenant.memberships.slice(0, 6).map((m) => (
              <div key={m.id} className="relative" title={`${m.user.name} · ${m.role}`}>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  {m.user.name.slice(0, 1).toUpperCase()}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                  style={{ backgroundColor: "#22c55e", borderColor: "var(--bg-panel)" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Test lead */}
        <div className="surface-panel rounded-[20px] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
              {t("workspace.testLeadEyebrow")}
            </p>
          </div>
          <form action={simulateInboundLead} className="space-y-1.5">
            <input type="hidden" name="tenantSlug" value={tenant.slug} />
            <input type="hidden" name="contactDisplayName" value="Test Lead" />
            <input type="hidden" name="contactExternalId" value={`test_${Date.now()}`} />
            <input type="hidden" name="content" value={t("workspace.testLeadDefaultText")} />
            <select
              name="provider"
              defaultValue="TELEGRAM"
              className="w-full rounded-xl border px-2 py-1.5 text-[11px] outline-none"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
            >
              <option value="TELEGRAM">Telegram</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="VIBER">Viber</option>
              <option value="SIGNAL">Signal</option>
            </select>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <Send className="h-3 w-3" />
              {t("workspace.testLeadButton")}
            </button>
          </form>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1">
        <Link
          href={`/tenants/${tenant.slug}${selectedId ? `?conversation=${selectedId}` : ""}`}
          className="rounded-full px-4 py-2 text-sm font-bold transition"
          style={{
            backgroundColor: activeTab === "inbox" ? "var(--btn-fill)" : "var(--bg-panel)",
            color: activeTab === "inbox" ? "#ffffff" : "var(--text-muted)",
            boxShadow: activeTab === "inbox" ? "var(--shadow-sm)" : "none",
          }}
        >
          💬 {t("workspace.tabInbox")}
          <span className="ml-1.5 opacity-70">
            {tenant.conversations.filter((c) => c.status !== "CLOSED").length}
          </span>
        </Link>
        <Link
          href={`/tenants/${tenant.slug}?tab=orders${selectedId ? `&conversation=${selectedId}` : ""}`}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition"
          style={{
            backgroundColor: activeTab === "orders" ? "var(--btn-fill)" : "var(--bg-panel)",
            color: activeTab === "orders" ? "#ffffff" : "var(--text-muted)",
            boxShadow: activeTab === "orders" ? "var(--shadow-sm)" : "none",
          }}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          {t("workspace.tabOrders")}
          {newOrderCount > 0 ? (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: activeTab === "orders" ? "rgba(255,255,255,0.2)" : "#FEF3C7",
                color: activeTab === "orders" ? "#ffffff" : "#D97706",
              }}
            >
              {newOrderCount}
            </span>
          ) : null}
        </Link>
      </div>

      {/* ── Main: chat list + thread (BIGGEST area) ── */}
      <div className="grid flex-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* Col 1: Conversation/Orders list */}
        <section className="surface-panel min-h-[480px] rounded-[24px]">
          {activeTab === "inbox" ? (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              <div className="border-b px-5 py-3" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                  {t("workspace.conversationsHeader")}
                </p>
              </div>
              {tenant.conversations.map((conv) => {
                const ps = platformStyle(conv.provider);
                const Icon = ps.icon;
                const isSelected = selectedConversation?.id === conv.id;
                const lastMsg = conv.messages[conv.messages.length - 1];

                return (
                  <Link
                    key={conv.id}
                    href={`/tenants/${tenant.slug}?conversation=${conv.id}`}
                    className="block px-4 py-4 transition"
                    style={{
                      backgroundColor: isSelected ? "var(--accent-soft)" : "transparent",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: ps.bg }}
                      >
                        <Icon className="h-4 w-4" style={{ color: ps.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold" style={{ color: "var(--text)" }}>
                            {conv.contact.displayName}
                          </p>
                          <StatusIcon status={conv.status} />
                          <span className="ml-auto shrink-0 text-[11px]" style={{ color: "var(--text-faint)" }}>
                            {formatRelativeTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                            style={{ color: ps.color, backgroundColor: ps.bg }}
                          >
                            {titleizeToken(conv.provider)}
                          </span>
                        </div>
                        {lastMsg ? (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
                            {lastMsg.direction === "OUTBOUND" ? "↑ " : ""}
                            {lastMsg.content}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}

              {tenant.conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                  <MessageCircle className="h-8 w-8" style={{ color: "var(--text-faint)" }} />
                  <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>{t("workspace.emptyConversations")}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                    {t("workspace.emptyConversationsHint")}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              <div className="border-b px-5 py-3" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                  {t("workspace.ordersListHeader")}
                </p>
              </div>
              {orders.map((order) => {
                const statusInfo = orderStatusLabels[order.status] ?? { label: order.status, color: "#8b7f73" };
                const linkedConv = tenant.conversations.find((c) => c.id === order.conversationId);
                return (
                  <div key={order.id} className="px-4 py-4">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                            {order.contactName}
                          </p>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ color: statusInfo.color, backgroundColor: `${statusInfo.color}18` }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        {order.totalAmount ? (
                          <p className="mt-0.5 text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                            {order.totalAmount}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
                          {formatRelativeTime(order.createdAt)}
                          {linkedConv ? ` · ${linkedConv.contact.displayName}` : ""}
                        </p>
                      </div>
                      {linkedConv ? (
                        <Link
                          href={`/tenants/${tenant.slug}?conversation=${linkedConv.id}`}
                          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold hover:opacity-80"
                          style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                        >
                          →
                        </Link>
                      ) : null}
                    </div>
                    {order.status !== "COMPLETED" && order.status !== "CANCELLED" ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const)
                          .filter((s) => s !== order.status)
                          .map((s) => (
                            <form key={s} action={updateOrderStatus}>
                              <input type="hidden" name="tenantSlug" value={tenant.slug} />
                              <input type="hidden" name="orderId" value={order.id} />
                              <button
                                name="status"
                                value={s}
                                className="rounded-full border px-2.5 py-1 text-[10px] font-bold transition hover:opacity-80"
                                style={{
                                  borderColor: "var(--border)",
                                  backgroundColor: "var(--bg-panel)",
                                  color: orderStatusLabels[s]?.color,
                                }}
                              >
                                {orderStatusLabels[s]?.label}
                              </button>
                            </form>
                          ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                  <ShoppingBag className="h-8 w-8" style={{ color: "var(--text-faint)" }} />
                  <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>{t("workspace.emptyOrders")}</p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        {/* Col 2: Chat thread / Order create form */}
        <section className="surface-panel min-h-[480px] overflow-hidden rounded-[24px]">
          {activeTab === "inbox" && selectedConversation ? (
            <div className="chat-shell flex flex-col">
              {/* ── Compact header (single row) ── */}
              {(() => {
                const ps = platformStyle(selectedConversation.provider);
                const Icon = ps.icon;
                return (
                  <div
                    className="chat-header flex items-center gap-3 px-4 py-3 sm:px-5"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: ps.color }}
                    >
                      {selectedConversation.contact.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h2 className="truncate text-[15px] font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
                          {selectedConversation.contact.displayName}
                        </h2>
                        <Icon className="h-3 w-3 shrink-0" style={{ color: ps.color }} />
                      </div>
                      <p className="truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {titleizeToken(selectedConversation.provider)}
                        {selectedConversation.contact.username ? ` · ${selectedConversation.contact.username}` : ""}
                        {selectedConversation.status === "ESCALATED" ? t("workspace.escalationFlag") : ""}
                      </p>
                    </div>

                    {/* Compact AI mode switcher (icons only) */}
                    <div className="hidden sm:block">
                      <AiPresetSwitcher
                        tenantSlug={tenant.slug}
                        currentMode={tenant.aiMode}
                        collectOrders={!!tenantExt.aiCollectOrders}
                        size="compact"
                      />
                    </div>

                    <Link
                      href={`/tenants/${tenant.slug}?tab=orders&conversation=${selectedConversation.id}`}
                      className="hover-grow inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-[0.96]"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "var(--btn-fill-fg)",
                        boxShadow: "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)",
                      }}
                      title={t("workspace.chatOrderTitle")}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">{t("workspace.chatOrderShort")}</span>
                    </Link>
                  </div>
                );
              })()}

              {/* ── Messages — Telegram/WhatsApp-style bubbles ── */}
              <div
                className="chat-thread flex-1 overflow-y-auto px-3 py-4 sm:px-5"
                style={{
                  background:
                    "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 50%), var(--bg-muted)",
                }}
              >
                {(() => {
                  let lastDay = "";
                  return selectedConversation.messages.map((msg, idx) => {
                    const inbound = msg.direction === "INBOUND";
                    const internal = msg.direction === "INTERNAL";

                    // Day separator
                    const day = formatDay(msg.createdAt);
                    const showDay = day !== lastDay;
                    lastDay = day;

                    // Group consecutive messages from same sender (no avatar repeat)
                    const prev = selectedConversation.messages[idx - 1];
                    const sameSenderAsPrev = prev && prev.direction === msg.direction;

                    // Parse voice attachments
                    let voiceMeta: { url: string; durationSec: number; sizeBytes: number } | null = null;
                    if (msg.metadataJson) {
                      try {
                        const parsed = JSON.parse(msg.metadataJson) as {
                          voice?: { url: string; durationSec: number; sizeBytes: number };
                        };
                        if (parsed.voice?.url) voiceMeta = parsed.voice;
                      } catch {}
                    }
                    // Strip the locale-agnostic voice tag prefix "[🎤 ...]"
                    const visibleContent = voiceMeta
                      ? msg.content.replace(/^\[🎤[^\]]*\]\n?/m, "").trim()
                      : msg.content;

                    const time = new Date(msg.createdAt).toLocaleTimeString(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    if (internal) {
                      return (
                        <div key={msg.id} className="flex justify-center py-2">
                          <span
                            className="rounded-full px-3 py-1 text-[11px] italic"
                            style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-muted)" }}
                          >
                            {visibleContent}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id}>
                        {showDay ? (
                          <div className="flex justify-center py-3">
                            <span
                              className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] shadow-sm"
                              style={{
                                backgroundColor: "var(--bg-panel)",
                                borderColor: "var(--border)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {day}
                            </span>
                          </div>
                        ) : null}

                        <div
                          className={`group flex items-end gap-2 ${
                            inbound ? "justify-start" : "justify-end"
                          }`}
                          style={{ marginTop: sameSenderAsPrev ? 2 : 8 }}
                        >
                          {/* Avatar (inbound only, last in burst gets it) */}
                          {inbound ? (
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{
                                backgroundColor: platformStyle(selectedConversation.provider).color,
                                visibility: sameSenderAsPrev ? "hidden" : "visible",
                              }}
                            >
                              {selectedConversation.contact.displayName.slice(0, 1).toUpperCase()}
                            </div>
                          ) : null}

                          <div
                            className="chat-bubble max-w-[78%] sm:max-w-[68%]"
                            data-direction={inbound ? "in" : "out"}
                            style={
                              inbound
                                ? {
                                    borderTopLeftRadius: sameSenderAsPrev ? 18 : 6,
                                    borderTopRightRadius: 18,
                                    borderBottomLeftRadius: 18,
                                    borderBottomRightRadius: 18,
                                  }
                                : {
                                    borderTopLeftRadius: 18,
                                    borderTopRightRadius: sameSenderAsPrev ? 18 : 6,
                                    borderBottomLeftRadius: 18,
                                    borderBottomRightRadius: 18,
                                  }
                            }
                          >
                            {voiceMeta ? (
                              <div className="min-w-[220px] px-3 pt-2.5">
                                <VoicePlayer
                                  url={voiceMeta.url}
                                  durationSec={voiceMeta.durationSec}
                                  variant={inbound ? "inbound" : "outbound"}
                                />
                              </div>
                            ) : null}
                            {visibleContent ? (
                              <p className="whitespace-pre-line break-words px-3 pt-2 text-[14px] leading-[1.4]">
                                {visibleContent}
                              </p>
                            ) : null}
                            <div
                              className="flex items-center justify-end gap-1 px-3 pb-1.5 pt-0.5"
                              style={{
                                fontSize: 10,
                                opacity: inbound ? 0.55 : 0.85,
                              }}
                            >
                              <span>{time}</span>
                              {!inbound ? (
                                <svg width="14" height="10" viewBox="0 0 16 12" fill="none" aria-hidden="true">
                                  <path d="M1 6L4.5 9.5L10.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M5.5 6L9 9.5L15 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* ── Composer ── */}
              <div
                className="border-t px-3 py-3 sm:px-4"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-panel)" }}
              >
                <ChatComposer
                  tenantSlug={tenant.slug}
                  conversationId={selectedConversation.id}
                  providerLabel={titleizeToken(selectedConversation.provider)}
                  aiSuggestion={t("workspace.aiSuggestionDefault")}
                />
              </div>
            </div>
          ) : null}

          {/* Empty inbox state */}
          {activeTab === "inbox" && !selectedConversation ? (
            <div className="flex h-full min-h-[500px] flex-col items-center justify-center text-center">
              <MessageCircle className="h-12 w-12" style={{ color: "var(--text-faint)" }} />
              <p className="mt-4 text-base font-bold" style={{ color: "var(--text-muted)" }}>
                {t("workspace.selectConversation")}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                {t("workspace.selectConversationHint")}
              </p>
            </div>
          ) : null}

          {/* Orders create form */}
          {activeTab === "orders" ? (
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--accent-soft)" }}
                >
                  <ShoppingBag className="h-4 w-4" style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                    {t("workspace.newOrderEyebrow")}
                  </p>
                  <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                    {t("workspace.newOrderTitle")}
                  </h2>
                </div>
              </div>

              <form action={createOrder} className="mt-5 space-y-3">
                <input type="hidden" name="tenantSlug" value={tenant.slug} />

                <label className="block text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                  {t("workspace.orderConversationLabel")}
                  <select
                    name="conversationId"
                    defaultValue={selectedConversation?.id ?? ""}
                    className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)", textTransform: "none", letterSpacing: "0", fontWeight: "normal" }}
                  >
                    <option value="">{t("workspace.orderConversationChoose")}</option>
                    {tenant.conversations
                      .filter((c) => c.status !== "CLOSED")
                      .map((conv) => (
                        <option key={conv.id} value={conv.id}>
                          {conv.contact.displayName} · {titleizeToken(conv.provider)}
                        </option>
                      ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                    {t("workspace.orderContactNameLabel")}
                    <input
                      name="contactName"
                      defaultValue={selectedConversation?.contact.displayName ?? ""}
                      placeholder={t("workspace.orderContactNamePlaceholder")}
                      className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)", textTransform: "none", letterSpacing: "0", fontWeight: "normal" }}
                    />
                  </label>
                  <label className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                    {t("workspace.orderContactPhoneLabel")}
                    <input
                      name="contactPhone"
                      placeholder={t("workspace.orderContactPhonePlaceholder")}
                      className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)", textTransform: "none", letterSpacing: "0", fontWeight: "normal" }}
                    />
                  </label>
                </div>

                <label className="block text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                  {t("workspace.orderItemsLabel")}
                  <textarea
                    name="items"
                    rows={3}
                    placeholder={t("workspace.orderItemsPlaceholder")}
                    className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)", textTransform: "none", letterSpacing: "0", fontWeight: "normal" }}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                    {t("workspace.orderTotalLabel")}
                    <input
                      name="totalAmount"
                      placeholder={t("workspace.orderTotalPlaceholder")}
                      className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)", textTransform: "none", letterSpacing: "0", fontWeight: "normal" }}
                    />
                  </label>
                  <label className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                    {t("workspace.orderDeliveryLabel")}
                    <input
                      name="deliveryInfo"
                      placeholder={t("workspace.orderDeliveryPlaceholder")}
                      className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)", textTransform: "none", letterSpacing: "0", fontWeight: "normal" }}
                    />
                  </label>
                </div>

                <label className="block text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                  {t("workspace.orderNotesLabel")}
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder={t("workspace.orderNotesPlaceholder")}
                    className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)", textTransform: "none", letterSpacing: "0", fontWeight: "normal" }}
                  />
                </label>

                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {t("workspace.orderSubmitButton")}
                </button>
              </form>

              <div
                className="mt-5 rounded-2xl border p-4"
                style={{ borderColor: "rgba(124,58,237,0.2)", backgroundColor: "#F5F3FF" }}
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" style={{ color: "#7C3AED" }} />
                  <p className="text-xs font-bold" style={{ color: "#5b21b6" }}>
                    {t("workspace.autoOrdersTitle")}
                  </p>
                </div>
                <p className="mt-1.5 text-xs leading-5" style={{ color: "#7C3AED" }}>
                  {tenantExt.aiCollectOrders
                    ? t("workspace.autoOrdersOn")
                    : t("workspace.autoOrdersOff")}
                </p>
                <Link
                  href={`/tenants/${tenant.slug}/setup`}
                  className="mt-2 inline-block text-[11px] font-bold hover:underline"
                  style={{ color: "#7C3AED" }}
                >
                  {t("workspace.autoOrdersSettingsLink")}
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
