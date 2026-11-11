/**
 * Hyve supports four UI languages. Russian is the default
 * (legacy + the product was authored in Russian first).
 *
 * Locale is persisted in two places:
 *   1) cookie `ui_locale` — survives logout, used pre-auth
 *   2) AppUser.localePreference (DB) — synced when authenticated
 *
 * The cookie always wins for the current request. The DB row is
 * a long-term store that is restored to the cookie on login.
 *
 * IMPORTANT: this file contains ONLY pure constants and types so
 * it can be imported from both server and client components.
 * Server-only helpers (cookies access) live in `locale-server.ts`.
 */
export type Locale = "ru" | "en" | "de" | "tr";

export const LOCALES: Locale[] = ["ru", "en", "de", "tr"];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "ui_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
  de: "Deutsch",
  tr: "Türkçe",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  ru: "🇷🇺",
  en: "🇬🇧",
  de: "🇩🇪",
  tr: "🇹🇷",
};

export function isLocale(v: unknown): v is Locale {
  return v === "ru" || v === "en" || v === "de" || v === "tr";
}
