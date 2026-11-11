"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  Send,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { requestPasswordResetAction, requestServiceAccess } from "@/app/actions";
import { useTranslation } from "@/lib/i18n/provider";

type Props = {
  /** Render trigger button as floating "Войти" CTA on mobile. When omitted, falls back to translated "Sign in". */
  triggerLabel?: string;
  /** Optional initial state */
  initialOpen?: boolean;
  /** Customize trigger className */
  triggerClassName?: string;
  /** Open modal directly in this mode */
  defaultMode?: "login" | "access";
};

export function LoginModal({ triggerLabel, initialOpen = false, triggerClassName, defaultMode = "login" }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(initialOpen);
  const [mode, setMode] = useState<"login" | "forgot" | "forgot-sent" | "access" | "access-sent">(defaultMode);
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();

  // Login form
  const [login, setLogin] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot form
  const [forgotLogin, setForgotLogin] = useState("");

  // Access request form
  const [accessContact, setAccessContact] = useState("");
  const [accessMessage, setAccessMessage] = useState("");

  useEffect(() => setMounted(true), []);

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
      setMode(defaultMode);
      setError(null);
      setAccessContact("");
      setAccessMessage("");
    }, 200);
  }

  function submitAccess(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accessContact.trim()) {
      setError(t("auth.errorContactRequired"));
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("contact", accessContact.trim());
        fd.append("message", accessMessage.trim());
        const result = await requestServiceAccess(fd);
        if (!result.ok) {
          setError(result.error ?? t("auth.errorAccessFailed"));
          return;
        }
        setMode("access-sent");
      } catch (err) {
        console.error(err);
        setError(t("auth.errorNetwork"));
      }
    });
  }

  function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await signIn("credentials", {
          email: login,
          password: pwd,
          redirect: false,
        });
        if (!res || res.error) {
          setError(t("auth.errorInvalidCredentials"));
          return;
        }
        // Force a hard reload so server components re-fetch session
        window.location.href = "/dashboard";
      } catch (err) {
        console.error(err);
        setError(t("auth.errorLoginFailed"));
      }
    });
  }

  function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!forgotLogin.trim()) {
      setError(t("auth.errorLoginRequired"));
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("login", forgotLogin.trim());
        await requestPasswordResetAction(fd);
        setMode("forgot-sent");
      } catch (err) {
        console.error(err);
        setError(t("auth.errorNetwork"));
      }
    });
  }

  const triggerCls =
    triggerClassName ??
    "login-trigger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition active:scale-[0.96]";

  const modalEl = open ? (
    <div
      className="fixed inset-0 z-[2147483600] flex items-center justify-center px-4 access-modal-overlay"
      onClick={closeModal}
    >
      <div
        className="login-modal-card w-full max-w-md rounded-3xl p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
              {mode === "login"
                ? t("auth.loginTitle")
                : mode === "forgot"
                ? t("auth.modalForgotTitle")
                : mode === "access"
                ? t("auth.accessTitle")
                : mode === "access-sent"
                ? t("auth.modalAccessSuccessTitle")
                : t("auth.modalForgotSuccessTitle")}
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
              {mode === "login"
                ? t("auth.modalLoginHint")
                : mode === "forgot"
                ? t("auth.modalForgotHint")
                : mode === "access"
                ? t("auth.modalAccessHint")
                : mode === "access-sent"
                ? t("auth.modalAccessSentHint")
                : t("auth.modalForgotSentHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label={t("auth.modalClose")}
            className="-mr-1 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5"
            style={{ color: "var(--text-faint)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={submitLogin} className="mt-5 space-y-3">
            <label
              className="block text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("auth.modalLoginOrEmail")}
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                autoFocus
                placeholder={t("auth.modalLoginOrEmailPlaceholder")}
                className="login-modal-input mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition"
              />
            </label>
            <label
              className="block text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("auth.passwordLabel")}
              <div className="relative mt-1.5">
                <input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="login-modal-input w-full rounded-2xl px-4 py-2.5 pr-11 text-sm outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? t("auth.modalHidePassword") : t("auth.modalShowPassword")}
                  className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-black/5"
                  style={{ color: "var(--text-faint)" }}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error ? (
              <div
                className="flex items-start gap-2 rounded-2xl px-3 py-2 text-xs font-semibold"
                style={{
                  backgroundColor: "color-mix(in srgb, #dc2626 14%, transparent)",
                  color: "#dc2626",
                }}
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="hover-grow inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition active:scale-[0.97] disabled:opacity-60"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--btn-fill-fg)",
                boxShadow: "0 2px 10px color-mix(in srgb, var(--accent) 35%, transparent)",
              }}
            >
              <ArrowRight className="h-4 w-4" />
              {pending ? t("auth.signingIn") : t("auth.signInButton")}
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                }}
                className="font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--accent)" }}
              >
                {t("auth.forgotPassword")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("access");
                  setError(null);
                }}
                className="font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                {t("auth.modalNoAccountArrow")}
              </button>
            </div>
          </form>
        ) : null}

        {mode === "forgot" ? (
          <form onSubmit={submitForgot} className="mt-5 space-y-3">
            <p className="text-xs leading-snug" style={{ color: "var(--text-muted)" }}>
              {t("auth.modalForgotIntro")}
            </p>

            <label
              className="block text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              <span className="inline-flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> {t("auth.modalLoginOrEmail")}
              </span>
              <input
                type="text"
                value={forgotLogin}
                onChange={(e) => setForgotLogin(e.target.value)}
                required
                autoFocus
                placeholder={t("auth.modalLoginOrEmailPlaceholder")}
                className="login-modal-input mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition"
              />
            </label>

            {error ? (
              <div
                className="flex items-start gap-2 rounded-2xl px-3 py-2 text-xs font-semibold"
                style={{
                  backgroundColor: "color-mix(in srgb, #dc2626 14%, transparent)",
                  color: "#dc2626",
                }}
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                {error}
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="hover-grow rounded-full border px-3 py-2.5 text-sm font-bold transition active:scale-[0.97]"
                style={{
                  borderColor: "var(--border-strong)",
                  color: "var(--text-secondary)",
                }}
              >
                {t("common.back")}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="hover-grow inline-flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-bold transition active:scale-[0.97] disabled:opacity-60"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--btn-fill-fg)",
                }}
              >
                <Send className="h-4 w-4" />
                {pending ? t("auth.modalSubmitting") : t("auth.modalSendLink")}
              </button>
            </div>
          </form>
        ) : null}

        {mode === "forgot-sent" ? (
          <div className="mt-5 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                backgroundColor: "color-mix(in srgb, #16a34a 18%, transparent)",
              }}
            >
              <CheckCircle2 className="h-7 w-7" style={{ color: "#16a34a" }} />
            </div>
            <p
              className="mt-3 text-sm font-bold"
              style={{ color: "var(--text)" }}
            >
              {t("auth.modalForgotSuccessTitle")}
            </p>
            <p
              className="mx-auto mt-2 max-w-xs text-xs leading-snug"
              style={{ color: "var(--text-muted)" }}
            >
              {t("auth.modalForgotSuccessText")}
            </p>
            <button
              type="button"
              onClick={closeModal}
              className="mt-4 rounded-full px-5 py-2.5 text-sm font-bold transition active:scale-[0.97]"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--btn-fill-fg)",
              }}
            >
              {t("auth.modalClose")}
            </button>
          </div>
        ) : null}

        {mode === "access" ? (
          <form onSubmit={submitAccess} className="mt-5 space-y-3">
            <label
              className="block text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              <span className="inline-flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> {t("auth.accessContactLabel")}
              </span>
              <input
                type="text"
                value={accessContact}
                onChange={(e) => setAccessContact(e.target.value)}
                required
                autoFocus
                placeholder={t("auth.modalContactPlaceholder")}
                className="login-modal-input mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition"
              />
            </label>

            <label
              className="block text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("auth.modalAboutBusiness")}{" "}
              <span className="font-normal" style={{ color: "var(--text-faint)" }}>
                ({t("common.optional")})
              </span>
              <textarea
                rows={3}
                value={accessMessage}
                onChange={(e) => setAccessMessage(e.target.value)}
                placeholder={t("auth.modalAboutBusinessPlaceholder")}
                className="login-modal-input mt-1.5 w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none transition"
              />
            </label>

            {error ? (
              <div
                className="flex items-start gap-2 rounded-2xl px-3 py-2 text-xs font-semibold"
                style={{
                  backgroundColor: "color-mix(in srgb, #dc2626 14%, transparent)",
                  color: "#dc2626",
                }}
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                {error}
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="hover-grow rounded-full border px-3 py-2.5 text-sm font-bold transition active:scale-[0.97]"
                style={{
                  borderColor: "var(--border-strong)",
                  color: "var(--text-secondary)",
                }}
              >
                {t("common.back")}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="hover-grow inline-flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-bold transition active:scale-[0.97] disabled:opacity-60"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--btn-fill-fg)",
                  boxShadow: "0 2px 10px color-mix(in srgb, var(--accent) 35%, transparent)",
                }}
              >
                <Send className="h-4 w-4" />
                {pending ? t("auth.modalSubmitting") : t("auth.accessSubmit")}
              </button>
            </div>
            <p className="text-center text-[10px]" style={{ color: "var(--text-faint)" }}>
              {t("auth.modalAccessConsentLine")}
            </p>
          </form>
        ) : null}

        {mode === "access-sent" ? (
          <div className="mt-5 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent) 18%, transparent)",
              }}
            >
              <CheckCircle2 className="h-7 w-7" style={{ color: "var(--accent)" }} />
            </div>
            <p className="mt-3 text-sm font-bold" style={{ color: "var(--text)" }}>
              {t("auth.modalAccessSuccessTitle")}
            </p>
            <p
              className="mx-auto mt-2 max-w-xs text-xs leading-snug"
              style={{ color: "var(--text-muted)" }}
            >
              {t("auth.modalAccessSuccessText")}
            </p>
            <button
              type="button"
              onClick={closeModal}
              className="mt-4 rounded-full px-5 py-2.5 text-sm font-bold transition active:scale-[0.97]"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--btn-fill-fg)",
              }}
            >
              {t("auth.modalClose")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  // If no explicit trigger label was passed, fall back to the
  // translated "Sign in" so the floating mobile CTA stays localized.
  const label = triggerLabel ?? t("auth.signInButton");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerCls}>
        {label}
      </button>
      {mounted && modalEl ? createPortal(modalEl, document.body) : null}
    </>
  );
}
