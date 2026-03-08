import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type ThemeName = "dark" | "light" | "woodland" | "axe";

const THEME_CYCLE: ThemeName[] = ["dark", "light", "woodland", "axe"];
const WOODLAND_ACCENT = "#56a882";
const DEFAULT_NAV_ORDER = ["today", "projects", "goals", "trackers"];

interface ThemeContextType {
  theme: ThemeName;
  accentColor: string;
  toggleTheme: () => void;
  setAccentColor: (color: string) => void;
  enableToday: boolean;
  enableGoals: boolean;
  enableTrackers: boolean;
  enableDone: boolean;
  setEnableToday: (v: boolean) => void;
  setEnableGoals: (v: boolean) => void;
  setEnableTrackers: (v: boolean) => void;
  setEnableDone: (v: boolean) => void;
  navOrder: string[];
  setNavOrder: (order: string[]) => void;
  resetHour: number;
  setResetHour: (h: number) => void;
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
  const [enableTrackers, setEnableTrackersState] = useState<boolean>(
    () => localStorage.getItem("pw-enable-trackers") !== "false"
  );
  const [enableDone, setEnableDoneState] = useState<boolean>(
    () => localStorage.getItem("pw-enable-done") !== "false"
  );
  const [navOrder, setNavOrderState] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("pw-nav-order");
      return stored ? JSON.parse(stored) : DEFAULT_NAV_ORDER;
    } catch {
      return DEFAULT_NAV_ORDER;
    }
  });
  const [resetHour, setResetHourState] = useState<number>(
    () => parseInt(localStorage.getItem("pw-reset-hour") ?? "4", 10)
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

  const setEnableTrackers = useCallback((v: boolean) => {
    localStorage.setItem("pw-enable-trackers", String(v));
    setEnableTrackersState(v);
  }, []);

  const setEnableDone = useCallback((v: boolean) => {
    localStorage.setItem("pw-enable-done", String(v));
    setEnableDoneState(v);
  }, []);

  const setNavOrder = useCallback((order: string[]) => {
    localStorage.setItem("pw-nav-order", JSON.stringify(order));
    setNavOrderState(order);
  }, []);

  const setResetHour = useCallback((h: number) => {
    localStorage.setItem("pw-reset-hour", String(h));
    setResetHourState(h);
  }, []);

  const setApiKey = useCallback((key: string) => {
    localStorage.setItem("pw-api-key", key);
    setApiKeyState(key);
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme, accentColor, toggleTheme, setAccentColor,
      enableToday, enableGoals, enableTrackers, enableDone,
      setEnableToday, setEnableGoals, setEnableTrackers, setEnableDone,
      navOrder, setNavOrder,
      resetHour, setResetHour,
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
