import type { Messages } from "./messages/ru";

/**
 * Type-safe dot-notation paths for the message tree.
 *
 *   TranslationKey = "common.save" | "common.cancel" | "dashboard.greetingMorning" | ...
 */
type Leaves<T> = T extends string
  ? ""
  : {
      [K in keyof T & string]: `${K}${Leaves<T[K]> extends "" ? "" : `.${Leaves<T[K]>}`}`;
    }[keyof T & string];

export type TranslationKey = Leaves<Messages>;

export type TranslationValues = Record<string, string | number>;

/**
 * Walk a dot-notation key into a nested object. Returns the key
 * itself as a fallback string if the path is missing — keeps the
 * UI rendering even when a translation hasn't been added yet.
 */
function resolve(messages: Messages, key: string): string {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = messages;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return key;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : key;
}

/**
 * Replace `{name}` placeholders with values. Missing placeholders
 * remain in the output so they're obvious during development.
 */
function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => {
    const v = values[k];
    return v === undefined ? m : String(v);
  });
}

/**
 * Build a translation function bound to a specific dictionary.
 * Shared by server (`getTranslations`) and client (`useTranslation`).
 */
export function createTranslator(messages: Messages) {
  return function t(key: TranslationKey, values?: TranslationValues): string {
    return interpolate(resolve(messages, key), values);
  };
}

export type TranslateFn = ReturnType<typeof createTranslator>;
