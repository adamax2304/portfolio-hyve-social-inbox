import { ru } from "./ru";
import { en } from "./en";
import { de } from "./de";
import { tr } from "./tr";
import type { Locale } from "../locale";
import type { Messages } from "./ru";

export type { Messages } from "./ru";

export const dictionaries: Record<Locale, Messages> = {
  ru,
  en,
  de,
  tr,
};
