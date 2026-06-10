import { useState, useEffect } from "react";

export type AppLanguage = "sr" | "en" | "de" | "hu" | "sk" | "mk";

export function useLanguage() {
  const [language, setLanguageState] = useState<AppLanguage>("sr");

  useEffect(() => {
    const saved = localStorage.getItem("parkin-language");
    if (saved === "sr" || saved === "en" || saved === "de" || saved === "hu" || saved === "sk" || saved === "mk") {
      setLanguageState(saved as AppLanguage);
    }
  }, []);

  const setLanguage = (lang: AppLanguage) => {
    localStorage.setItem("parkin-language", lang);
    setLanguageState(lang);
  };

  return { language, setLanguage };
}
