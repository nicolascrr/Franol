'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import fr from '@/translations/fr.json';
import es from '@/translations/es.json';

// Types
export type Locale = 'fr' | 'es' | null;

type Translations = typeof fr;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  clearLocale: () => void;
}

// Traductions
const translations: Record<'fr' | 'es', Translations> = { fr, es };

// Contexte
const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// Provider
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(null);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  const clearLocale = useCallback(() => {
    setLocaleState(null);
  }, []);

  // Fonction de traduction
  const t = useCallback((key: string): string => {
    if (!locale) return key;
    
    const keys = key.split('.');
    let value: unknown = translations[locale];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // Retourne la clé si non trouvée
      }
    }
    
    return typeof value === 'string' ? value : key;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, clearLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

// Hook
export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
