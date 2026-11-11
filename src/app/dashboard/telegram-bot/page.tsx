import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ExternalLink,
  Info,
  KeyRound,
  Send,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { connectOperatorBot, sendOperatorBotTest, syncOperatorBot } from "@/app/actions";
import { getTranslations } from "@/lib/i18n/server";
import { OperatorBotAutoSync } from "./auto-sync";

type Props = {
  searchParams: Promise<{ tenant?: string }>;
};

type InstructionStep = {
  n: string;
  title: string;
  desc: string;
  link?: string;
  linkText?: string;
};

export default async function TelegramBotPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const { tenant: selectedSlug } = await searchParams;
  const t = await getTranslations();

  const instructions: InstructionStep[] = [
    { n: "01", title: t("tgBot.step01Title"), desc: t("tgBot.step01Desc"), link: "https://t.me/BotFather", linkText: t("tgBot.step01Link") },
    { n: "02", title: t("tgBot.step02Title"), desc: t("tgBot.step02Desc") },
    { n: "03", title: t("tgBot.step03Title"), desc: t("tgBot.step03Desc") },
    { n: "04", title: t("tgBot.step04Title"), desc: t("tgBot.step04Desc") },
  ];

  const memberships = await prisma.tenantMembership.findMany({
    where: {
      userId: session.user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: {
      tenant: { include: { operatorBot: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (memberships.length === 0) {
    return (
      <main className="page-enter mx-auto flex w-full max-w-[800px] flex-col gap-6 px-5 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
          style={{ color: "var(--text-faint)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("tgBot.backLink")}
        </Link>
        <div className="surface-panel rounded-[24px] p-10 text-center">
          <p style={{ color: "var(--text)" }}>
            {t("tgBot.needWorkspace")}
          </p>
        </div>
      </main>
    );
  }

  const active =
    memberships.find((m) => m.tenant.slug === selectedSlug) ?? memberships[0];
  const tenant = active.tenant;
  const bot = tenant.operatorBot;

  return (
    <main className="page-enter mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
        style={{ color: "var(--text-faint)" }}
      >
        <ArrowLeft className="h-4 w-4" />
        {t("tgBot.backLink")}
      </Link>

      {/* Hero */}
      <section
        className="rounded-[28px] px-7 py-9 sm:px-10"
        style={{ backgroundColor: "#229ED9", color: "#ffffff" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.75)" }}>
              {t("tgBot.heroEyebrow")}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              {t("tgBot.heroTitle")}
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
          {t("tgBot.heroText")}
        </p>
      </section>

      {/* Workspace selector */}
      {memberships.length > 1 ? (
        <div className="surface-panel rounded-[20px] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
            {t("tgBot.workspaceSelector")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {memberships.map((m) => (
              <Link
                key={m.tenant.slug}
                href={`/dashboard/telegram-bot?tenant=${m.tenant.slug}`}
                className="rounded-full border px-4 py-1.5 text-xs font-bold transition"
                style={{
                  borderColor: m.tenant.slug === tenant.slug ? "#229ED9" : "var(--border)",
                  backgroundColor: m.tenant.slug === tenant.slug ? "#DBEAFE" : "var(--bg-panel)",
                  color: m.tenant.slug === tenant.slug ? "#1a86c0" : "var(--text-secondary)",
                }}
              >
                {m.tenant.name}
                {m.tenant.operatorBot ? " · ✓" : ""}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Auto-sync runner (replaces missing webhook on localhost) */}
      {bot ? <OperatorBotAutoSync tenantSlug={tenant.slug} /> : null}

      {/* Status card if connected */}
      {bot ? (
        <section className="surface-panel hover-grow rounded-[24px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: bot.status === "CONNECTED" ? "#dcfce7" : "#fef3c7" }}
              >
                {bot.status === "CONNECTED" ? (
                  <CheckCircle2 className="h-6 w-6" style={{ color: "#16a34a" }} />
                ) : (
                  <AlertTriangle className="h-6 w-6" style={{ color: "#d97706" }} />
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                  {tenant.name} · {bot.status}
                </p>
                <h2 className="text-xl font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                  {bot.botName ?? t("tgBot.statusFallback")}
                  {bot.botUsername ? ` · @${bot.botUsername}` : ""}
                </h2>
                <p className="mt-1 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                  {t("tgBot.tokenLabel", { mask: bot.tokenMasked })}
                </p>
              </div>
            </div>
            {bot.botUsername ? (
              <a
                href={`https://t.me/${bot.botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#229ED9" }}
              >
                <Send className="h-3.5 w-3.5" />
                {t("tgBot.openBot")}
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            ) : null}
          </div>

          {bot.lastError ? (
            <div
              className="mt-4 rounded-xl border-l-4 p-3 text-xs leading-5"
              style={{
                backgroundColor: "#fef3c7",
                borderColor: "#d97706",
                color: "#92400e",
              }}
            >
              <strong>{t("tgBot.note")}</strong> {bot.lastError}
            </div>
          ) : null}

          {/* Manual sync (for localhost without webhook) */}
          <form
            action={syncOperatorBot}
            className="mt-4 rounded-2xl border p-4"
            style={{ borderColor: "rgba(124,58,237,0.2)", backgroundColor: "color-mix(in srgb, #7C3AED 6%, var(--bg-panel))" }}
          >
            <input type="hidden" name="tenantSlug" value={tenant.slug} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "#7C3AED" }}>
                  {t("tgBot.syncBoxTitle")}
                </p>
                <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
                  {t("tgBot.syncBoxText")}
                </p>
              </div>
              <button
                type="submit"
                className="hover-grow shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#7C3AED" }}
              >
                <Sparkles className="h-3 w-3" />
                {t("tgBot.syncButton")}
              </button>
            </div>
          </form>

          {/* Test message */}
          <form action={sendOperatorBotTest} className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}>
            <input type="hidden" name="tenantSlug" value={tenant.slug} />
            <p className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
              {t("tgBot.testBoxTitle")}
            </p>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
              {t("tgBot.testBoxText")}{" "}
              <a className="underline" target="_blank" rel="noopener" href={`https://api.telegram.org/bot${bot.tokenMasked}/getUpdates`}>getUpdates</a>
            </p>
            <div className="mt-3 flex gap-2">
              <input
                name="chatId"
                placeholder={t("tgBot.chatIdPlaceholder")}
                className="flex-1 rounded-xl border px-3 py-2 text-xs outline-none"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#229ED9" }}
              >
                <Sparkles className="h-3 w-3" />
                {t("tgBot.sendButton")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* Main grid: instructions + connect */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Instructions */}
        <section className="surface-panel rounded-[28px] p-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#DBEAFE" }}
            >
              <Info className="h-5 w-5" style={{ color: "#229ED9" }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                {t("tgBot.stepsEyebrow")}
              </p>
              <h2 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                {t("tgBot.stepsTitle")}
              </h2>
            </div>
          </div>

          <ol className="mt-5 space-y-4">
            {instructions.map((s) => (
              <li
                key={s.n}
                className="hover-grow rounded-2xl p-4"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: "#DBEAFE", color: "#1a86c0" }}
                  >
                    {s.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
                      {s.title}
                    </p>
                    <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
                      {s.desc}
                    </p>
                    {s.link ? (
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold hover:underline"
                        style={{ color: "#229ED9" }}
                      >
                        {s.linkText ?? s.link}
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div
            className="mt-5 rounded-xl border-l-4 p-3 text-xs leading-5"
            style={{
              backgroundColor: "#dbeafe",
              borderColor: "#229ED9",
              color: "#1e40af",
            }}
          >
            <strong>{t("tgBot.afterConnectStrong")}</strong> {t("tgBot.afterConnectText")}
          </div>
        </section>

        {/* Connect form */}
        <section className="surface-panel rounded-[28px] p-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--accent-soft)" }}
            >
              <KeyRound className="h-5 w-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                {t("tgBot.connectEyebrow")}
              </p>
              <h2 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                {bot ? t("tgBot.connectTitleRebind") : t("tgBot.connectTitleNew")}
              </h2>
            </div>
          </div>

          <form action={connectOperatorBot} className="mt-5 space-y-3">
            <input type="hidden" name="tenantSlug" value={tenant.slug} />

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                {t("tgBot.workspaceLabel")}
              </label>
              <div
                className="mt-1.5 rounded-xl px-4 py-3 text-sm font-semibold"
                style={{ backgroundColor: "var(--bg-soft)", color: "var(--text)" }}
              >
                {tenant.name}
                <span className="ml-2 font-mono text-xs" style={{ color: "var(--text-faint)" }}>
                  ID: {tenant.id.slice(0, 12)}…
                </span>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                {t("tgBot.apiTokenLabel")}
              </span>
              <input
                name="token"
                required
                placeholder={t("tgBot.apiTokenPlaceholder")}
                className="mt-1.5 w-full rounded-xl border px-4 py-3 font-mono text-sm outline-none focus:border-[#229ED9]"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
              />
              <p className="mt-1.5 text-[11px] leading-4" style={{ color: "var(--text-faint)" }}>
                {t("tgBot.apiTokenHint")}
              </p>
            </label>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(34,158,217,0.35)] transition hover:opacity-90"
              style={{ backgroundColor: "#229ED9" }}
            >
              <Bot className="h-4 w-4" />
              {bot ? t("tgBot.submitRebind") : t("tgBot.submitNew")}
            </button>
          </form>

          {/* What auto-configures */}
          <div className="mt-5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
              {t("tgBot.autoConfigTitle")}
            </p>
            {[
              t("tgBot.autoConfig1"),
              t("tgBot.autoConfig2"),
              t("tgBot.autoConfig3"),
              t("tgBot.autoConfig4"),
              t("tgBot.autoConfig5"),
            ].map((line) => (
              <div key={line} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{line}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
