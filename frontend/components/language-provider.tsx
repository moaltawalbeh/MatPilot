"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getTranslations, type Locale, type TranslationKeys, LOCALES } from "@/lib/i18n";

type LanguageContextType = {
  locale: Locale;
  t: TranslationKeys;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  t: getTranslations("en"),
  dir: "ltr",
  setLocale: () => {},
});

const STORAGE_KEY = "matpilot-locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && (saved === "en" || saved === "ar" || saved === "de")) {
        setLocaleState(saved);
      }
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale;
      const dir = LOCALES.find((l) => l.code === locale)?.dir || "ltr";
      document.documentElement.dir = dir;
    }
  }, [locale, mounted]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const localeInfo = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <LanguageContext.Provider value={{ locale, t: getTranslations(locale), dir: localeInfo.dir, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
