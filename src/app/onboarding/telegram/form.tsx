"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/provider";
import { requestTelegramSelfSetup } from "@/app/actions";

const CHANNELS = [
  { code: "INSTAGRAM", labelKey: "tgSetup.channelInstagram" as const, color: "#E1306C", bg: "#FEE2EE" },
  { code: "WHATSAPP",  labelKey: "tgSetup.channelWhatsApp"  as const, color: "#128C7E", bg: "#D1FAE5" },
  { code: "TELEGRAM",  labelKey: "tgSetup.channelTelegram"  as const, color: "#229ED9", bg: "#DBEAFE" },
  { code: "MESSENGER", labelKey: "tgSetup.channelMessenger" as const, color: "#0084FF", bg: "#EFF6FF" },
  { code: "VIBER",     labelKey: "tgSetup.channelViber"     as const, color: "#7360F2", bg: "#EEE8FF" },
  { code: "SIGNAL",    labelKey: "tgSetup.channelSignal"    as const, color: "#3A76F0", bg: "#EBF2FF" },
  { code: "WEBCHAT",   labelKey: "tgSetup.channelWebChat"   as const, color: "#8B4A31", bg: "#FEF3C7" },
];

export function TelegramSelfSetupForm() {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showBotHelp, setShowBotHelp] = useState(false);
  const [showIdHelp, setShowIdHelp] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await requestTelegramSelfSetup(formData);
      if (res.ok) {
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(res.error ?? t("serverErrors.tooLong"));
      }
    });
  }

  if (success) {
    return (
      <div
        className="surface-panel hover-grow flex flex-col items-center gap-4 rounded-3xl p-8 text-center"
        style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))" }}
      >
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)" }}
        >
          <CheckCircle2 className="h-7 w-7" style={{ color: "var(--accent)" }} />
        </span>
        <h2 className="text-2xl font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
          {t("tgSetup.successTitle")}
        </h2>
        <p className="max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("tgSetup.successBody")}
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition active:scale-[0.97]"
          style={{
            backgroundColor: "var(--accent)",
            boxShadow: "0 2px 10px color-mix(in srgb, var(--accent) 32%, transparent)",
          }}
        >
          {t("tgSetup.successCta")}
        </Link>
      </div>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-5"
    >
      {/* Contact */}
      <Field label={t("tgSetup.contactLabel")} hint={t("tgSetup.contactHint")}>
        <input
          name="contact"
          type="text"
          required
          maxLength={200}
          autoComplete="off"
          placeholder={t("tgSetup.contactPlaceholder")}
          className="form-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2"
          style={{
            border: "1px solid var(--border-strong)",
            backgroundColor: "var(--bg-panel)",
            color: "var(--text)",
          }}
        />
      </Field>

      {/* Business name */}
      <Field label={t("tgSetup.businessLabel")} hint={t("tgSetup.businessHint")}>
        <input
          name="businessName"
          type="text"
          maxLength={120}
          autoComplete="off"
          placeholder={t("tgSetup.businessPlaceholder")}
          className="form-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2"
          style={{
            border: "1px solid var(--border-strong)",
            backgroundColor: "var(--bg-panel)",
            color: "var(--text)",
          }}
        />
      </Field>

      {/* Bot token */}
      <Field label={t("tgSetup.botTokenLabel")} hint={t("tgSetup.botTokenHint")}>
        <input
          name="botToken"
          type="text"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder={t("tgSetup.botTokenPlaceholder")}
          className="form-input w-full rounded-2xl px-4 py-3 text-sm font-mono outline-none transition focus:ring-2"
          style={{
            border: "1px solid var(--border-strong)",
            backgroundColor: "var(--bg-panel)",
            color: "var(--text)",
          }}
        />
        <Collapsible
          open={showBotHelp}
          onToggle={() => setShowBotHelp((v) => !v)}
          title={t("tgSetup.howBotTitle")}
        >
          <Step n="1">{t("tgSetup.howBotStep1")}</Step>
          <Step n="2">{t("tgSetup.howBotStep2")}</Step>
          <Step n="3">{t("tgSetup.howBotStep3")}</Step>
          <Step n="4">{t("tgSetup.howBotStep4")}</Step>
        </Collapsible>
      </Field>

      {/* Telegram user id */}
      <Field label={t("tgSetup.tgUserIdLabel")} hint={t("tgSetup.tgUserIdHint")}>
        <input
          name="telegramUserId"
          type="text"
          required
          inputMode="numeric"
          pattern="\d{5,15}"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("tgSetup.tgUserIdPlaceholder")}
          className="form-input w-full rounded-2xl px-4 py-3 text-sm font-mono outline-none transition focus:ring-2"
          style={{
            border: "1px solid var(--border-strong)",
            backgroundColor: "var(--bg-panel)",
            color: "var(--text)",
          }}
        />
        <Collapsible
          open={showIdHelp}
          onToggle={() => setShowIdHelp((v) => !v)}
          title={t("tgSetup.howIdTitle")}
        >
          <Step n="1">{t("tgSetup.howIdStep1")}</Step>
          <Step n="2">{t("tgSetup.howIdStep2")}</Step>
          <Step n="3">{t("tgSetup.howIdStep3")}</Step>
        </Collapsible>
      </Field>

      {/* Channels */}
      <div>
        <label className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("tgSetup.channelsLabel")}
        </label>
        <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          {t("tgSetup.channelsHint")}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CHANNELS.map((ch) => (
            <label
              key={ch.code}
              className="group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition"
              style={{
                border: "1px solid var(--border-strong)",
                backgroundColor: "var(--bg-panel)",
              }}
            >
              <input
                type="checkbox"
                name="channels"
                value={ch.code}
                className="h-4 w-4 cursor-pointer rounded"
                style={{ accentColor: "var(--accent)" }}
              />
              <span
                className="rounded-full px-2.5 py-1 text-xs font-bold"
                style={{ color: ch.color, backgroundColor: ch.bg }}
              >
                {t(ch.labelKey)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Optional message */}
      <Field label={t("tgSetup.messageLabel")} hint={t("tgSetup.messageHint")}>
        <textarea
          name="message"
          rows={3}
          maxLength={1000}
          placeholder={t("tgSetup.messagePlaceholder")}
          className="form-input w-full resize-y rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2"
          style={{
            border: "1px solid var(--border-strong)",
            backgroundColor: "var(--bg-panel)",
            color: "var(--text)",
            minHeight: 72,
          }}
        />
      </Field>

      {/* Privacy notice */}
      <div
        className="flex items-start gap-3 rounded-2xl p-3.5"
        style={{
          border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))",
          backgroundColor: "color-mix(in srgb, var(--accent) 6%, transparent)",
        }}
      >
        <Lock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
        <div className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
          {t("tgSetup.secureNotice")}
        </div>
      </div>

      {/* Manager notice */}
      <p className="text-xs italic" style={{ color: "var(--text-secondary)" }}>
        {t("tgSetup.selfManagerNotice")}
      </p>

      {/* Error */}
      {error ? (
        <div
          className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold"
          style={{
            backgroundColor: "color-mix(in srgb, #dc2626 10%, transparent)",
            color: "#dc2626",
            border: "1px solid color-mix(in srgb, #dc2626 30%, transparent)",
          }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-60"
        style={{
          backgroundColor: "var(--accent)",
          boxShadow: "0 2px 10px color-mix(in srgb, var(--accent) 32%, transparent)",
        }}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("tgSetup.submitting")}
          </>
        ) : (
          t("tgSetup.submitButton")
        )}
      </button>
    </form>
  );
}

// ─── helpers ───

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint ? (
        <p className="mt-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Collapsible({
  open,
  onToggle,
  title,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mt-2 overflow-hidden rounded-xl"
      style={{ border: "1px solid var(--border)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-xs font-bold"
        style={{
          backgroundColor: "color-mix(in srgb, var(--bg-muted) 60%, transparent)",
          color: "var(--text-secondary)",
        }}
      >
        <span>{title}</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        )}
      </button>
      {open ? (
        <div className="space-y-1.5 px-3.5 py-3" style={{ backgroundColor: "var(--bg-panel)" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-xs leading-relaxed">
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
        style={{
          backgroundColor: "color-mix(in srgb, var(--accent) 16%, transparent)",
          color: "var(--accent)",
        }}
      >
        {n}
      </span>
      <span style={{ color: "var(--text)" }}>{children}</span>
    </div>
  );
}
