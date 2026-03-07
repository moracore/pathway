import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type ThemeName = "dark" | "light" | "woodland" | "axe";

const THEME_CYCLE: ThemeName[] = ["dark", "light", "woodland", "axe"];
const WOODLAND_ACCENT = "#56a882";

interface ThemeContextType {
  theme: ThemeName;
  accentColor: string;
  toggleTheme: () => void;
  setAccentColor: (color: string) => void;
  enableToday: boolean;
  enableGoals: boolean;
  setEnableToday: (v: boolean) => void;
  setEnableGoals: (v: boolean) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(
    () => (localStorage.getItem("pw-theme") as ThemeName) ?? "dark"
  );
  const [accentColor, setAccentColorState] = useState<string>(
    () => localStorage.getItem("pw-accent") ?? "#6366f1"
  );
  const [enableToday, setEnableTodayState] = useState<boolean>(
    () => localStorage.getItem("pw-enable-today") === "true"
  );
  const [enableGoals, setEnableGoalsState] = useState<boolean>(
    () => localStorage.getItem("pw-enable-goals") === "true"
  );
  const [apiKey, setApiKeyState] = useState<string>(
    () => localStorage.getItem("pw-api-key") ?? ""
  );

  const applyTheme = useCallback((t: ThemeName, accent: string) => {
    const root = document.documentElement;
    if (t === "dark") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
    const effectiveAccent = t === "woodland" ? WOODLAND_ACCENT : accent;
    root.style.setProperty("--accent", effectiveAccent);
    const hex = effectiveAccent.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    root.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
  }, []);

  useEffect(() => { applyTheme(theme, accentColor); }, [theme, accentColor, applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = THEME_CYCLE[(THEME_CYCLE.indexOf(prev) + 1) % THEME_CYCLE.length];
      localStorage.setItem("pw-theme", next);
      return next;
    });
  }, []);

  const setAccentColor = useCallback((color: string) => {
    localStorage.setItem("pw-accent", color);
    setAccentColorState(color);
  }, []);

  const setEnableToday = useCallback((v: boolean) => {
    localStorage.setItem("pw-enable-today", String(v));
    setEnableTodayState(v);
  }, []);

  const setEnableGoals = useCallback((v: boolean) => {
    localStorage.setItem("pw-enable-goals", String(v));
    setEnableGoalsState(v);
  }, []);

  const setApiKey = useCallback((key: string) => {
    localStorage.setItem("pw-api-key", key);
    setApiKeyState(key);
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme, accentColor, toggleTheme, setAccentColor,
      enableToday, enableGoals, setEnableToday, setEnableGoals,
      apiKey, setApiKey,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
