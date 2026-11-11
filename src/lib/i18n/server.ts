import { getCurrentLocale } from "./locale-server";
import { dictionaries } from "./messages";
import { createTranslator } from "./format";

/**
 * Server-side translator. Use in async server components and
 * server actions:
 *
 *   const t = await getTranslations();
 *   return <h1>{t("dashboard.subtitle")}</h1>;
 */
export async function getTranslations() {
  const locale = await getCurrentLocale();
  const messages = dictionaries[locale];
  return createTranslator(messages);
}

/**
 * Returns both the locale and dictionary — useful for the root
 * layout where we need to pass both to the client provider.
 */
export async function getI18nBundle() {
  const locale = await getCurrentLocale();
  const messages = dictionaries[locale];
  return { locale, messages };
}
