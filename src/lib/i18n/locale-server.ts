import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, type Locale } from "./locale";

/**
 * Read the current UI locale from the request cookie.
 *
 * Server-only — calling this in a client component crashes the build
 * (the `server-only` import is intentional). Client components should
 * use `useTranslation()` from the I18nProvider instead.
 */
export async function getCurrentLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}
