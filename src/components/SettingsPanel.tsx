import { X, Lock, ChevronUp, ChevronDown, Sun, Moon } from 'lucide-react';
import type { TabId } from '../types';
import type { AppSettings } from '../hooks/useSettings';
import { Rotate3D, Album, CalendarDays, Palette, ShieldEllipsis } from 'lucide-react';

const ACCENT_PRESETS = [
  { label: 'Green',  color: '#009070' },
  { label: 'Blue',   color: '#0ea5e9' },
  { label: 'Purple', color: '#5f26c2' },
  { label: 'Red',    color: '#cc133b' },
  { label: 'Orange', color: '#f87204' },
];

const TAB_META: Record<TabId, { label: string; Icon: React.ComponentType<{ size?: number }> }> = {
  tasks:    { label: 'Tasks',    Icon: Rotate3D },
  projects: { label: 'Projects', Icon: Album },
  calendar: { label: 'Calendar', Icon: CalendarDays },
  groups:   { label: 'Groups',   Icon: Palette },
  trackers: { label: 'Trackers', Icon: ShieldEllipsis },
};

interface SettingsPanelProps {
  settings: AppSettings;
  onClose: () => void;
  onAccentChange: (color: string) => void;
  onThemeChange: (theme: 'dark' | 'light') => void;
  onNavEnabledChange: (id: TabId, enabled: boolean) => void;
  onMoveTab: (id: TabId, dir: -1 | 1) => void;
  onUpdateResetHour: (hour: number) => void;
}

export default function SettingsPanel({
  settings, onClose, onAccentChange, onThemeChange, onNavEnabledChange, onMoveTab, onUpdateResetHour
}: SettingsPanelProps) {
  const { accentColor, theme, navOrder, navEnabled } = settings;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--clr-surface)', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{
        width: '100%',
        height: '100%',
        margin: '0 auto',
        background: 'var(--clr-surface)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 16px', borderBottom: '1px solid var(--clr-border)', flexShrink: 0 }}>
          <span style={{ flex: 1, fontSize: 18, fontWeight: 700, color: 'var(--clr-text-primary)' }}>Settings</span>
          <button onClick={onClose} style={{ background: 'var(--clr-surface-raised)', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: 'var(--clr-text-secondary)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ── Appearance ── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Appearance</div>

            {/* Theme toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--clr-text-primary)', fontWeight: 500 }}>Theme</span>
              <button
                onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--clr-surface-raised)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 20, padding: '6px 14px',
                  cursor: 'pointer', color: 'var(--clr-text-primary)', fontSize: 13, fontWeight: 600,
                }}
              >
                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>

            {/* Accent colour */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 14, color: 'var(--clr-text-primary)', fontWeight: 500 }}>Accent colour</span>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {ACCENT_PRESETS.map(p => (
                  <button
                    key={p.color}
                    title={p.label}
                    onClick={() => onAccentChange(p.color)}
                    style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: p.color, border: 'none', cursor: 'pointer', flexShrink: 0,
                      boxShadow: accentColor === p.color ? `0 0 0 3px var(--clr-surface), 0 0 0 5px ${p.color}` : 'none',
                      transition: 'box-shadow 0.15s',
                    }}
                  />
                ))}
                <label title="Custom colour" style={{ position: 'relative', width: 30, height: 30, cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: `conic-gradient(red, yellow, lime, cyan, blue, magenta, red)`,
                    border: '2px solid var(--clr-border)',
                    boxShadow: !ACCENT_PRESETS.find(p => p.color === accentColor)
                      ? `0 0 0 3px var(--clr-surface), 0 0 0 5px ${accentColor}`
                      : 'none',
                  }} />
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => onAccentChange(e.target.value)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  />
                </label>
              </div>
            </div>
          </section>

          {/* ── Schedule ── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Schedule</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--clr-text-primary)' }}>Daily Reset Time</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--clr-base)' }}>
                  {settings.resetHour === 0 ? 'Midnight' : (settings.resetHour === 12 ? '12 PM' : (settings.resetHour < 12 ? `${settings.resetHour} AM` : `${settings.resetHour-12} PM`))}
                </span>
              </div>
              <input 
                type="range"
                min="0"
                max="6"
                step="1"
                value={settings.resetHour}
                onChange={e => onUpdateResetHour(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--clr-base)' }}
              />
              <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', lineHeight: 1.4 }}>
                Uncompleted daily tasks are cleared (and project tasks returned) at this time every day.
              </p>
            </div>
          </section>

          {/* ── Navigation ── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Navigation</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {navOrder.map((id, idx) => {
                const { label, Icon } = TAB_META[id];
                const isLocked = id === 'tasks';
                const enabled = navEnabled[id];

                return (
                  <div key={id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--clr-surface-raised)', borderRadius: 12,
                    padding: '12px 14px',
                    opacity: !enabled && !isLocked ? 0.5 : 1,
                  }}>
                    <Icon size={16} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--clr-text-primary)' }}>{label}</span>

                    {isLocked
                      ? <Lock size={14} style={{ color: 'var(--clr-text-muted)' }} />
                      : (
                        // Toggle switch
                        <button
                          onClick={() => onNavEnabledChange(id, !enabled)}
                          style={{
                            width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                            background: enabled ? 'var(--clr-base)' : 'var(--clr-border)',
                            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                          }}
                        >
                          <div style={{
                            position: 'absolute', top: 3, left: enabled ? 21 : 3,
                            width: 16, height: 16, borderRadius: '50%', background: '#fff',
                            transition: 'left 0.2s',
                          }} />
                        </button>
                      )
                    }

                    {/* Reorder arrows */}
                    {!isLocked && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <button
                          onClick={() => onMoveTab(id, -1)}
                          disabled={idx <= 1}
                          style={{ background: 'none', border: 'none', padding: 2, cursor: idx <= 1 ? 'default' : 'pointer', color: idx <= 1 ? 'var(--clr-border)' : 'var(--clr-text-muted)', display: 'flex' }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => onMoveTab(id, 1)}
                          disabled={idx >= navOrder.length - 1}
                          style={{ background: 'none', border: 'none', padding: 2, cursor: idx >= navOrder.length - 1 ? 'default' : 'pointer', color: idx >= navOrder.length - 1 ? 'var(--clr-border)' : 'var(--clr-text-muted)', display: 'flex' }}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
