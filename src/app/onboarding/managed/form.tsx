"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/provider";
import { requestTelegramManagedSetup } from "@/app/actions";

export function TelegramManagedSetupForm() {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await requestTelegramManagedSetup(formData);
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
        className="surface-panel flex flex-col items-center gap-4 rounded-3xl p-8 text-center"
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
    <form action={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("tgSetup.contactLabel")}
        </label>
        <input
          name="contact"
          type="text"
          required
          maxLength={200}
          autoComplete="off"
          placeholder={t("tgSetup.contactPlaceholder")}
          className="mt-1.5 w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2"
          style={{
            border: "1px solid var(--border-strong)",
            backgroundColor: "var(--bg-panel)",
            color: "var(--text)",
          }}
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
          {t("tgSetup.contactHint")}
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("tgSetup.businessLabel")}
        </label>
        <input
          name="businessName"
          type="text"
          maxLength={120}
          autoComplete="off"
          placeholder={t("tgSetup.businessPlaceholder")}
          className="mt-1.5 w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2"
          style={{
            border: "1px solid var(--border-strong)",
            backgroundColor: "var(--bg-panel)",
            color: "var(--text)",
          }}
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
          {t("tgSetup.businessHint")}
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("tgSetup.messageLabel")}
        </label>
        <textarea
          name="message"
          rows={3}
          maxLength={1000}
          placeholder={t("tgSetup.messagePlaceholder")}
          className="mt-1.5 w-full resize-y rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2"
          style={{
            border: "1px solid var(--border-strong)",
            backgroundColor: "var(--bg-panel)",
            color: "var(--text)",
            minHeight: 72,
          }}
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
          {t("tgSetup.messageHint")}
        </p>
      </div>

      <p className="text-xs italic" style={{ color: "var(--text-secondary)" }}>
        {t("tgSetup.managedManagerNotice")}
      </p>

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
