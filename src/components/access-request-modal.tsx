"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Send, CheckCircle2, KeyRound } from "lucide-react";
import { requestServiceAccess } from "@/app/actions";
import { useTranslation } from "@/lib/i18n/provider";

export function AccessRequestButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  // Mount flag — needed for portal SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Esc + lock body scroll
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
      setDone(false);
      setError(null);
    }, 250);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!contact.trim()) {
      setError(t("auth.errorContactRequired"));
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("contact", contact.trim());
        fd.append("message", message.trim());
        const result = await requestServiceAccess(fd);
        if (!result.ok) {
          setError(result.error ?? t("auth.errorAccessFailed"));
          return;
        }
        setDone(true);
        setContact("");
        setMessage("");
      } catch (err) {
        console.error(err);
        setError(t("auth.errorNetwork"));
      }
    });
  }

  const modalEl = open ? (
    <div
      className="fixed inset-0 z-[2147483600] flex items-center justify-center px-4 access-modal-overlay"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-7 access-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
              }}
            >
              <CheckCircle2 className="h-7 w-7" style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="mt-4 text-lg font-bold" style={{ color: "var(--text)" }}>
              {t("auth.modalAccessSuccessTitle")}
            </h3>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("auth.modalAccessSuccessText")}
            </p>
            <button
              type="button"
              onClick={closeModal}
              className="access-modal-primary mt-5 rounded-full px-6 py-2.5 text-sm font-bold transition active:scale-[0.97]"
            >
              {t("auth.modalClose")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className="text-lg font-bold tracking-[-0.02em]"
                  style={{ color: "var(--text)" }}
                >
                  {t("auth.accessTitle")}
                </h3>
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  {t("auth.sidebarModalSubtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label={t("auth.modalClose")}
                className="-mr-1 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition access-modal-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label
              className="mt-5 block text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("auth.accessContactLabel")}
              <input
                name="contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                autoFocus
                required
                placeholder={t("auth.modalContactPlaceholder")}
                className="access-modal-input mt-1.5 w-full rounded-2xl px-4 py-3 text-sm font-normal outline-none transition"
              />
            </label>

            <label
              className="mt-3 block text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("auth.modalAboutBusiness")}{" "}
              <span className="font-normal" style={{ color: "var(--text-faint)" }}>
                ({t("common.optional")})
              </span>
              <textarea
                name="message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("auth.modalAboutBusinessPlaceholder")}
                className="access-modal-input mt-1.5 w-full resize-none rounded-2xl px-4 py-3 text-sm font-normal outline-none transition"
              />
            </label>

            {error ? (
              <div
                className="mt-3 rounded-2xl px-4 py-2.5 text-sm font-semibold"
                style={{
                  color: "#dc2626",
                  backgroundColor: "color-mix(in srgb, #dc2626 12%, transparent)",
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="access-modal-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>{t("auth.modalSubmitting")}</>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("auth.accessSubmit")}
                </>
              )}
            </button>
            <p
              className="mt-3 text-center text-[11px]"
              style={{ color: "var(--text-faint)" }}
            >
              {t("auth.sidebarConsentLine")}
            </p>
          </form>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        className="border-t pt-5"
        style={{ borderColor: "var(--border)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "var(--text-faint)" }}
        >
          {t("auth.sidebarNoAccount")}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="access-cta-button mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition active:scale-[0.97]"
        >
          <KeyRound className="h-4 w-4" />
          {t("auth.sidebarCta")}
        </button>
        <p
          className="mt-2 text-[11px] leading-relaxed"
          style={{ color: "var(--text-faint)" }}
        >
          {t("auth.sidebarHint")}
        </p>
      </div>

      {mounted && modalEl ? createPortal(modalEl, document.body) : null}
    </>
  );
}
