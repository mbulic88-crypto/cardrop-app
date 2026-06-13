import { useState, useEffect } from "react";

export type AppLanguage = "sr" | "en";

export function useLanguage() {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem("parkin-language");
      if (saved === "sr" || saved === "en") {
        return saved as AppLanguage;
      }
    } catch {}
    return "sr";
  });

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "parkin-language" && e.newValue) {
        const val = e.newValue;
        if (val === "sr" || val === "en") {
          setLanguageState(val as AppLanguage);
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setLanguage = (lang: AppLanguage) => {
    localStorage.setItem("parkin-language", lang);
    setLanguageState(lang);
  };

  return { language, setLanguage };
}
