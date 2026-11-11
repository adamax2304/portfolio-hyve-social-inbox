"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./locale";
import type { Messages } from "./messages";
import { createTranslator, type TranslateFn } from "./format";

type I18nCtx = {
  locale: Locale;
  messages: Messages;
  t: TranslateFn;
};

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nCtx>(
    () => ({ locale, messages, t: createTranslator(messages) }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Primary client-side hook. Returns the `t()` function bound to
 * the current locale's dictionary.
 *
 *   const { t } = useTranslation();
 *   <button>{t("common.save")}</button>
 *
 *   const { t, locale } = useTranslation();
 *   const dateStr = new Date().toLocaleDateString(locale);
 */
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error(
      "useTranslation() must be used inside <I18nProvider>. " +
        "Check that the component is rendered under the root layout.",
    );
  }
  return ctx;
}
