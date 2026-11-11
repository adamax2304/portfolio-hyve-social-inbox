"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  ShieldCheck,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Lock,
  Bot,
  Settings2,
  HeartHandshake,
} from "lucide-react";
import {
  requestManagedSetupAction,
  revokeManagedSetupAction,
} from "@/app/actions";
import { useTranslation } from "@/lib/i18n/provider";

type Variant = "banner" | "card-compact" | "profile-card";

type Props = {
  variant?: Variant;
  alreadyRequested?: boolean;
  consentAt?: string | null;
  defaultContact?: string;
  defaultBusinessName?: string;
};

export function ManagedSetupCard({
  variant = "banner",
  alreadyRequested = false,
  consentAt,
  defaultContact = "",
  defaultBusinessName = "",
}: Props) {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();
  const [revokePending, revokeTransition] = useTransition();

  const [contact, setContact] = useState(defaultContact);
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [revoked, setRevoked] = useState(false);

  // Bullets derived from translations — recomputed when locale changes
  const includedBullets = [
    { icon: Settings2,      title: t("managedSetup.bullet1Title"), desc: t("managedSetup.bullet1Desc") },
    { icon: Bot,            title: t("managedSetup.bullet2Title"), desc: t("managedSetup.bullet2Desc") },
    { icon: HeartHandshake, title: t("managedSetup.bullet3Title"), desc: t("managedSetup.bullet3Desc") },
    { icon: ShieldCheck,    title: t("managedSetup.bullet4Title"), desc: t("managedSetup.bullet4Desc") },
  ];

  useEffect(() => setMounted(true), []);

  // Body scroll lock + Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function closeModal() {
    setOpen(false);
    setTimeout(() => {
      setError(null);
      setDone(false);
    }, 220);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError(t("managedSetup.errorConsent"));
      return;
    }
    if (!contact.trim()) {
      setError(t("managedSetup.errorContact"));
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("contact", contact.trim());
        fd.set("businessName", businessName.trim());
        fd.set("message", message.trim());
        fd.set("consent", "on");
        const r = await requestManagedSetupAction(fd);
        if (!r.ok) {
          setError(r.error ?? t("managedSetup.errorSubmit"));
          return;
        }
        setDone(true);
        setMessage("");
      } catch (err) {
        console.error(err);
        setError(t("managedSetup.errorNetwork"));
      }
    });
  }

  function revoke() {
    revokeTransition(async () => {
      try {
        await revokeManagedSetupAction();
        setRevoked(true);
      } catch (err) {
        console.error(err);
      }
    });
  }

  // ─── Trigger UI (varies by variant) ──────────────────────────────

  const triggerNode = (() => {
    if (alreadyRequested && !revoked) {
      return (
        <div
          className="rounded-[24px] p-5 sm:p-6"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, #16a34a 12%, var(--bg-panel)), var(--bg-panel))",
            border: "0.5px solid color-mix(in srgb, #16a34a 30%, var(--border))",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "color-mix(in srgb, #16a34a 18%, transparent)" }}
            >
              <CheckCircle2 className="h-5 w-5" style={{ color: "#16a34a" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "#16a34a" }}
              >
                {t("managedSetup.activeEyebrow")}
              </p>
              <h3
                className="mt-1 text-base font-bold tracking-[-0.02em]"
                style={{ color: "var(--text)" }}
              >
                {t("managedSetup.activeTitle")}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {t("managedSetup.activeText")}
              </p>
              {consentAt ? (
                <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
                  {t("managedSetup.activeConsentSince", { date: new Date(consentAt).toLocaleString(locale) })}
                </p>
              ) : null}
              <button
                type="button"
                onClick={revoke}
                disabled={revokePending}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-[0.97] disabled:opacity-60"
                style={{
                  borderColor: "color-mix(in srgb, #dc2626 40%, var(--border))",
                  color: "#dc2626",
                }}
              >
                <Lock className="h-3 w-3" />
                {revokePending ? t("managedSetup.revoking") : t("managedSetup.revokeButton")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (variant === "card-compact") {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hover-grow inline-flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.97]"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, #7C3AED 14%, var(--bg-panel)), var(--bg-panel))",
            border: "0.5px solid color-mix(in srgb, #7C3AED 35%, var(--border))",
            color: "var(--text)",
          }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #c084fc 100%)" }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{t("managedSetup.compactTitle")}</p>
            <p className="text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>
              {t("managedSetup.compactSubtitle")}
            </p>
          </div>
          <span className="shrink-0 text-lg" style={{ color: "#7C3AED" }}>
            →
          </span>
        </button>
      );
    }

    if (variant === "profile-card") {
      return (
        <div
          className="rounded-[24px] p-5 sm:p-6"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, #7C3AED 10%, var(--bg-panel)), var(--bg-panel))",
            border: "0.5px solid color-mix(in srgb, #7C3AED 30%, var(--border))",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #c084fc 100%)" }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "#7C3AED" }}
              >
                {t("managedSetup.eyebrow")}
              </p>
              <h3
                className="mt-1 text-base font-bold tracking-[-0.02em]"
                style={{ color: "var(--text)" }}
              >
                {t("managedSetup.profileTitle")}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {t("managedSetup.profileText")}
              </p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="hover-grow mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #c084fc 100%)",
                  color: "#fff",
                  boxShadow: "0 2px 10px rgba(124,58,237,0.35)",
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("managedSetup.profileCta")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // banner (default)
    return (
      <div
        className="relative overflow-hidden rounded-[28px] p-6 sm:p-8"
        style={{
          background:
            "linear-gradient(135deg, #7C3AED 0%, #c084fc 50%, #f472b6 100%)",
          color: "#ffffff",
        }}
      >
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-30 blur-3xl"
             style={{ backgroundColor: "#ffffff" }} />
        <div className="relative grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.85)" }}>
              {t("managedSetup.eyebrow")}
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] sm:text-2xl">
              {t("managedSetup.bannerTitle")}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>
              {t("managedSetup.bannerText")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hover-grow inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold transition active:scale-[0.97] sm:shrink-0"
            style={{ color: "#7C3AED", boxShadow: "0 4px 18px rgba(0,0,0,0.18)" }}
          >
            <Sparkles className="h-4 w-4" />
            {t("managedSetup.bannerCta")}
          </button>
        </div>
      </div>
    );
  })();

  // ─── Modal ───────────────────────────────────────────────────────

  const modalNode = open ? (
    <div
      className="fixed inset-0 z-[2147483600] flex items-center justify-center px-4 py-6 access-modal-overlay"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 sm:p-7 access-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "calc(100vh - 48px)", overflowY: "auto" }}
      >
        {done ? (
          <div className="text-center">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #c084fc 100%)" }}
            >
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h3
              className="mt-4 text-lg font-bold tracking-[-0.02em]"
              style={{ color: "var(--text)" }}
            >
              {t("managedSetup.sentTitle")}
            </h3>
            <p
              className="mx-auto mt-2 max-w-sm text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("managedSetup.sentText")}
            </p>
            <p
              className="mx-auto mt-3 max-w-sm text-xs"
              style={{ color: "var(--text-faint)" }}
            >
              {t("managedSetup.sentFootnote")}
            </p>
            <button
              type="button"
              onClick={closeModal}
              className="mt-5 rounded-full px-6 py-2.5 text-sm font-bold transition active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #c084fc 100%)",
                color: "#fff",
              }}
            >
              {t("managedSetup.sentClose")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: "#7C3AED" }}
                >
                  {t("managedSetup.eyebrow")}
                </p>
                <h3
                  className="mt-1 text-lg font-bold tracking-[-0.02em]"
                  style={{ color: "var(--text)" }}
                >
                  {t("managedSetup.modalTitle")}
                </h3>
                <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  {t("managedSetup.modalSubtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label={t("common.close")}
                className="-mr-1 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition access-modal-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-2.5">
              {includedBullets.map((b) => (
                <div
                  key={b.title}
                  className="flex items-start gap-3 rounded-2xl p-3"
                  style={{
                    backgroundColor: "color-mix(in srgb, #7C3AED 6%, transparent)",
                    border: "0.5px solid color-mix(in srgb, #7C3AED 18%, var(--border))",
                  }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "color-mix(in srgb, #7C3AED 14%, transparent)" }}
                  >
                    <b.icon className="h-4 w-4" style={{ color: "#7C3AED" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold" style={{ color: "var(--text)" }}>
                      {b.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
                      {b.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <label
              className="mt-5 block text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("managedSetup.contactLabel")}{" "}
              <span className="font-normal" style={{ color: "var(--text-faint)" }}>
                {t("managedSetup.contactHint")}
              </span>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={t("managedSetup.contactPlaceholder")}
                required
                className="access-modal-input mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition"
              />
            </label>

            <label
              className="mt-3 block text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("managedSetup.businessNameLabel")}{" "}
              <span className="font-normal" style={{ color: "var(--text-faint)" }}>
                {t("managedSetup.businessNameHint")}
              </span>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={t("managedSetup.businessNamePlaceholder")}
                className="access-modal-input mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition"
              />
            </label>

            <label
              className="mt-3 block text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("managedSetup.messageLabel")}{" "}
              <span className="font-normal" style={{ color: "var(--text-faint)" }}>
                {t("managedSetup.messageHint")}
              </span>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("managedSetup.messagePlaceholder")}
                className="access-modal-input mt-1.5 w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none transition"
              />
            </label>

            <label
              className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl p-3.5"
              style={{
                backgroundColor: consent
                  ? "color-mix(in srgb, #7C3AED 10%, transparent)"
                  : "color-mix(in srgb, var(--bg-muted) 80%, transparent)",
                border: consent
                  ? "0.5px solid color-mix(in srgb, #7C3AED 50%, transparent)"
                  : "0.5px solid var(--border)",
                transition: "background-color 0.2s, border-color 0.2s",
              }}
            >
              <input
                type="checkbox"
                name="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#7C3AED]"
              />
              <div className="min-w-0 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text)" }}>
                  {t("managedSetup.consentStrong")}
                </strong>{" "}
                {t("managedSetup.consentRest")}
              </div>
            </label>

            {error ? (
              <div
                className="mt-3 flex items-start gap-2 rounded-2xl px-3 py-2 text-xs font-semibold"
                style={{
                  backgroundColor: "color-mix(in srgb, #dc2626 14%, transparent)",
                  color: "#dc2626",
                }}
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="hover-grow rounded-full border px-4 py-2.5 text-sm font-bold transition active:scale-[0.97]"
                style={{
                  borderColor: "var(--border-strong)",
                  color: "var(--text-secondary)",
                }}
              >
                {t("managedSetup.cancelButton")}
              </button>
              <button
                type="submit"
                disabled={pending || !consent}
                className="hover-grow inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: consent
                    ? "linear-gradient(135deg, #7C3AED 0%, #c084fc 100%)"
                    : "var(--bg-muted)",
                  color: consent ? "#ffffff" : "var(--text-faint)",
                  boxShadow: consent ? "0 2px 12px rgba(124,58,237,0.35)" : "none",
                }}
              >
                <Send className="h-4 w-4" />
                {pending ? t("managedSetup.submitting") : t("managedSetup.submitButton")}
              </button>
            </div>
            <p
              className="mt-2.5 text-center text-[10px]"
              style={{ color: "var(--text-faint)" }}
            >
              {t("managedSetup.footerNote")}
            </p>
          </form>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      {triggerNode}
      {mounted && modalNode ? createPortal(modalNode, document.body) : null}
    </>
  );
}
