import { X, Lock, ChevronUp, ChevronDown, Sun, Moon, Plus, Trash2 } from 'lucide-react';
import { useState, useRef } from 'react';
import type { TabId, RecurringTask } from '../types';
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

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function freqSummary(task: RecurringTask): string {
  if (!task.frequency || !task.startDate) return 'Tap to configure';
  if (task.frequency === 'daily') return 'Daily';
  if (task.frequency === 'interval' && task.interval) return `Every ${task.interval} days`;
  if (task.frequency === 'weekdays' && task.weekdays?.length) {
    return task.weekdays.map(d => WEEKDAY_LABELS[d]).join(' · ');
  }
  return 'Tap to configure';
}

interface SettingsPanelProps {
  settings: AppSettings;
  onClose: () => void;
  onAccentChange: (color: string) => void;
  onThemeChange: (theme: 'dark' | 'light') => void;
  onNavEnabledChange: (id: TabId, enabled: boolean) => void;
  onMoveTab: (id: TabId, dir: -1 | 1) => void;
  onUpdateResetHour: (hour: number) => void;
  onAddRecurringTask: (text: string, size: 1 | 2 | 3 | 4 | 5) => void;
  onUpdateRecurringTask: (id: string, updates: Partial<Omit<RecurringTask, 'id'>>) => void;
  onDeleteRecurringTask: (id: string) => void;
}

export default function SettingsPanel({
  settings, onClose, onAccentChange, onThemeChange, onNavEnabledChange, onMoveTab, onUpdateResetHour,
  onAddRecurringTask, onUpdateRecurringTask, onDeleteRecurringTask,
}: SettingsPanelProps) {
  const { accentColor, theme, navOrder, navEnabled } = settings;
  const [newTaskText, setNewTaskText] = useState('');

  // Recurring task config modal
  const [configTask, setConfigTask] = useState<RecurringTask | null>(null);
  const [editFreq, setEditFreq] = useState<'daily' | 'interval' | 'weekdays'>('daily');
  const [editInterval, setEditInterval] = useState(2);
  const [editWeekdays, setEditWeekdays] = useState<number[]>([]);
  const [editStartDate, setEditStartDate] = useState('');

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  function openConfig(task: RecurringTask) {
    setEditFreq(task.frequency ?? 'daily');
    setEditInterval(task.interval ?? 2);
    setEditWeekdays(task.weekdays ?? []);
    setEditStartDate(task.startDate ?? new Date().toISOString().slice(0, 10));
    setConfigTask(task);
  }

  function startLongPress(task: RecurringTask) {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      openConfig(task);
    }, 600);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function saveConfig() {
    if (!configTask) return;
    onUpdateRecurringTask(configTask.id, {
      frequency: editFreq,
      interval: editFreq === 'interval' ? editInterval : undefined,
      weekdays: editFreq === 'weekdays' ? editWeekdays : undefined,
      startDate: editStartDate || undefined,
    });
    setConfigTask(null);
  }

  function toggleWeekday(d: number) {
    setEditWeekdays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--clr-surface)', display: 'flex', flexDirection: 'column' }}>

      {/* Header — stays put */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 16px', borderBottom: '1px solid var(--clr-border)', flexShrink: 0, background: 'var(--clr-surface)' }}>
        <span style={{ flex: 1, fontSize: 18, fontWeight: 700, color: 'var(--clr-text-primary)' }}>Settings</span>
        <button onClick={onClose} style={{ background: 'var(--clr-surface-raised)', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: 'var(--clr-text-secondary)', display: 'flex' }}>
          <X size={18} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ── Appearance ── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Appearance</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--clr-text-primary)', fontWeight: 500 }}>Theme</span>
              <button
                onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--clr-surface-raised)', border: '1px solid var(--clr-border)', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', color: 'var(--clr-text-primary)', fontSize: 13, fontWeight: 600 }}
              >
                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 14, color: 'var(--clr-text-primary)', fontWeight: 500 }}>Accent colour</span>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {ACCENT_PRESETS.map(p => (
                  <button key={p.color} title={p.label} onClick={() => onAccentChange(p.color)}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: p.color, border: 'none', cursor: 'pointer', flexShrink: 0, boxShadow: accentColor === p.color ? `0 0 0 3px var(--clr-surface), 0 0 0 5px ${p.color}` : 'none', transition: 'box-shadow 0.15s' }}
                  />
                ))}
                <label title="Custom colour" style={{ position: 'relative', width: 30, height: 30, cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', border: '2px solid var(--clr-border)', boxShadow: !ACCENT_PRESETS.find(p => p.color === accentColor) ? `0 0 0 3px var(--clr-surface), 0 0 0 5px ${accentColor}` : 'none' }} />
                  <input type="color" value={accentColor} onChange={e => onAccentChange(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
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
                  {settings.resetHour === 0 ? 'Midnight' : (settings.resetHour === 12 ? '12 PM' : (settings.resetHour < 12 ? `${settings.resetHour} AM` : `${settings.resetHour - 12} PM`))}
                </span>
              </div>
              <input type="range" min="0" max="6" step="1" value={settings.resetHour} onChange={e => onUpdateResetHour(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--clr-base)' }} />
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
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--clr-surface-raised)', borderRadius: 12, padding: '12px 14px', opacity: !enabled && !isLocked ? 0.5 : 1 }}>
                    <Icon size={16} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--clr-text-primary)' }}>{label}</span>
                    {isLocked
                      ? <Lock size={14} style={{ color: 'var(--clr-text-muted)' }} />
                      : (
                        <button onClick={() => onNavEnabledChange(id, !enabled)}
                          style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: enabled ? 'var(--clr-base)' : 'var(--clr-border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: 3, left: enabled ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </button>
                      )
                    }
                    {!isLocked && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <button onClick={() => onMoveTab(id, -1)} disabled={idx <= 1}
                          style={{ background: 'none', border: 'none', padding: 2, cursor: idx <= 1 ? 'default' : 'pointer', color: idx <= 1 ? 'var(--clr-border)' : 'var(--clr-text-muted)', display: 'flex' }}>
                          <ChevronUp size={14} />
                        </button>
                        <button onClick={() => onMoveTab(id, 1)} disabled={idx >= navOrder.length - 1}
                          style={{ background: 'none', border: 'none', padding: 2, cursor: idx >= navOrder.length - 1 ? 'default' : 'pointer', color: idx >= navOrder.length - 1 ? 'var(--clr-border)' : 'var(--clr-text-muted)', display: 'flex' }}>
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Recurring Tasks ── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Recurring Tasks</div>
            <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', lineHeight: 1.4, margin: 0 }}>
              Tap a task to set its schedule. Hold to edit. Deleting stops recurrence but keeps past logs.
            </p>

            {settings.recurringTasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {settings.recurringTasks.map(task => (
                  <div
                    key={task.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--clr-surface-raised)', borderRadius: 12, padding: '10px 12px', userSelect: 'none' }}
                  >
                    {/* Tap / long-press zone */}
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                      onPointerDown={() => startLongPress(task)}
                      onPointerUp={() => { cancelLongPress(); }}
                      onPointerLeave={cancelLongPress}
                      onPointerCancel={cancelLongPress}
                      onClick={() => { if (!longPressFired.current) openConfig(task); }}
                    >
                      <div style={{ fontSize: 14, color: 'var(--clr-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.text}</div>
                      <div style={{ fontSize: 11, color: task.frequency && task.startDate ? 'var(--clr-base)' : 'var(--clr-text-muted)', marginTop: 2 }}>{freqSummary(task)}</div>
                    </div>

                    {/* Size dots */}
                    <div className="size-dots">
                      {([1, 2, 3, 4, 5] as const).map(s => (
                        <button key={s} className={`size-dot${task.size >= s ? ' active' : ''}`} style={{ width: 6 + s * 3, height: 6 + s * 3 }} onClick={() => onUpdateRecurringTask(task.id, { size: s })} />
                      ))}
                    </div>

                    <button onClick={() => onDeleteRecurringTask(task.id)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--clr-text-muted)', display: 'flex', flexShrink: 0 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new */}
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newTaskText.trim()) {
                    onAddRecurringTask(newTaskText.trim(), 3);
                    setNewTaskText('');
                  }
                }}
                placeholder="Task name..."
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--clr-border)', background: 'var(--clr-surface-raised)', color: 'var(--clr-text-primary)', fontSize: 14, outline: 'none' }}
              />
              <button
                onClick={() => {
                  if (newTaskText.trim()) {
                    onAddRecurringTask(newTaskText.trim(), 3);
                    setNewTaskText('');
                  }
                }}
                disabled={!newTaskText.trim()}
                style={{ background: newTaskText.trim() ? 'var(--clr-base)' : 'var(--clr-surface-raised)', border: 'none', borderRadius: 10, padding: '10px 14px', cursor: newTaskText.trim() ? 'pointer' : 'default', color: newTaskText.trim() ? '#fff' : 'var(--clr-text-muted)', display: 'flex', alignItems: 'center' }}
              >
                <Plus size={18} />
              </button>
            </div>
          </section>

        </div>
      </div>

      {/* ── Recurring task config modal ── */}
      {configTask && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 600, background: 'var(--clr-surface)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 16px', borderBottom: '1px solid var(--clr-border)', flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--clr-text-primary)' }}>{configTask.text}</h3>
              <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Schedule</span>
            </div>
            <button onClick={() => setConfigTask(null)} style={{ background: 'var(--clr-surface-raised)', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: 'var(--clr-text-secondary)', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Frequency type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-primary)' }}>How often</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['daily', 'interval', 'weekdays'] as const).map(f => (
                  <button key={f} onClick={() => setEditFreq(f)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${editFreq === f ? 'var(--clr-base)' : 'var(--clr-border)'}`, background: editFreq === f ? 'var(--clr-base)15' : 'var(--clr-surface-raised)', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${editFreq === f ? 'var(--clr-base)' : 'var(--clr-border)'}`, background: editFreq === f ? 'var(--clr-base)' : 'transparent', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--clr-text-primary)' }}>
                      {f === 'daily' ? 'Every day' : f === 'interval' ? 'Every N days' : 'Specific days of the week'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interval input */}
            {editFreq === 'interval' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-primary)' }}>Repeat every</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setEditInterval(n => Math.max(2, n - 1))}
                    style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--clr-border)', background: 'var(--clr-surface-raised)', cursor: 'pointer', fontSize: 20, color: 'var(--clr-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--clr-base)', minWidth: 40, textAlign: 'center' }}>{editInterval}</span>
                  <button onClick={() => setEditInterval(n => n + 1)}
                    style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--clr-border)', background: 'var(--clr-surface-raised)', cursor: 'pointer', fontSize: 20, color: 'var(--clr-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  <span style={{ fontSize: 14, color: 'var(--clr-text-muted)' }}>days</span>
                </div>
              </div>
            )}

            {/* Weekday picker */}
            {editFreq === 'weekdays' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-primary)' }}>On these days</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {WEEKDAY_LABELS.map((label, i) => (
                    <button key={i} onClick={() => toggleWeekday(i)}
                      style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                        background: editWeekdays.includes(i) ? 'var(--clr-base)' : 'var(--clr-surface-raised)',
                        color: editWeekdays.includes(i) ? '#fff' : 'var(--clr-text-muted)',
                        transition: 'all 0.15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-primary)' }}>Starting from</span>
              <input
                type="date"
                value={editStartDate}
                onChange={e => setEditStartDate(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--clr-border)', background: 'var(--clr-surface-raised)', color: 'var(--clr-text-primary)', fontSize: 14, outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--clr-border)', display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={() => setConfigTask(null)}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--clr-border)', background: 'var(--clr-surface-raised)', color: 'var(--clr-text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={saveConfig}
              disabled={editFreq === 'weekdays' && editWeekdays.length === 0}
              style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: (editFreq === 'weekdays' && editWeekdays.length === 0) ? 'var(--clr-surface-raised)' : 'var(--clr-base)', color: (editFreq === 'weekdays' && editWeekdays.length === 0) ? 'var(--clr-text-muted)' : '#fff', fontSize: 14, fontWeight: 700, cursor: (editFreq === 'weekdays' && editWeekdays.length === 0) ? 'default' : 'pointer' }}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
