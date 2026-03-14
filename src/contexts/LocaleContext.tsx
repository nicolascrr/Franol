"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  useEffect,
} from "react";
import fr from "@/translations/fr.json";
import es from "@/translations/es.json";
import {
  type LangCode,
  type LanguagePair,
  LOCALE_TO_LANG_PAIR,
} from "@/lib/lang";

// Types
export type Locale = "fr" | "es" | null;

type Translations = typeof fr;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  clearLocale: () => void;
  isLoading: boolean;
  /**
   * User's native language (= UI locale when set).
   * Use with getLangValue(item, "word", sourceLang) to read the source-side field.
   */
  sourceLang: LangCode;
  /**
   * Language the user is learning (always opposite of sourceLang for current pairs).
   * Use with getLangValue(item, "word", targetLang) to read the target-side field.
   */
  targetLang: LangCode;
}

// Traductions
const translations: Record<"fr" | "es", Translations> = { fr, es };

// Fallback language pair when locale is null (not yet chosen)
const FALLBACK_LANG_PAIR: LanguagePair = LOCALE_TO_LANG_PAIR["fr"];

// Contexte
const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = "franol-locale";

// Provider
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurer la locale depuis le localStorage au chargement
  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (savedLocale === "fr" || savedLocale === "es") {
      setLocaleState(savedLocale);
    }
    setIsLoading(false);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (newLocale) {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } else {
      localStorage.removeItem(LOCALE_STORAGE_KEY);
    }
  }, []);

  const clearLocale = useCallback(() => {
    setLocaleState(null);
    localStorage.removeItem(LOCALE_STORAGE_KEY);
  }, []);

  // Fonction de traduction
  const t = useCallback(
    (key: string): string => {
      if (!locale) return key;

      const keys = key.split(".");
      let value: unknown = translations[locale];

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return key; // Retourne la clé si non trouvée
        }
      }

      return typeof value === "string" ? value : key;
    },
    [locale],
  );

  const { source: sourceLang, target: targetLang } = useMemo<LanguagePair>(
    () => (locale ? LOCALE_TO_LANG_PAIR[locale] : FALLBACK_LANG_PAIR),
    [locale],
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale, t, clearLocale, isLoading, sourceLang, targetLang }),
    [locale, setLocale, t, clearLocale, isLoading, sourceLang, targetLang],
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
}

// Hook
export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
