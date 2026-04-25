import React, { createContext, useContext, useState } from 'react';
import translations from '../i18n';

const LangContext = createContext();

export function LangProvider({ children }) {
  const stored = localStorage.getItem('wiki_lang') || 'en';
  const [lang, setLang] = useState(stored);

  const switchLang = (l) => {
    setLang(l);
    localStorage.setItem('wiki_lang', l);
  };

  const t = translations[lang];

  return (
    <LangContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
