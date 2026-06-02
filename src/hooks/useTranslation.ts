'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Language,
  loadTranslations,
  detectLanguageFromBrowser,
  detectLanguageFromCountry,
  LANGUAGE_DIRECTION,
  LANGUAGE_NAMES
} from '@/lib/i18n';

interface UseTranslationReturn {
  t: (key: string, params?: Record<string, string>) => string;
  lang: Language;
  setLang: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
  langName: string;
  isLoading: boolean;
}

// Store for translations
let translations: Record<string, string> = {};
let currentLang: Language = 'fr';

export function useTranslation(): UseTranslationReturn {
  const [lang, setLangState] = useState<Language>('fr');
  const [isLoading, setIsLoading] = useState(true);

  // Detect language on mount
  useEffect(() => {
    const detectLanguage = async () => {
      // 1. Check localStorage first for explicit user preference
      if (typeof localStorage !== 'undefined') {
        const savedLang = localStorage.getItem('smartickets_lang') as Language | null;
        if (savedLang && ['fr', 'en', 'ar'].includes(savedLang)) {
          setLangState(savedLang);
          return;
        }
      }

      // 2. Check server-set cookie (smartickets_locale) — set by /api/scan GET route
      if (typeof document !== 'undefined') {
        const cookieMatch = document.cookie.match(/smartickets_locale=(fr|en|ar)/);
        if (cookieMatch?.[1]) {
          const cookieLang = cookieMatch[1] as Language;
          setLangState(cookieLang);
          // Sync to localStorage for persistence across sessions
          localStorage.setItem('smartickets_lang', cookieLang);
          return;
        }
      }

      // 3. Try IP-based country detection
      try {
        const response = await fetch('/api/detect-country');
        if (response.ok) {
          const data = await response.json();
          if (data.countryCode) {
            const detectedLang = detectLanguageFromCountry(data.countryCode);
            setLangState(detectedLang);
            return;
          }
        }
      } catch {
        // IP detection failed, falling back to browser detection
      }

      // 4. Fallback to browser language
      const browserLang = detectLanguageFromBrowser();
      setLangState(browserLang);
    };

    detectLanguage();
  }, []);

  // Load translations when language changes
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      translations = await loadTranslations(lang);
      currentLang = lang;

      // Set HTML lang attribute
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
        document.documentElement.dir = LANGUAGE_DIRECTION[lang];
      }

      setIsLoading(false);
    };

    load();
  }, [lang]);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string>): string => {
    let text = translations[key] || key;

    // Replace parameters
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), params[paramKey]);
      });
    }

    return text;
  }, [lang, isLoading]);

  // Set language
  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartickets_lang', newLang);
    }
  }, []);

  return {
    t,
    lang,
    setLang,
    dir: LANGUAGE_DIRECTION[lang],
    langName: LANGUAGE_NAMES[lang],
    isLoading
  };
}

// Simple translation function for non-hook usage
export function t(key: string, params?: Record<string, string>): string {
  let text = translations[key] || key;

  if (params) {
    Object.keys(params).forEach((paramKey) => {
      text = text.replace(new RegExp(`{${paramKey}}`, 'g'), params[paramKey]);
    });
  }

  return text;
}

export { LANGUAGE_NAMES, LANGUAGE_DIRECTION };
export type { Language };
