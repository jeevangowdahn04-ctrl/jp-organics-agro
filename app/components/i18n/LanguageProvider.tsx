"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_LANG, Lang, TranslationKey, translate } from "@/lib/i18n";

// ಆಯ್ಕೆ ಮಾಡಿದ ಭಾಷೆ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಉಳಿಯುತ್ತದೆ (refresh / ಬೇರೆ ಪೇಜ್‌ಗೆ ಹೋದರೂ)
const STORAGE_KEY = "jp-organics-lang";
let current: Lang | undefined;
const listeners = new Set<() => void>();

function readStored(): Lang {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "en" || v === "kn" ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function getSnapshot(): Lang {
  if (current === undefined) current = readStored();
  return current;
}

function setStoredLang(lang: Lang) {
  current = lang;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // storage ತಡೆ: ಈ ಪೇಜ್‌ನಲ್ಲಿ ಮಾತ್ರ ಭಾಷೆ ಬದಲಾಗುತ್ತದೆ
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      current = readStored();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_LANG);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback<LanguageContextValue["t"]>((key, vars) => translate(lang, key, vars), [lang]);
  const value = useMemo(() => ({ lang, setLang: setStoredLang, t }), [lang, t]);

  return <LanguageContext value={value}>{children}</LanguageContext>;
}

// ಪ್ರತಿ ಕಾಂಪೊನೆಂಟ್ ಭಾಷೆಯನ್ನು ತಾನೇ ಓದುತ್ತದೆ (context ಮೂಲಕವಲ್ಲ):
// hydration ಸಮಯದಲ್ಲಿ React ಮೊದಲು ಸರ್ವರ್‌ನ ಭಾಷೆಯಲ್ಲಿ (ಕನ್ನಡ) ತೋರಿಸಿ ನಂತರ ಉಳಿಸಿದ ಭಾಷೆಗೆ ಬದಲಾಯಿಸುತ್ತದೆ.
// Suspense ಒಳಗೆ ತಡವಾಗಿ hydrate ಆಗುವ ಭಾಗಗಳಿಗೂ (ಕೆಳಗಿನ ಬಾರ್, ಪ್ರಾಡಕ್ಟ್ ಪುಟ) ಇದು ಪ್ರತ್ಯೇಕವಾಗಿ ನಡೆಯುವುದರಿಂದ
// ಸರ್ವರ್ HTML ಜೊತೆ ಹೊಂದಿಕೆ ತಪ್ಪುವುದಿಲ್ಲ (English ಆಯ್ಕೆ ಮಾಡಿದಾಗ ಬರುತ್ತಿದ್ದ hydration ದೋಷ).
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  const lang = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_LANG);
  const t = useCallback<LanguageContextValue["t"]>((key, vars) => translate(lang, key, vars), [lang]);
  return useMemo(() => ({ lang, setLang: setStoredLang, t }), [lang, t]);
}
