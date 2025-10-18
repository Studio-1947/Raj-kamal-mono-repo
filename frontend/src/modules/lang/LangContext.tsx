import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Language = "en" | "hi";

const STORAGE_KEY = "rk_lang";

const translations = {
  en: {
    home: "Home",
    dashboard: "Dashboard",
    sales: "Sales",
    geo_insights: "Geo Insights",
    rankings: "Rankings",
    social_media: "Social Media",
    settings: "Settings",
    language: "Language",
    collapse: "Collapse",
    expand: "Expand",

    coming_soon: "Coming soon.",
    welcome: "Welcome",
    welcome_subtitle: "To Raj-Kamal.",
    dashboard_title: "Dashboard",
    dashboard_subtitle: "Quick overview of key metrics.",
    total_sales: "Total Sales",
    orders: "Orders",
    customers: "Customers",
    refunds: "Refunds",
    from_last_week: "from last week",
    auth_token: "Auth Token",

    not_found_title: "Page not found.",
    go_home: "Go home",

    select_language: "Select Language",
    english: "English",
    hindi: "Hindi",
    current_language: "Current language",
  },
  hi: {
    home: "होम",
    dashboard: "डैशबोर्ड",
    sales: "बिक्री",
    geo_insights: "भू अंतर्दृष्टि",
    rankings: "रैंकिंग",
    social_media: "सोशल मीडिया",
    settings: "सेटिंग्स",
    language: "भाषा",
    collapse: "छिपाएँ",
    expand: "खोलें",

    coming_soon: "जल्द आ रहा है।",
    welcome: "स्वागत है",
    welcome_subtitle: "राज-कमल में।",
    dashboard_title: "डैशबोर्ड",
    dashboard_subtitle: "मुख्य मीट्रिक का त्वरित अवलोकन।",
    total_sales: "कुल बिक्री",
    orders: "ऑर्डर",
    customers: "ग्राहक",
    refunds: "रिफंड",
    from_last_week: "पिछले सप्ताह से",
    auth_token: "प्रमाणीकरण टोकन",

    not_found_title: "पृष्ठ नहीं मिला।",
    go_home: "मुख्य पृष्ठ पर जाएँ",

    select_language: "भाषा चुनें",
    english: "अंग्रेज़ी",
    hindi: "हिन्दी",
    current_language: "वर्तमान भाषा",
  },
} as const;

type TranslationKeys = keyof (typeof translations)["en"];

export type LangContextValue = {
  lang: Language;
  setLang: (l: Language) => void;
  toggle: () => void;
  t: (key: TranslationKeys) => string;
};

const LangContext = createContext<LangContextValue | undefined>(undefined);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved =
      (localStorage.getItem(STORAGE_KEY) as Language | null) || "en";
    setLangState(saved);
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      toggle: () => setLang(lang === "en" ? "hi" : "en"),
      t: (key: TranslationKeys) => translations[lang][key] ?? key,
    }),
    [lang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
