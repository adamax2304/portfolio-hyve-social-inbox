import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Camera,
  CheckCircle2,
  ExternalLink,
  Globe,
  KeyRound,
  MessageCircle,
  Phone,
  Plus,
  Send,
  Settings2,
  Sparkles,
  UserRound,
  Users,
  WandSparkles,
  Cable,
  Server,
} from "lucide-react";
import {
  addWorkspaceMember,
  completeOnboarding,
  requestManagedAi,
  saveCustomLlmConfig,
  saveWorkspaceSecret,
  toggleChannel,
  updateAiSettings,
} from "@/app/actions";
import { StatusPill } from "@/components/status-pill";
import { AddChannelMenu } from "@/components/add-channel-menu";
import { ApiInstructions } from "@/components/api-instructions";
import { titleizeToken } from "@/lib/format";
import { getTenantWorkspace } from "@/lib/inbox";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";

type Props = {
  params: Promise<{ slug: string }>;
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

export default async function TenantSetupPage({ params }: Props) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, tenant: { slug } },
  });
  if (!membership) redirect("/dashboard");

  const workspace = await getTenantWorkspace(slug);
  if (!workspace) notFound();

  const { tenant } = workspace;

  const canAdmin =
    membership.role === "OWNER" || membership.role === "ADMIN";

  const tenantExt = tenant as unknown as {
    aiCollectOrders?: boolean;
    aiManagerInstructions?: string;
    aiUseManaged?: boolean;
    aiManagedRequested?: boolean;
    aiCustomBaseUrl?: string;
    aiCustomModel?: string;
    aiCustomKeyMasked?: string;
    onboardingComplete?: boolean;
  };

  const t = await getTranslations();
  const progress = tenant.onboardingProgress;
  const isReady = progress.percent >= 100 || progress.completed === progress.total;

  return (
    <main className="page-enter mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium hover:underline"
            style={{ color: "var(--text-faint)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("setup.backLink")}
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--accent-soft)" }}
            >
              <Settings2 className="h-5 w-5" style={{ color: "var(--accent)" }} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                {t("setup.eyebrow")}
              </p>
              <h1 className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl" style={{ color: "var(--text)" }}>
                {tenant.name}
              </h1>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="warm" value={tenant.plan} />
          <StatusPill tone={tenant.aiEnabled ? "cool" : "neutral"} value={tenant.aiMode} />
          <Link
            href={`/tenants/${tenant.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--btn-fill)" }}
          >
            {t("setup.openInbox")}
          </Link>
        </div>
      </div>

      {/* Progress + Save@100% */}
      <section className="surface-panel rounded-[28px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
              {t("setup.progressEyebrow")}
            </p>
            <h2 className="mt-1 text-lg font-bold" style={{ color: "var(--text)" }}>
              {t("setup.progressTitle", { completed: progress.completed, total: progress.total, percent: progress.percent })}
            </h2>
          </div>
          {canAdmin && isReady ? (
            <form action={completeOnboarding}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(22,163,74,0.35)] transition hover:opacity-90"
                style={{ backgroundColor: "#16a34a" }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {tenantExt.onboardingComplete ? t("setup.saved") : t("setup.saveAndFinish")}
              </button>
            </form>
          ) : (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("setup.finishHint")}
            </span>
          )}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: "var(--bg-muted)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress.percent}%`, backgroundColor: "var(--accent)" }}
          />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tenant.parsedChecklist.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: item.done ? "#22c55e" : "transparent",
                  border: item.done ? "none" : "2px solid var(--border-strong)",
                }}
              >
                {item.done ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : null}
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Main layout: setup steps (LEFT) + API instructions sidebar (RIGHT) ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Setup sections (2-col grid inside) ── */}
        <div className="grid gap-6 lg:grid-cols-2">
        {/* Channels — BIG card */}
        <section id="telegram" className="surface-panel rounded-[28px] p-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--accent-soft)" }}
            >
              <Cable className="h-5 w-5" style={{ color: "var(--accent)" }} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                {t("setup.step1Eyebrow")}
              </p>
              <h2 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                {t("setup.step1Title")}
              </h2>
            </div>
            {canAdmin ? (
              <div className="ml-auto">
                <AddChannelMenu
                  tenantSlug={tenant.slug}
                  existingProviders={tenant.channels.map((c) => c.provider)}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            {tenant.channels.map((ch) => {
              const ps = platformStyle(ch.provider);
              const Icon = ps.icon;
              const enabled = (ch as unknown as { enabled?: boolean }).enabled !== false;
              const botUsername = ch.destinationHint?.replace("@", "");
              return (
                <div
                  key={ch.id}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: ps.bg }}
                    >
                      <Icon className="h-5 w-5" style={{ color: ps.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
                        {titleizeToken(ch.provider)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {ch.destinationHint ?? ch.label} · {ch.authMode ?? "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          color:
                            ch.status === "CONNECTED" ? "#16a34a" :
                            ch.status === "ERROR" ? "#dc2626" : "#d97706",
                          backgroundColor:
                            ch.status === "CONNECTED" ? "#dcfce7" :
                            ch.status === "ERROR" ? "#fef2f2" : "#fef3c7",
                        }}
                      >
                        {ch.status === "CONNECTED" ? t("setup.channelActive") : ch.status === "ERROR" ? t("setup.channelError") : t("setup.channelWaiting")}
                      </span>
                      {canAdmin ? (
                        <form action={toggleChannel}>
                          <input type="hidden" name="tenantSlug" value={tenant.slug} />
                          <input type="hidden" name="channelId" value={ch.id} />
                          <input type="hidden" name="enable" value={enabled ? "false" : "true"} />
                          <button
                            type="submit"
                            className="switch-track"
                            data-on={enabled}
                            aria-label={enabled ? t("setup.channelDisable") : t("setup.channelEnable")}
                          />
                        </form>
                      ) : null}
                    </div>
                  </div>

                  {ch.provider === "TELEGRAM" && botUsername ? (
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:bg-[#DBEAFE]"
                      style={{ borderColor: "rgba(34,158,217,0.3)", backgroundColor: "#EFF9FF", color: "#1a86c0" }}
                    >
                      <Send className="h-3 w-3" />
                      {t("setup.openInTelegram")}
                      <ExternalLink className="ml-auto h-2.5 w-2.5 opacity-60" />
                    </a>
                  ) : null}

                  {ch.provider === "TELEGRAM" && !botUsername ? (
                    <p
                      className="mt-3 rounded-xl border-l-2 border-[#229ED9] px-3 py-2 text-xs leading-5"
                      style={{ backgroundColor: "#EFF9FF", color: "#1a86c0" }}
                    >
                      {t("setup.telegramTokenHint")}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* AI Manager — BIG card */}
        <section className="surface-panel rounded-[28px] p-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F5F3FF" }}
            >
              <Bot className="h-5 w-5" style={{ color: "#7C3AED" }} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                {t("setup.step2Eyebrow")}
              </p>
              <h2 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                {t("setup.step2Title")}
              </h2>
            </div>
          </div>

          {/* Save instructions */}
          {canAdmin ? (
            <form action={updateAiSettings} className="mt-5 space-y-3">
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <label
                className="flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}
              >
                <input
                  type="checkbox"
                  name="aiCollectOrders"
                  defaultChecked={!!tenantExt.aiCollectOrders}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    {t("setup.autoOrdersLabel")}
                  </p>
                  <p className="text-xs leading-5" style={{ color: "var(--text-muted)" }}>
                    {t("setup.autoOrdersDesc")}
                  </p>
                </div>
              </label>

              <label className="block text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                {t("setup.aiInstructionsLabel")}
                <textarea
                  name="aiManagerInstructions"
                  rows={5}
                  defaultValue={tenantExt.aiManagerInstructions ?? ""}
                  placeholder={t("setup.aiInstructionsPlaceholder")}
                  className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm leading-relaxed outline-none focus:border-[var(--accent)]"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text)",
                    fontFamily: "inherit",
                    textTransform: "none",
                    letterSpacing: "0",
                  }}
                />
              </label>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: "var(--btn-fill)" }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("setup.saveInstructions")}
              </button>
            </form>
          ) : null}
        </section>
      </div>

      {/* ── LLM connection ── */}
      <section className="surface-panel rounded-[28px] p-6">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: "#F5F3FF" }}
          >
            <Server className="h-5 w-5" style={{ color: "#7C3AED" }} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
              {t("setup.step3Eyebrow")}
            </p>
            <h2 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
              {t("setup.step3Title")}
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          {t("setup.llmIntro")}
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Own LLM */}
          <div
            className={`rounded-2xl border p-5 ${!tenantExt.aiUseManaged ? "ring-2" : ""}`}
            style={{
              borderColor: !tenantExt.aiUseManaged ? "#7C3AED" : "var(--border)",
              backgroundColor: "var(--bg-soft)",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                style={{ backgroundColor: "#F5F3FF", color: "#7C3AED" }}
              >
                {t("setup.ownApiBadge")}
              </span>
              {!tenantExt.aiUseManaged ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}
                >
                  {t("setup.activeBadge")}
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-lg font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
              {t("setup.ownApiTitle")}
            </h3>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
              {t("setup.ownApiText")}
            </p>

            {canAdmin ? (
              <form action={saveCustomLlmConfig} className="mt-4 space-y-2.5">
                <input type="hidden" name="tenantSlug" value={tenant.slug} />
                <input
                  name="baseUrl"
                  defaultValue={tenantExt.aiCustomBaseUrl ?? ""}
                  placeholder={t("setup.ownApiBaseUrl")}
                  className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
                />
                <input
                  name="model"
                  defaultValue={tenantExt.aiCustomModel ?? ""}
                  placeholder={t("setup.ownApiModel")}
                  className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
                />
                <input
                  name="apiKey"
                  type="password"
                  placeholder={tenantExt.aiCustomKeyMasked ? t("setup.ownApiKeySaved", { mask: tenantExt.aiCustomKeyMasked }) : t("setup.ownApiKeyPlaceholder")}
                  className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
                />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "#7C3AED" }}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {t("setup.saveConfig")}
                </button>
              </form>
            ) : null}
          </div>

          {/* Managed AI */}
          <div
            className={`rounded-2xl border p-5 ${tenantExt.aiUseManaged ? "ring-2" : ""}`}
            style={{
              borderColor: tenantExt.aiUseManaged ? "var(--accent)" : "var(--border)",
              backgroundColor: "var(--bg-soft)",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
              >
                {t("setup.managedBadge")}
              </span>
              {tenantExt.aiManagedRequested ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{ backgroundColor: "#fef3c7", color: "#d97706" }}
                >
                  {t("setup.managedRequestedBadge")}
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-lg font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
              {t("setup.managedTitle")}
            </h3>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
              {t("setup.managedText")}
            </p>

            {canAdmin && !tenantExt.aiManagedRequested ? (
              <form action={requestManagedAi} className="mt-4">
                <input type="hidden" name="tenantSlug" value={tenant.slug} />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  <Send className="h-3.5 w-3.5" />
                  {t("setup.managedSubmit")}
                </button>
              </form>
            ) : null}

            {tenantExt.aiManagedRequested ? (
              <div
                className="mt-4 rounded-xl px-3 py-2.5 text-xs leading-5"
                style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
              >
                {t("setup.managedAccepted")}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Team + Vault BIG cards ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team */}
        <section className="surface-panel rounded-[28px] p-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--accent-soft)" }}
            >
              <Users className="h-5 w-5" style={{ color: "var(--accent)" }} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                {t("setup.step4Eyebrow")}
              </p>
              <h2 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                {t("setup.step4Title")}
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {tenant.memberships.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  {m.user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {m.user.name}
                  </p>
                  <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                    {m.user.email}
                  </p>
                </div>
                <StatusPill tone="cool" value={m.role} />
              </div>
            ))}
          </div>

          {canAdmin ? (
            <form
              action={addWorkspaceMember}
              className="mt-4 rounded-2xl border p-4"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}
            >
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <p className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                {t("setup.addOperatorTitle")}
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <input
                  name="name"
                  placeholder={t("setup.addOperatorNamePlaceholder")}
                  className="rounded-xl border px-3 py-2 text-xs outline-none"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
                />
                <input
                  name="email"
                  type="email"
                  placeholder={t("setup.addOperatorEmailPlaceholder")}
                  required
                  className="rounded-xl border px-3 py-2 text-xs outline-none"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
                />
              </div>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                <select
                  name="role"
                  defaultValue="AGENT"
                  className="rounded-xl border px-3 py-2 text-xs outline-none"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="AGENT">Agent</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <input
                  name="telegramHandle"
                  placeholder={t("setup.addOperatorTgPlaceholder")}
                  className="rounded-xl border px-3 py-2 text-xs outline-none"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
                />
              </div>
              <button
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: "var(--btn-fill)" }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("setup.addToTeam")}
              </button>
            </form>
          ) : null}
        </section>

        {/* Vault */}
        <section className="surface-panel rounded-[28px] p-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#FEF2F2" }}
            >
              <KeyRound className="h-5 w-5" style={{ color: "#DC2626" }} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                {t("setup.step5Eyebrow")}
              </p>
              <h2 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                {t("setup.step5Title")}
              </h2>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
            {t("setup.vaultIntro")}
          </p>

          <div className="mt-4 space-y-2">
            {tenant.secrets.map((s) => {
              const ps = platformStyle(s.provider);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3"
                  style={{ backgroundColor: "var(--bg-soft)" }}
                >
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ps.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold" style={{ color: "var(--text)" }}>
                      {s.label}
                    </p>
                    <p className="font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
                      {s.maskedValue}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ color: ps.color, backgroundColor: ps.bg }}
                  >
                    {titleizeToken(s.secretKind)}
                  </span>
                </div>
              );
            })}
          </div>

          {canAdmin ? (
            <form
              action={saveWorkspaceSecret}
              className="mt-4 rounded-2xl border p-4"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}
            >
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <p className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                {t("setup.addKeyTitle")}
              </p>
              <select
                name="channelConnectionId"
                className="mt-3 w-full rounded-xl border px-3 py-2 text-xs outline-none"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
              >
                {tenant.channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {titleizeToken(ch.provider)} — {ch.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                <select
                  name="secretKind"
                  defaultValue="BOT_TOKEN"
                  className="rounded-xl border px-3 py-2 text-xs outline-none"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
                >
                  <option value="BOT_TOKEN">Bot token</option>
                  <option value="ACCESS_TOKEN">Access token</option>
                  <option value="WEBHOOK_SECRET">Webhook secret</option>
                  <option value="VERIFY_TOKEN">Verify token</option>
                  <option value="API_KEY">API key</option>
                </select>
                <input
                  name="label"
                  placeholder={t("setup.keyLabelPlaceholder")}
                  defaultValue={t("setup.keyDefaultLabel")}
                  className="rounded-xl border px-3 py-2 text-xs outline-none"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
                />
              </div>
              <input
                name="rawSecret"
                type="password"
                placeholder={t("setup.keyPlaceholder")}
                className="mt-2 w-full rounded-xl border px-3 py-2 text-xs outline-none"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
              />
              <button
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: "var(--btn-fill)" }}
              >
                <KeyRound className="h-3.5 w-3.5" />
                {t("setup.saveEncrypted")}
              </button>
            </form>
          ) : null}
        </section>
        </div>

        {/* ── Right sidebar: API instructions (sticky on xl screens) ── */}
        <aside className="xl:sticky xl:top-20 xl:self-start">
          <ApiInstructions />
        </aside>
      </div>
    </main>
  );
}
