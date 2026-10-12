import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, t as translate, getLanguages } from './translations';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  languages: { code: Language; name: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('hevy_language') as Language | null;
    if (savedLang) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('hevy_language', lang);
    // Update document lang attribute
    document.documentElement.lang = lang;
    // Update text direction for RTL languages
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  };

  const value: I18nContextType = {
    language,
    setLanguage,
    t: (key: string) => translate(key, language),
    languages: getLanguages(),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n debe ser usado dentro de I18nProvider');
  }
  return context;
}
