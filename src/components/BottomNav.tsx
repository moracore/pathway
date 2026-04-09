import { useState } from 'react';
import { Rotate3D, Album, CalendarDays, Palette, ShieldEllipsis, Lock, Delete, Check, X } from 'lucide-react';
import type { TabId } from '../types';

interface BottomNavProps {
  activeTab: TabId;
  visibleTabs: TabId[];
  onTabChange: (tab: TabId) => void;
}

const ALL_TABS = [
  { id: 'tasks',    icon: Rotate3D,       label: 'Tasks' },
  { id: 'projects', icon: Album,          label: 'Projects' },
  { id: 'calendar', icon: CalendarDays,   label: 'Calendar' },
  { id: 'groups',   icon: Palette,        label: 'Groups' },
  { id: 'trackers', icon: ShieldEllipsis, label: 'Trackers' },
] as const;

export default function BottomNav({ activeTab, visibleTabs, onTabChange }: BottomNavProps) {
  const [trackerTaps, setTrackerTaps] = useState({ count: 0, last: 0 });
  const [calendarTaps, setCalendarTaps] = useState({ count: 0, last: 0 });
  const [configTarget, setConfigTarget] = useState<'tracker' | 'calendar' | null>(null);
  const [configPin, setConfigPin] = useState('');

  // Hide nav entirely if only tasks is visible
  if (visibleTabs.length <= 1) return null;

  const openConfig = (target: 'tracker' | 'calendar') => {
    const key = target === 'tracker' ? 'pathway-tracker-password' : 'pathway-calendar-password';
    setConfigPin(localStorage.getItem(key) || '');
    setConfigTarget(target);
  };

  const handleConfigPinClick = (key: number | 'del') => {
    if (key === 'del') {
      setConfigPin(p => p.slice(0, -1));
    } else {
      if (configPin.length < 6) setConfigPin(p => p + key);
    }
  };

  const saveConfigPin = () => {
    const storageKey = configTarget === 'tracker' ? 'pathway-tracker-password' : 'pathway-calendar-password';
    const pin = configPin.replace(/\D/g, '').slice(0, 6);
    if (pin.length === 6) {
      localStorage.setItem(storageKey, pin);
    } else {
      localStorage.removeItem(storageKey);
    }
    setConfigTarget(null);
    setConfigPin('');
  };

  const handleTabClick = (tabId: TabId) => {
    const tapTargets: Record<string, { state: typeof trackerTaps; setter: typeof setTrackerTaps; target: 'tracker' | 'calendar' }> = {
      trackers: { state: trackerTaps, setter: setTrackerTaps, target: 'tracker' },
      calendar: { state: calendarTaps, setter: setCalendarTaps, target: 'calendar' },
    };

    const tap = tapTargets[tabId];
    if (tap) {
      const now = Date.now();
      if (now - tap.state.last < 500) {
        const next = tap.state.count + 1;
        if (next >= 15) {
          openConfig(tap.target);
          tap.setter({ count: 0, last: 0 });
        } else {
          tap.setter({ count: next, last: now });
        }
      } else {
        tap.setter({ count: 1, last: now });
      }
    }
    onTabChange(tabId);
  };

  const tabs = ALL_TABS.filter(t => visibleTabs.includes(t.id as TabId));

  return (
    <>
      <nav className="bottom-nav" id="bottom-nav">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`nav-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => handleTabClick(tab.id as TabId)}
              id={`nav-${tab.id}`}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {configTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'var(--clr-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
          <Lock size={48} style={{ marginBottom: 16, color: 'var(--clr-text-muted)', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--clr-text-primary)', fontSize: 18 }}>
            {configTarget === 'tracker' ? 'Tracker' : 'Calendar'} PIN
          </h3>
          <p style={{ margin: '0 0 32px', color: 'var(--clr-text-muted)', fontSize: 13 }}>
            Enter 6 digits to set, or leave empty to remove
          </p>

          <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: '50%',
                background: configPin.length > i ? 'var(--clr-base)' : 'transparent',
                border: configPin.length > i ? 'none' : '2px solid var(--clr-border)',
                transition: 'all 0.2s'
              }} />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => {
              if (key === null) return <div key={`empty-${i}`} />;
              return (
                <button
                  key={i}
                  onClick={() => handleConfigPinClick(key as number | 'del')}
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
                    fontSize: 24, fontWeight: 700, color: 'var(--clr-text-primary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}
                >
                  {key === 'del' ? <Delete size={24} color="var(--clr-text-secondary)" /> : key}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button
              onClick={() => { setConfigTarget(null); setConfigPin(''); }}
              style={{ background: 'var(--clr-surface-raised)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '10px 24px', cursor: 'pointer', color: 'var(--clr-text-secondary)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <X size={16} /> Cancel
            </button>
            <button
              onClick={saveConfigPin}
              style={{ background: 'var(--clr-base)', border: 'none', borderRadius: 12, padding: '10px 24px', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Check size={16} /> {configPin.length === 6 ? 'Save' : 'Remove PIN'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
