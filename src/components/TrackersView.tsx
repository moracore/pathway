import { useState } from 'react';
import type { Tracker } from '../types';

function ConfirmDelete({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--clr-surface)', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--clr-text-primary)' }}>Delete "{label}"?</div>
        <div style={{ fontSize: 13, color: 'var(--clr-text-muted)' }}>This can't be undone.</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--clr-border)', background: 'var(--clr-surface-raised)', color: 'var(--clr-text-primary)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--clr-danger)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
import TrackerCalendar from './TrackerCalendar';
import { ShieldEllipsis, ChevronLeft, X, Flame, Lock, Delete, ShieldOff, ChevronRight } from 'lucide-react';

interface TrackersViewProps {
  trackers: Tracker[];
  onAddTracker: (name: string, color: string, keywords: string[], streakStretch: number, isAnti?: boolean) => void;
  onUpdateTracker?: (id: string, name: string, color: string, keywords: string[], streakStretch: number) => void;
  onDeleteTracker: (id: string) => void;
  onToggleDate: (trackerId: string, date: string) => void;
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeStreak(dates: string[], stretch: number, isAnti?: boolean, createdAt?: string): number {
  if (isAnti) {
    // Anti-tracker: streak = consecutive days going back from today with no failure,
    // capped at createdAt so pre-creation days don't count.
    const failedSet = new Set(dates);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const d = new Date(today);
    while (streak < 365) {
      const iso = toISO(d);
      if (createdAt && iso < createdAt) break;
      if (failedSet.has(iso)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  if (dates.length === 0) return 0;

  const sorted = [...dates].sort();
  const lastDate = new Date(sorted[sorted.length - 1]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffFromToday = (today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
  if (diffFromToday > stretch) return 0;

  let currentStreak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
     const curr = new Date(sorted[i]);
     const prev = new Date(sorted[i - 1]);
     const diff = (curr.getTime() - prev.getTime()) / (1000 * 3600 * 24);
     if (diff <= stretch) currentStreak++;
     else break;
  }
  return currentStreak;
}

let sessionUnlocked = false;

export default function TrackersView({ trackers, onAddTracker, onUpdateTracker, onDeleteTracker, onToggleDate }: TrackersViewProps) {
  const [activeTrackerId, setActiveTrackerId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const configuredPassword = localStorage.getItem('pathway-tracker-password');
  const [isUnlocked, setIsUnlocked] = useState(sessionUnlocked);
  const [passwordInput, setPasswordInput] = useState('');

  if (configuredPassword && !isUnlocked) {
    const handlePinClick = (key: number | 'del') => {
      if (key === 'del') {
         setPasswordInput(p => p.slice(0, -1));
      } else {
         if (passwordInput.length < 6) {
            const newPin = passwordInput + key;
            setPasswordInput(newPin);
            if (newPin.length === 6) {
               setTimeout(() => {
                  if (newPin === configuredPassword) {
                     sessionUnlocked = true;
                     setIsUnlocked(true);
                  } else {
                     alert('Incorrect PIN');
                     setPasswordInput('');
                  }
               }, 100);
            }
         }
      }
    };

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, userSelect: 'none' }}>
        <Lock size={64} style={{ marginBottom: 24, color: 'var(--clr-text-muted)', opacity: 0.5 }} />
        <h3 style={{ margin: '0 0 32px', color: 'var(--clr-text-primary)' }}>Enter PIN</h3>
        
        <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
           {Array.from({ length: 6 }).map((_, i) => (
             <div key={i} style={{ 
                width: 16, height: 16, borderRadius: '50%', 
                background: passwordInput.length > i ? 'var(--clr-base)' : 'transparent', 
                border: passwordInput.length > i ? 'none' : '2px solid var(--clr-border)',
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
                   onClick={() => handlePinClick(key as number | 'del')}
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
              )
           })}
        </div>
      </div>
    );
  }

  const activeTracker = trackers.find(t => t.id === activeTrackerId);

  if (activeTracker) {
    const activeStreak = computeStreak(activeTracker.completedDates, activeTracker.streakStretch ?? 7, activeTracker.isAnti, activeTracker.createdAt);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '12px', borderBottom: '1px solid var(--clr-border)', flexShrink: 0 }}>
          <button
            onClick={() => setActiveTrackerId(null)}
            style={{ background: 'var(--clr-surface-raised)', border: 'none', color: 'var(--clr-text-secondary)', cursor: 'pointer', display: 'flex', padding: 8, borderRadius: 8 }}
          >
            <ChevronLeft size={20} />
          </button>
          <input
            value={activeTracker.name}
            onChange={e => onUpdateTracker?.(activeTracker.id, e.target.value, activeTracker.color, activeTracker.keywords, activeTracker.streakStretch ?? 7)}
            style={{ fontSize: 18, fontWeight: 700, color: 'var(--clr-text-primary)', background: 'transparent', border: 'none', outline: 'none', flex: 1, minWidth: 0 }}
          />
          <span style={{ fontSize: 13, color: '#ff9f43', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <Flame size={14} /> {activeStreak}
          </span>
          <button
            onClick={() => setConfirmingDelete(true)}
            style={{ background: 'var(--clr-surface-raised)', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: 'var(--clr-danger)', display: 'flex', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
          {confirmingDelete && (
            <ConfirmDelete
              label={activeTracker.name}
              onConfirm={() => { onDeleteTracker(activeTracker.id); setActiveTrackerId(null); setConfirmingDelete(false); }}
              onCancel={() => setConfirmingDelete(false)}
            />
          )}
        </div>

        <TrackerCalendar
          color={activeTracker.color}
          completedDates={activeTracker.completedDates}
          onToggleDate={(date) => onToggleDate(activeTracker.id, date)}
          isAnti={activeTracker.isAnti}
          createdAt={activeTracker.createdAt}
          keywords={activeTracker.keywords}
          onUpdateKeywords={(kws) => onUpdateTracker?.(activeTracker.id, activeTracker.name, activeTracker.color, kws, activeTracker.streakStretch ?? 7)}
          streakStretch={activeTracker.streakStretch ?? 7}
          onUpdateStretch={(s) => onUpdateTracker?.(activeTracker.id, activeTracker.name, activeTracker.color, activeTracker.keywords, s)}
          onUpdateColor={(c) => onUpdateTracker?.(activeTracker.id, activeTracker.name, c, activeTracker.keywords, activeTracker.streakStretch ?? 7)}
        />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trackers.map(tracker => {
          const stretch = tracker.streakStretch ?? 7;
          const currentStreak = computeStreak(tracker.completedDates, stretch, tracker.isAnti, tracker.createdAt);
          const completedSet = new Set(tracker.completedDates);

          // Last 14 days for the mini strip
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const last14: { iso: string; done: boolean }[] = [];
          for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const iso = toISO(d);
            const inSet = completedSet.has(iso);
            const afterCreation = !tracker.isAnti || !tracker.createdAt || iso >= tracker.createdAt;
            const done = tracker.isAnti ? (!inSet && afterCreation) : inSet;
            last14.push({ iso, done });
          }

          return (
            <button
              key={tracker.id}
              onClick={() => setActiveTrackerId(tracker.id)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 10,
                background: 'var(--clr-surface)',
                border: `2px solid ${tracker.color}`,
                borderRadius: 14, padding: '14px 16px',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                color: 'var(--clr-text-primary)',
              }}
            >
              {/* Row: name + anti badge + streak + arrow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tracker.color, flexShrink: 0, boxShadow: `0 0 5px ${tracker.color}` }} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--clr-text-primary)' }}>{tracker.name}</span>
                {tracker.isAnti && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--clr-text-muted)', background: 'var(--clr-surface-raised)', padding: '2px 6px', borderRadius: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>anti</span>
                )}
                <span style={{ fontSize: 12, color: '#ff9f43', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Flame size={12} /> {currentStreak}
                </span>
                <ChevronRight size={14} style={{ color: 'var(--clr-text-muted)', flexShrink: 0 }} />
              </div>

              {/* Mini 2-week strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 3 }}>
                {last14.map(({ iso, done }) => (
                  <div
                    key={iso}
                    style={{
                      height: 8, borderRadius: 2,
                      background: done ? tracker.color : 'var(--clr-border)',
                      opacity: done ? 1 : 1,
                    }}
                  />
                ))}
              </div>
            </button>
          );
        })}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
          <button
            onClick={() => onAddTracker('New Tracker', '#009070', [], 7, false)}
            style={{ background: 'transparent', border: '2px dashed var(--clr-border)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', minHeight: 69, color: 'var(--clr-text-muted)', transition: 'background 0.2s', fontSize: 12 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--clr-surface-raised)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ShieldEllipsis size={22} /> Tracker
          </button>
          <button
            onClick={() => onAddTracker('New Anti-Tracker', '#cc133b', [], 7, true)}
            style={{ background: 'transparent', border: '2px dashed var(--clr-border)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', minHeight: 69, color: 'var(--clr-text-muted)', transition: 'background 0.2s', fontSize: 12 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--clr-surface-raised)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ShieldOff size={22} /> Anti-Tracker
          </button>
        </div>
      </div>
    </div>
  );
}
