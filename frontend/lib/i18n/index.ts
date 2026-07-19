import type { Locale, TranslationKeys } from "./types";
import { en } from "./en";
import { ar } from "./ar";
import { de } from "./de";

export type { Locale, TranslationKeys };

const dictionaries: Record<Locale, TranslationKeys> = { en, ar, de };

export function getTranslations(locale: Locale): TranslationKeys {
  return dictionaries[locale] || dictionaries.en;
}

export const LOCALES: { code: Locale; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "de", label: "Deutsch", dir: "ltr" },
];
