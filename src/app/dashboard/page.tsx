import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Plus,
  ShoppingBag,
  XCircle,
  Cable,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { formatRelativeTime, titleizeToken } from "@/lib/format";
import { getDashboardSnapshot } from "@/lib/inbox";
import { isPlatformOwner } from "@/lib/admin";
import { auth } from "@/auth";
import { getTranslations } from "@/lib/i18n/server";

function getPlatformDot(provider: string) {
  const colors: Record<string, string> = {
    INSTAGRAM: "#E1306C",
    WHATSAPP: "#128C7E",
    TELEGRAM: "#229ED9",
    MESSENGER: "#0084FF",
    WEBCHAT: "#8B4A31",
    VIBER: "#7360F2",
    SIGNAL: "#3A76F0",
  };
  return colors[provider] ?? "#8B7F73";
}

export default async function DashboardPage() {
  const session = await auth();
  if (session?.user?.id) {
    const { getUserProfile } = await import("@/lib/access-request-db");
    const profile = await getUserProfile(session.user.id);
    if (profile?.mustChangePassword) {
      const { redirect } = await import("next/navigation");
      redirect("/profile/setup");
    }
  }
  const [{ tenants, metrics, recentOrders }, t] = await Promise.all([
    getDashboardSnapshot(session?.user?.id),
    getTranslations(),
  ]);
  const featuredTenant = tenants[0];
  const showAdminLink = isPlatformOwner(session?.user?.email);

  // Time-of-day greeting — translation-driven
  const hour = new Date().getHours();
  const greetingText =
    hour < 12 ? t("dashboard.greetingMorning")
    : hour < 18 ? t("dashboard.greetingDay")
    : t("dashboard.greetingEvening");

  const orderStatusLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    NEW:         { label: t("dashboard.orderNew"),         icon: <Clock className="h-3.5 w-3.5" />,         color: "#D97706" },
    CONFIRMED:   { label: t("dashboard.orderConfirmed"),   icon: <CheckCircle2 className="h-3.5 w-3.5" />,  color: "#059669" },
    IN_PROGRESS: { label: t("dashboard.orderInProgress"),  icon: <ShoppingBag className="h-3.5 w-3.5" />,   color: "#229ED9" },
    COMPLETED:   { label: t("dashboard.orderCompleted"),   icon: <CheckCircle2 className="h-3.5 w-3.5" />,  color: "#6b7280" },
    CANCELLED:   { label: t("dashboard.orderCancelled"),   icon: <XCircle className="h-3.5 w-3.5" />,       color: "#DC2626" },
  };

  const slimMetrics = [
    { label: t("dashboard.metricWorkspaces"), value: metrics.tenants,            tone: "muted" },
    { label: t("dashboard.metricChannels"),   value: metrics.connectedChannels,  tone: "muted" },
    { label: t("dashboard.metricOpenChats"),  value: metrics.openConversations,  tone: "accent" },
    { label: t("dashboard.metricNewOrders"),  value: metrics.pendingOrders,      tone: metrics.pendingOrders > 0 ? "warn" : "muted" },
    { label: t("dashboard.metricOperators"),  value: metrics.teammates,          tone: "muted" },
  ];

  return (
    <main className="page-enter mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ── Header row ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {greetingText},{" "}
            <span className="font-bold" style={{ color: "var(--text)" }}>
              {session?.user?.name?.split(" ")[0]}
            </span>
          </p>
          <h1
            className="mt-1 text-2xl font-bold tracking-[-0.03em] sm:text-3xl"
            style={{ color: "var(--text)" }}
          >
            {t("dashboard.title")}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {showAdminLink ? (
            <Link
              href="/admin"
              className="hover-grow inline-flex w-fit items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition active:scale-[0.97]"
              style={{
                backgroundColor: "var(--bg-panel)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <ShieldCheck className="h-4 w-4" style={{ color: "var(--accent)" }} />
              {t("dashboard.adminPanel")}
            </Link>
          ) : null}
          <Link
            href="/dashboard/telegram-bot"
            className="hover-grow inline-flex w-fit items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-[0_2px_8px_rgba(34,158,217,0.35)] transition active:scale-[0.97] hover:opacity-90"
            style={{ backgroundColor: "#229ED9" }}
          >
            <Bot className="h-4 w-4" />
            {t("dashboard.deployTelegram")}
          </Link>
          <Link
            href="/onboarding"
            className="hover-grow inline-flex w-fit items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition active:scale-[0.97] hover:opacity-90"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--btn-fill-fg)",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)",
            }}
          >
            <Plus className="h-4 w-4" />
            {t("dashboard.newWorkspace")}
          </Link>
        </div>
      </div>

      {/* ── Slim metric strip (one line) ── */}
      <div
        className="surface-panel hover-grow flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[16px] px-5 py-3.5"
      >
        {slimMetrics.map((s, i) => {
          const color =
            s.tone === "warn"   ? "#D97706" :
            s.tone === "accent" ? "var(--accent)" :
            "var(--text)";
          return (
            <React.Fragment key={s.label}>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-[-0.03em]" style={{ color }}>
                  {s.value}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                  {s.label}
                </span>
              </div>
              {i < slimMetrics.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="hidden h-5 w-px sm:block"
                  style={{ backgroundColor: "var(--border)" }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        {/* Workspaces — clickable cards */}
        <section className="surface-panel rounded-[28px] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
              {t("dashboard.workspacesTitle")}
            </h2>
            {featuredTenant ? (
              <Link
                href={`/tenants/${featuredTenant.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
                style={{ color: "var(--accent)" }}
              >
                {t("dashboard.workspacesOpenInbox")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {tenants.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-[20px] border border-dashed py-14 text-center"
                style={{ borderColor: "var(--border)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {t("dashboard.workspacesEmpty")}
                </p>
                <Link
                  href="/onboarding"
                  className="hover-grow mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition active:scale-[0.97]"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--btn-fill-fg)",
                    boxShadow: "0 2px 10px color-mix(in srgb, var(--accent) 35%, transparent)",
                  }}
                >
                  <Plus className="h-4 w-4" />
                  {t("dashboard.workspacesCreateFirst")}
                </Link>
              </div>
            ) : (
              tenants.map((tenant) => {
                const openCount = tenant.conversations.filter((c) => c.status !== "CLOSED").length;
                const connectedChannels = tenant.channels.filter((c) => c.status === "CONNECTED");

                return (
                  <Link
                    key={tenant.id}
                    href={`/tenants/${tenant.slug}`}
                    className="hover-grow block rounded-[20px] border p-4 sm:p-5"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--bg-soft)",
                      cursor: "pointer",
                    }}
                  >
                    <article>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
                              {tenant.name}
                            </h3>
                            <StatusPill tone="warm" value={tenant.plan} />
                            <StatusPill
                              tone={tenant.aiEnabled ? "cool" : "neutral"}
                              value={tenant.aiMode}
                            />
                          </div>

                          {/* Channels */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            {connectedChannels.map((ch) => (
                              <span
                                key={ch.id}
                                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                                style={{
                                  color: getPlatformDot(ch.provider),
                                  backgroundColor: `${getPlatformDot(ch.provider)}18`,
                                }}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: getPlatformDot(ch.provider) }}
                                />
                                {titleizeToken(ch.provider)}
                              </span>
                            ))}
                            {tenant.channels.filter((c) => c.status !== "CONNECTED").length > 0 ? (
                              <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                                +{tenant.channels.filter((c) => c.status !== "CONNECTED").length}{" "}
                                {t("dashboard.channelsPendingSuffix")}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2 text-sm">
                          {[
                            { value: openCount, label: t("dashboard.statOpen") },
                            { value: tenant.memberships.length, label: t("dashboard.statOperators") },
                            { value: `${tenant.onboardingProgress.percent}%`, label: t("dashboard.statReady") },
                          ].map((stat) => (
                            <div
                              key={stat.label}
                              className="rounded-xl px-3 py-2.5 text-center"
                              style={{ backgroundColor: "var(--bg-panel)", boxShadow: "var(--shadow-sm)" }}
                            >
                              <p className="text-xl font-bold" style={{ color: "var(--text)" }}>
                                {stat.value}
                              </p>
                              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-faint)" }}>
                                {stat.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div
                        className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                          <Cable className="h-3.5 w-3.5" />
                          {tenant.conversations[0]
                            ? t("dashboard.lastActivity", { time: formatRelativeTime(tenant.conversations[0].lastMessageAt) })
                            : t("dashboard.noConversations")}
                        </div>
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
                          style={{ color: "var(--accent)" }}
                        >
                          {t("dashboard.clickToOpen")}
                        </span>
                      </div>
                    </article>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick actions for the workspace owner */}
          <section className="surface-panel rounded-[28px] p-5">
            <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {t("dashboard.quickActionsTitle")}
            </h3>
            <div className="mt-3 space-y-2">
              {featuredTenant ? (
                <>
                  <Link
                    href={`/tenants/${featuredTenant.slug}?tab=orders`}
                    className="hover-grow flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98]"
                    style={{ backgroundColor: "var(--bg-soft)", color: "var(--text-secondary)" }}
                  >
                    <span className="truncate">{t("dashboard.ordersFor", { name: featuredTenant.name })}</span>
                    <ShoppingBag className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                  </Link>
                  <Link
                    href={`/tenants/${featuredTenant.slug}/setup`}
                    className="hover-grow flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98]"
                    style={{ backgroundColor: "var(--bg-soft)", color: "var(--text-secondary)" }}
                  >
                    {t("dashboard.channelsAndAi")}
                    <Settings2 className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                  </Link>
                  <Link
                    href="/dashboard/telegram-bot"
                    className="hover-grow flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98]"
                    style={{ backgroundColor: "var(--bg-soft)", color: "var(--text-secondary)" }}
                  >
                    {t("dashboard.ownerTelegramBot")}
                    <Bot className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                  </Link>
                </>
              ) : (
                <Link
                  href="/onboarding"
                  className="hover-grow flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98]"
                  style={{ backgroundColor: "var(--bg-soft)", color: "var(--text-secondary)" }}
                >
                  {t("dashboard.workspacesCreateFirst")}
                  <Plus className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                </Link>
              )}
            </div>
          </section>

          {/* Recent orders */}
          {recentOrders.length > 0 ? (
            <section className="surface-panel rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" style={{ color: "var(--accent)" }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  {t("dashboard.recentOrdersTitle")}
                </h3>
              </div>
              <div className="mt-3 space-y-2">
                {recentOrders.slice(0, 5).map((order) => {
                  const orderTenant = tenants.find((t) => t.id === order.tenantId);
                  const statusInfo = orderStatusLabels[order.status] ?? {
                    label: order.status, icon: null, color: "#8b7f73",
                  };
                  return (
                    <div
                      key={order.id}
                      className="hover-grow flex items-center gap-2 rounded-xl px-3 py-2.5"
                      style={{ backgroundColor: "var(--bg-soft)" }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold" style={{ color: "var(--text)" }}>
                          {order.contactName}
                        </p>
                        {orderTenant ? (
                          <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                            {orderTenant.name}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ color: statusInfo.color, backgroundColor: `${statusInfo.color}18` }}
                      >
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                      {orderTenant ? (
                        <Link
                          href={`/tenants/${orderTenant.slug}?tab=orders`}
                          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold hover:opacity-80"
                          style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                        >
                          →
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

        </div>
      </div>
    </main>
  );
}
