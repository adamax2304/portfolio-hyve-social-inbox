import Link from "next/link";
import {
  ArrowLeft,
  Rocket,
  ShieldCheck,
  MessageSquareMore,
  Users,
  WandSparkles,
  Send,
  Zap,
  CheckCircle2,
  Camera,
  Phone,
  Globe,
  MessageCircle,
  Bot,
} from "lucide-react";
import { createWorkspace } from "@/app/actions";
import { auth } from "@/auth";
import { FormDraftPersistor } from "@/components/form-draft-persistor";
import { HelpTip } from "@/components/help-tip";
import { ManagedSetupCard } from "@/components/managed-setup-card";
import { getActiveManagedSetupRequest } from "@/lib/managed-setup-db";
import { businessTypes, timezones } from "@/lib/dropdowns";
import { getTranslations } from "@/lib/i18n/server";
import { LlmSection } from "./llm-section";

export default async function OnboardingPage() {
  const session = await auth();
  const activeManagedSetup = session?.user?.id
    ? await getActiveManagedSetupRequest(session.user.id).catch(() => null)
    : null;
  const t = await getTranslations();

  // Steps (translated)
  const steps = [
    { n: "01", title: t("onboarding.step1Title"), desc: t("onboarding.step1Desc") },
    { n: "02", title: t("onboarding.step2Title"), desc: t("onboarding.step2Desc") },
    { n: "03", title: t("onboarding.step3Title"), desc: t("onboarding.step3Desc") },
  ];

  // Channels with translated help-tips. Product names and auth labels
  // stay in English — they're technical terms users will see in vendor
  // docs anyway and don't translate cleanly.
  const channels = [
    {
      value: "INSTAGRAM", icon: Camera, name: "Instagram DM", color: "#E1306C", bg: "#FEE2EE", auth: "OAuth Login",
      help: { title: "Instagram DM", steps: [t("onboarding.chInstagramHelp1"), t("onboarding.chInstagramHelp2"), t("onboarding.chInstagramHelp3"), t("onboarding.chInstagramHelp4")], link: { href: "https://business.facebook.com", label: t("onboarding.chInstagramLink") } },
    },
    {
      value: "WHATSAPP", icon: Phone, name: "WhatsApp Business", color: "#128C7E", bg: "#D1FAE5", auth: "Embedded Signup",
      help: { title: "WhatsApp Business API", steps: [t("onboarding.chWhatsappHelp1"), t("onboarding.chWhatsappHelp2"), t("onboarding.chWhatsappHelp3"), t("onboarding.chWhatsappHelp4")], link: { href: "https://developers.facebook.com/apps", label: t("onboarding.chWhatsappLink") } },
    },
    {
      value: "TELEGRAM", icon: Send, name: "Telegram Bot", color: "#229ED9", bg: "#DBEAFE", auth: "Bot Token",
      help: { title: "Telegram Bot Token", steps: [t("onboarding.chTelegramHelp1"), t("onboarding.chTelegramHelp2"), t("onboarding.chTelegramHelp3"), t("onboarding.chTelegramHelp4")], link: { href: "https://t.me/BotFather", label: t("onboarding.chTelegramLink") } },
    },
    {
      value: "MESSENGER", icon: MessageCircle, name: "Facebook Messenger", color: "#0084FF", bg: "#EFF6FF", auth: "FB Login",
      help: { title: "Facebook Messenger", steps: [t("onboarding.chMessengerHelp1"), t("onboarding.chMessengerHelp2"), t("onboarding.chMessengerHelp3"), t("onboarding.chMessengerHelp4")], link: { href: "https://developers.facebook.com", label: t("onboarding.chMessengerLink") } },
    },
    {
      value: "VIBER", icon: MessageCircle, name: "Viber Business", color: "#7360F2", bg: "#EEE8FF", auth: "Bot Token",
      help: { title: "Viber Bot Token", steps: [t("onboarding.chViberHelp1"), t("onboarding.chViberHelp2"), t("onboarding.chViberHelp3"), t("onboarding.chViberHelp4")], link: { href: "https://partners.viber.com", label: t("onboarding.chViberLink") } },
    },
    {
      value: "SIGNAL", icon: MessageCircle, name: "Signal Messenger", color: "#3A76F0", bg: "#EBF2FF", auth: "API Key",
      help: { title: "Signal API", steps: [t("onboarding.chSignalHelp1"), t("onboarding.chSignalHelp2"), t("onboarding.chSignalHelp3"), t("onboarding.chSignalHelp4")], link: { href: "https://github.com/bbernhard/signal-cli-rest-api", label: t("onboarding.chSignalLink") } },
    },
    {
      value: "WEBCHAT", icon: Globe, name: "Web Chat", color: "#8B4A31", bg: "#FEF3C7", auth: "JS embed",
      help: { title: t("onboarding.chWebchatTitle"), steps: [t("onboarding.chWebchatHelp1"), t("onboarding.chWebchatHelp2"), t("onboarding.chWebchatHelp3"), t("onboarding.chWebchatHelp4")] },
    },
  ];

  const included = [
    { icon: MessageSquareMore, label: t("onboarding.included1") },
    { icon: Users,             label: t("onboarding.included2") },
    { icon: WandSparkles,      label: t("onboarding.included3") },
    { icon: ShieldCheck,       label: t("onboarding.included4") },
    { icon: Send,              label: t("onboarding.included5") },
    { icon: Zap,               label: t("onboarding.included6") },
  ];

  return (
    <main className="page-enter mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
        style={{ color: "var(--text-faint)" }}
      >
        <ArrowLeft className="h-4 w-4" />
        {t("onboarding.backLink")}
      </Link>

      <section className="hero-strip rounded-[32px] px-8 py-12 sm:px-12">
        <p className="hero-eyebrow text-xs font-bold uppercase tracking-[0.18em]">
          {t("onboarding.heroEyebrow")}
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl lg:text-5xl">
          {t("onboarding.heroTitle")}
        </h1>
        <p className="hero-body mt-4 max-w-2xl text-base leading-relaxed">
          {t("onboarding.heroBody")}
        </p>
      </section>

      <ManagedSetupCard
        variant="banner"
        alreadyRequested={!!activeManagedSetup}
        consentAt={activeManagedSetup?.consentAt ?? null}
        defaultContact={session?.user?.email ?? ""}
      />

      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
        <span
          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-faint)" }}
        >
          {t("onboarding.orDoItYourself")}
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
      </div>

      <section>
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--text-faint)" }}>
          {t("onboarding.howItWorksEyebrow")}
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="hover-grow relative rounded-[24px] p-7 surface-panel">
              <span className="text-5xl font-bold tracking-[-0.06em]" style={{ color: "var(--accent-soft)" }}>
                {s.n}
              </span>
              <p className="mt-3 text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                {s.title}
              </p>
              <p className="mt-2 text-sm leading-[1.65]" style={{ color: "var(--text-muted)" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-panel rounded-[28px] p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "var(--accent-soft)" }}>
              <MessageSquareMore className="h-5 w-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                {t("onboarding.channelsEyebrow")}
              </p>
              <h3 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                {t("onboarding.channelsCardTitle")}
              </h3>
            </div>
          </div>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {channels.map((ch) => (
              <div
                key={ch.value}
                className="flex items-center justify-between rounded-2xl px-4 py-3"
                style={{ backgroundColor: ch.bg }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/60">
                    <ch.icon className="h-3.5 w-3.5" style={{ color: ch.color }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: ch.color }}>
                    {ch.name}
                  </span>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
                  style={{ color: ch.color, backgroundColor: "rgba(255,255,255,0.7)" }}
                >
                  {ch.auth}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-[28px] p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "var(--accent-soft)" }}>
              <Zap className="h-5 w-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                {t("onboarding.includedEyebrow")}
              </p>
              <h3 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                {t("onboarding.includedTitle")}
              </h3>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {included.map((item) => (
              <li key={item.label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--accent-soft)" }}>
                  <item.icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
                </div>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <FormDraftPersistor formId="onboarding-form" storageKey="onboarding-draft-v2" />
      <form
        id="onboarding-form"
        action={createWorkspace}
        className="rounded-[30px] surface-panel p-7 sm:p-9"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "var(--accent-soft)" }}>
            <Rocket className="h-5 w-5" style={{ color: "var(--accent)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
              {t("onboarding.formStep")}
            </p>
            <h3 className="text-xl font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
              {t("onboarding.formTitle")}
            </h3>
          </div>
          <span
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}
          >
            {t("onboarding.autoSaveBadge")}
          </span>
        </div>

        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          {t("onboarding.formIntro")}
        </p>

        <fieldset className="mt-7">
          <legend className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
            {t("onboarding.legendBusiness")}
          </legend>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("onboarding.businessNameLabel")}
              <input
                name="businessName"
                defaultValue=""
                placeholder={t("onboarding.businessNamePlaceholder")}
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
              />
            </label>
            <label className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("onboarding.slugLabel")}
              <input
                name="preferredSlug"
                placeholder={t("onboarding.slugPlaceholder")}
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("onboarding.businessTypeLabel")}
              <select
                name="businessType"
                defaultValue=""
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
              >
                <option value="">{t("onboarding.businessTypeChoose")}</option>
                {businessTypes.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("onboarding.timezoneLabel")}
              <select
                name="timezone"
                defaultValue="Europe/Moscow"
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
            <label className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("onboarding.websiteLabel")}
              <input
                name="websiteUrl"
                placeholder={t("onboarding.websitePlaceholder")}
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
              />
            </label>
            <label className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("onboarding.brandColorLabel")}
              <div className="mt-2 flex h-12 w-32 items-center gap-2 rounded-2xl border px-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)" }}>
                <input
                  type="color"
                  name="brandColor"
                  defaultValue="#c96b49"
                  className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent"
                />
                <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>#c96b49</span>
              </div>
            </label>
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
            {t("onboarding.legendOwner")}
          </legend>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("onboarding.ownerNameLabel")}
              <input
                name="ownerName"
                defaultValue={session?.user?.name ?? ""}
                placeholder={t("onboarding.ownerNamePlaceholder")}
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
              />
            </label>
            <label className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("onboarding.ownerEmailLabel")}
              <input
                name="ownerEmail"
                type="email"
                defaultValue={session?.user?.email ?? ""}
                placeholder={t("onboarding.ownerEmailPlaceholder")}
                className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
              />
            </label>
          </div>

          <label className="mt-4 block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            {t("onboarding.ownerPasswordLabel")}
            <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-faint)" }}>
              {t("onboarding.ownerPasswordOptional")}
            </span>
            <input
              name="ownerPassword"
              type="password"
              placeholder={t("onboarding.ownerPasswordPlaceholder")}
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
            />
          </label>
        </fieldset>

        <fieldset className="mt-7">
          <div className="flex items-center justify-between gap-2">
            <legend className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
              {t("onboarding.legendChannels")}
            </legend>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
            {t("onboarding.channelsFormHint")}
          </p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((ch, index) => (
              <label
                key={ch.value}
                className="hover-grow flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-secondary)",
                }}
              >
                <input
                  type="checkbox"
                  name="providers"
                  value={ch.value}
                  defaultChecked={index < 3}
                  className="accent-[var(--accent)]"
                />
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ch.color }} />
                <span className="flex-1 font-semibold">{ch.name}</span>
                <HelpTip {...ch.help} />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <div className="flex items-center justify-between gap-2">
            <legend className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
              {t("onboarding.legendAi")}
            </legend>
          </div>

          <label className="mt-3 block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            {t("onboarding.aiModeLabel")}
            <select
              name="aiMode"
              defaultValue="SUGGEST"
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
            >
              <option value="SUGGEST">{t("onboarding.aiModeSuggest")}</option>
              <option value="AUTO">{t("onboarding.aiModeAuto")}</option>
              <option value="OFF">{t("onboarding.aiModeOff")}</option>
            </select>
          </label>

          <label className="mt-4 block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            {t("onboarding.aiInstructionsLabel")}
            <textarea
              name="aiInstructions"
              rows={3}
              placeholder={t("onboarding.aiInstructionsPlaceholder")}
              className="mt-2 w-full rounded-[20px] border px-4 py-3 text-sm leading-relaxed outline-none focus:border-[var(--accent)]"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
            />
          </label>

          <label className="mt-4 block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            {t("onboarding.aiManagerInstructionsLabel")}{" "}
            <span className="ml-1 text-xs font-normal" style={{ color: "var(--text-faint)" }}>
              {t("onboarding.aiManagerInstructionsHint")}
            </span>
            <textarea
              name="aiManagerInstructions"
              rows={4}
              placeholder={t("onboarding.aiManagerInstructionsPlaceholder")}
              className="mt-2 w-full rounded-[20px] border px-4 py-3 text-sm leading-relaxed outline-none focus:border-[var(--accent)]"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
            />
          </label>
        </fieldset>

        <LlmSection />

        <fieldset className="mt-7 rounded-2xl border-2 border-dashed p-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" style={{ color: "#229ED9" }} />
              <legend className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "#229ED9" }}>
                {t("onboarding.legendOperatorBot")}
              </legend>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
              {t("onboarding.operatorBotLater")}
            </span>
          </div>

          <p className="mt-2 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
            {t("onboarding.operatorBotIntro")}
          </p>

          <label className="mt-3 block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            <span className="flex items-center justify-between">
              {t("onboarding.operatorBotTokenLabel")}
              <HelpTip
                title="Telegram Bot Token"
                steps={[
                  t("onboarding.chTelegramHelp1"),
                  t("onboarding.chTelegramHelp2"),
                  t("onboarding.chTelegramHelp3"),
                  t("onboarding.chTelegramOpHelp4"),
                ]}
                link={{ href: "https://t.me/BotFather", label: t("onboarding.chTelegramLink") }}
              />
            </span>
            <input
              name="operatorBotToken"
              type="password"
              placeholder={t("onboarding.operatorBotTokenPlaceholder")}
              className="mt-2 w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none focus:border-[#229ED9]"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text)" }}
            />
            <p className="mt-1.5 text-[11px] leading-4" style={{ color: "var(--text-faint)" }}>
              {t("onboarding.operatorBotEncrypted")}
            </p>
          </label>
        </fieldset>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="hover-grow inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-bold text-white shadow-[0_4px_14px_rgba(201,107,73,0.35)] transition hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Rocket className="h-4 w-4" />
            {t("onboarding.submitButton")}
          </button>
          <Link
            href="/dashboard"
            className="hover-grow inline-flex items-center justify-center gap-2 rounded-full border-2 px-5 py-4 text-sm font-bold transition"
            style={{ borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}
          >
            {t("onboarding.cancelButton")}
          </Link>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: "var(--text-faint)" }}>
          {t("onboarding.extraSettings")}
        </p>
      </form>

      <div
        className="flex items-start gap-3 rounded-[20px] border px-5 py-4"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          <strong className="font-bold" style={{ color: "var(--text-secondary)" }}>
            {t("onboarding.securityNoteStrong")}
          </strong>{" "}
          {t("onboarding.securityNote")}
        </p>
      </div>
    </main>
  );
}
