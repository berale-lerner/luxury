"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { content, type Locale, type SiteContent } from "./content";

type LocaleValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  isRTL: boolean;
  c: SiteContent;
  toggle: () => void;
  setLocale: (l: Locale) => void;
  mounted: boolean;
};

const STORAGE_KEY = "chabad-pedro-locale";

const LocaleContext = createContext<LocaleValue>({
  locale: "he",
  dir: "rtl",
  isRTL: true,
  c: content.he,
  toggle: () => {},
  setLocale: () => {},
  mounted: false,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("he");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let initial: Locale = "he";
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "he") initial = saved;
    } catch {
      /* storage unavailable inside some iframes */
    }
    setLocaleState(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "he" ? "rtl" : "ltr";
    if (mounted) {
      try {
        window.localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        /* noop */
      }
    }
  }, [locale, mounted]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const toggle = useCallback(
    () => setLocaleState((p) => (p === "he" ? "en" : "he")),
    [],
  );

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      dir: locale === "he" ? "rtl" : "ltr",
      isRTL: locale === "he",
      c: content[locale],
      toggle,
      setLocale,
      mounted,
    }),
    [locale, toggle, setLocale, mounted],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);
