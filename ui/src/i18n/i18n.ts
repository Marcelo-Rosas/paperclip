import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";

export const LOCALE_STORAGE_KEY = "paperclip.locale";

function detectInitialLocale(): string {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "pt-BR" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  if (typeof navigator !== "undefined") {
    const lang = navigator.language?.toLowerCase() ?? "";
    if (lang.startsWith("pt")) return "pt-BR";
  }
  return "pt-BR";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "pt-BR": { translation: ptBR },
  },
  lng: detectInitialLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

if (typeof document !== "undefined") {
  const lang = i18n.language === "pt-BR" ? "pt-BR" : "en";
  document.documentElement.lang = lang;
}
i18n.on("languageChanged", (lng) => {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lng === "pt-BR" ? "pt-BR" : "en";
});

export function setLocale(next: "pt-BR" | "en"): void {
  void i18n.changeLanguage(next);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next === "pt-BR" ? "pt-BR" : "en";
  }
}

export default i18n;
