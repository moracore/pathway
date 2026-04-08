import { useState, useEffect } from 'react';
import type { TabId } from '../types';

export interface AppSettings {
  accentColor: string;
  theme: 'dark' | 'light';
  navOrder: TabId[];
  navEnabled: Record<TabId, boolean>;
  resetHour: number;
}

const DEFAULTS: AppSettings = {
  accentColor: '#009070',
  theme: 'dark',
  navOrder: ['tasks', 'projects', 'calendar', 'groups', 'trackers'],
  navEnabled: { tasks: true, projects: true, calendar: true, groups: true, trackers: true },
  resetHour: 3,
};

// ── Colour derivation ──────────────────────────────────────────────────────

function hexToHSL(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round((l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))) * 255)
      .toString(16).padStart(2, '0');
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function applyAccent(hex: string) {
  const [h, s, l] = hexToHSL(hex);
  const root = document.documentElement;
  root.style.setProperty('--clr-base', hex);
  root.style.setProperty('--clr-base-light', hslToHex(h, Math.min(100, s + 5), Math.min(88, l + 14)));
  root.style.setProperty('--clr-base-dark', hslToHex(h, s, Math.max(5, l - 10)));
  root.style.setProperty('--clr-base-dim', hslToHex(h, Math.max(0, s - 15), Math.max(5, l - 8)));
  root.style.setProperty('--shadow-glow', `0 0 20px ${hex}40`);
}

export function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme);
}

// ── Hook ──────────────────────────────────────────────────────────────────

function load(): AppSettings {
  try {
    const raw = localStorage.getItem('pathway-settings');
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const navOrder = [...(parsed.navOrder ?? DEFAULTS.navOrder)];
    if (!navOrder.includes('projects')) {
      navOrder.splice(1, 0, 'projects');
    }

    return {
      accentColor: parsed.accentColor ?? DEFAULTS.accentColor,
      theme: parsed.theme ?? DEFAULTS.theme,
      navOrder,
      navEnabled: { ...DEFAULTS.navEnabled, ...(parsed.navEnabled ?? {}), projects: true },
      resetHour: parsed.resetHour ?? DEFAULTS.resetHour,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(load);

  // Apply on mount + whenever they change
  useEffect(() => { applyAccent(settings.accentColor); }, [settings.accentColor]);
  useEffect(() => { applyTheme(settings.theme); }, [settings.theme]);

  useEffect(() => {
    localStorage.setItem('pathway-settings', JSON.stringify(settings));
  }, [settings]);

  const updateAccent = (color: string) => setSettings(s => ({ ...s, accentColor: color }));
  const updateTheme = (theme: 'dark' | 'light') => setSettings(s => ({ ...s, theme }));
  const setNavEnabled = (id: TabId, enabled: boolean) =>
    setSettings(s => ({ ...s, navEnabled: { ...s.navEnabled, [id]: id === 'tasks' ? true : enabled } }));

  const moveTab = (id: TabId, dir: -1 | 1) =>
    setSettings(s => {
      const order = [...s.navOrder];
      const i = order.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= order.length) return s; 
      if (id === 'tasks') return s;
      if (order[j] === 'tasks') return s;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...s, navOrder: order };
    });

  const updateResetHour = (hour: number) => setSettings(s => ({ ...s, resetHour: hour }));

  // Visible tabs in order
  const visibleTabs = settings.navOrder.filter(id => settings.navEnabled[id]);

  return { 
    settings, visibleTabs, updateAccent, updateTheme, setNavEnabled, moveTab, updateResetHour
  };
}
