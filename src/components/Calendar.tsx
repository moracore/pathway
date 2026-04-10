import { useEffect, useRef, useCallback, useState } from 'react';
import type { Planet, FutureTask } from '../types';
import { stepSimulation } from '../engine/physics';
import { Lock, Delete, X, Plus } from 'lucide-react';

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function monthName(month: number): string {
  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ][month];
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface WeekRow {
  monday: Date;
  days: { date: string; dayNum: number; monthNum: number; isFuture: boolean; isToday: boolean }[];
  monthLabel: string | null;
}

function buildWeekRows(weeksBack: number, weeksForward: number, resetHour: number): WeekRow[] {
  // "Today" should follow the configured reset hour, not real midnight.
  // Before the reset hour, we're still on the previous logical day.
  const now = new Date();
  const today = new Date(now.getTime() - resetHour * 3600 * 1000);
  today.setHours(0, 0, 0, 0);
  const todayISO = toISO(today);
  const monday = getMondayOf(today);

  const rows: WeekRow[] = [];
  let prevMonth = -1;

  for (let w = -weeksBack; w <= weeksForward; w++) {
    const weekStart = addDays(monday, w * 7);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      return {
        date: toISO(d),
        dayNum: d.getDate(),
        monthNum: d.getMonth(),
        isFuture: d > today,
        isToday: toISO(d) === todayISO,
      };
    });

    const thisMonth = weekStart.getMonth();
    const monthLabel = thisMonth !== prevMonth ? monthName(thisMonth) : null;
    prevMonth = thisMonth;

    rows.push({ monday: weekStart, days, monthLabel });
  }

  return rows;
}

interface DayPlanet {
  id: string;
  label: string;
  count: number;
  wi: number;
  di: number;
  monthId?: string;
  isAnchor?: boolean;
  color: string;
}

function CalendarScrollPhysics({ days }: { days: DayPlanet[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planetsDataRef = useRef<(Planet & DayPlanet)[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.parentElement?.clientWidth || window.innerWidth;

    planetsDataRef.current = days.map((d) => {
      // Use the total volume as the mass, capped at 96 (3x size 5)
      const mass = Math.min(d.count, 96);
      
      const homeX = 10 + (d.di + 0.5) * ((w - 20) / 7);
      const homeY = d.wi * 45 + 21;

      return {
        id: d.id,
        taskId: d.id,
        wi: d.wi,
        di: d.di,
        monthId: d.monthId,
        isAnchor: d.isAnchor,
        mass,
        color: d.color,
        x: homeX,
        y: homeY,
        vx: (Math.random() - 0.5) * 40, // slight burst
        vy: (Math.random() - 0.5) * 40,
        phaseX: 0,
        phaseY: 0,
        spawnTime: 0,
        label: d.label,
        count: d.count
      } as (Planet & DayPlanet);
    });
  }, [days]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent || parent.clientWidth === 0 || parent.clientHeight === 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const w = parent.clientWidth;
    const h = parent.clientHeight;
    
    // Support high DPI
    const dpr = window.devicePixelRatio || 1;
    const dw = Math.floor(w * dpr);
    const dh = Math.floor(h * dpr);
    
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw;
      canvas.height = dh;
      ctx.scale(dpr, dpr);
    }
    
    if (canvas.style.width !== `${w}px`) canvas.style.width = `${w}px`;
    if (canvas.style.height !== `${h}px`) canvas.style.height = `${h}px`;

    ctx.clearRect(0, 0, w, h);

    const dt = 0.016; 

    // Apply forces to each planet before stepping simulation
    for (const p of planetsDataRef.current) {
        // We know inner content has 10px padding on left/right. Rest is divided into 7 equal columns.
        const homeX = 10 + (p.di + 0.5) * ((w - 20) / 7);
        // Weeks are stacked. Top padding 0. Row height is 38px + 4px (padding) = 42px. Gap is 3px.
        // Thus center is approx (wi * 45) + 21. 
        const homeY = p.wi * 45 + 21;

        let dx = homeX - p.x;
        let dy = homeY - p.y;

        // Toroidal shortest path towards home
        if (dx > w / 2) dx -= w;
        else if (dx < -w / 2) dx += w;
        if (dy > h / 2) dy -= h;
        else if (dy < -h / 2) dy += h;

        const dist = Math.sqrt(dx * dx + dy * dy);

        // Deadzone: if within 2 pixels, release the springs.
        if (dist > 2) {
          const springK = p.isAnchor ? 300.0 : 80.0;
          const damping = 30.0; // Resistance to snap back smoothly

          // Pull increases more slowly with distance (sub-linear/sqrt)
          const pullX = Math.sign(dx) * Math.sqrt(Math.abs(dx)) * springK;
          const pullY = Math.sign(dy) * Math.sqrt(Math.abs(dy)) * springK;

          // Apply velocity damping to prevent slingshotting
          p.vx += (pullX - p.vx * damping) * dt;
          p.vy += (pullY - p.vy * damping) * dt;

          // Inverse brownian motion so tiny loose dates naturally jitter randomly
          const brownian = 600 / p.mass; 
          p.vx += (Math.random() - 0.5) * brownian * dt;
          p.vy += (Math.random() - 0.5) * brownian * dt;
        }
    }

    // Step physics with our custom velocities injected and custom radius scaling for collision
    planetsDataRef.current = stepSimulation(
      planetsDataRef.current, w, h, dt,
      (mass) => 10 + (mass / 96) * 24,
      { gravity: true, spinning: false }
    ) as (Planet & DayPlanet)[];

    for (const p of planetsDataRef.current) {
      // Linear scaling from volume 2 (min) to 96 (max)
      // Base radius ~9px, max radius ~28px
      const r = 10 + (p.mass / 96) * 24; 

      // Draw planet
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Soft glow
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw label
      ctx.font = '600 14px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.strokeText(p.label, p.x, p.y + 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(p.label, p.x, p.y + 1);
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 100 }} />;
}

let calendarSessionUnlocked = false;

interface CalendarProps {
  planets: Planet[];
  resetHour?: number;
  onSelectDate?: (dateISO: string) => void;
  futureTasks?: FutureTask[];
  onAddFutureTask?: (date: string, text: string) => void;
  onDeleteFutureTask?: (id: string) => void;
  getTasksForDate?: (date: string) => FutureTask[];
}

export default function Calendar({ planets, resetHour = 3, onSelectDate, futureTasks = [], onAddFutureTask, onDeleteFutureTask, getTasksForDate }: CalendarProps) {
  const currentWeekRef = useRef<HTMLDivElement>(null);
  const configuredPassword = localStorage.getItem('pathway-calendar-password');
  const [isUnlocked, setIsUnlocked] = useState(calendarSessionUnlocked);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const pendingDateRef = useRef<string | null>(null);

  // Future task modal
  const [futureTaskDate, setFutureTaskDate] = useState<string | null>(null);
  const [futureTaskInput, setFutureTaskInput] = useState('');

  // Long-press handling
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const futureDatesWithTasks = new Set(futureTasks.map(t => t.date));

  const startLongPress = (dateISO: string) => {
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setFutureTaskDate(dateISO);
      setFutureTaskInput('');
    }, 2000);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDateClick = (dateISO: string) => {
    if (!configuredPassword || isUnlocked) {
      onSelectDate?.(dateISO);
    } else {
      pendingDateRef.current = dateISO;
      setPinInput('');
      setShowPinModal(true);
    }
  };

  const handlePinClick = (key: number | 'del') => {
    if (key === 'del') {
      setPinInput(p => p.slice(0, -1));
    } else {
      if (pinInput.length < 6) {
        const newPin = pinInput + key;
        setPinInput(newPin);
        if (newPin.length === 6) {
          setTimeout(() => {
            if (newPin === configuredPassword) {
              calendarSessionUnlocked = true;
              setIsUnlocked(true);
              setShowPinModal(false);
              if (pendingDateRef.current) onSelectDate?.(pendingDateRef.current);
            } else {
              alert('Incorrect PIN');
              setPinInput('');
            }
          }, 100);
        }
      }
    }
  };

  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, []);

  const dayPlanets: Record<string, Planet[]> = {};
  planets.forEach(p => {
    // Logical midnight follows the configured reset hour.
    const logicalTime = p.spawnTime - resetHour * 3600 * 1000;
    const dStr = toISO(new Date(logicalTime));
    if (!dayPlanets[dStr]) dayPlanets[dStr] = [];
    dayPlanets[dStr].push(p);
  });

  const weeksBack = 26;
  const weeksForward = 12;
  const weeks = buildWeekRows(weeksBack, weeksForward, resetHour);
  const currentWeekIdx = weeksBack;

  // Step 1: Find the max count for each month to assign dynamic anchors
  const monthMax = new Map<string, number>();
  weeks.forEach(week => {
    week.days.forEach(cell => {
      const cellPlanets = dayPlanets[cell.date] || [];
      const volume = cellPlanets.reduce((sum, p) => sum + p.mass, 0);
      if (volume > 0) {
        const mStr = cell.date.slice(0, 7); // YYYY-MM
        monthMax.set(mStr, Math.max(monthMax.get(mStr) || 0, volume));
      }
    });
  });

  const usedDays: DayPlanet[] = [];
  weeks.forEach((week, wi) => {
    week.days.forEach((cell, di) => {
      const cellPlanets = dayPlanets[cell.date] || [];
      const volume = cellPlanets.reduce((sum, p) => sum + p.mass, 0);
      if (volume > 0) {
        const mStr = cell.date.slice(0, 7);
        const isYearDigit = cell.monthNum === 0 && cell.dayNum >= 1 && cell.dayNum <= 4;
        const yearDigit = isYearDigit ? cell.date.slice(0, 4)[cell.dayNum - 1] : null;
        const isNonJanStart = cell.dayNum === 1 && cell.monthNum !== 0;

        const label = isYearDigit
          ? yearDigit
          : isNonJanStart
          ? monthName(cell.monthNum).charAt(0)
          : String(cell.dayNum);

        let dominantColor = '#00a87e'; // fallback
        const colorCounts: Record<string, number> = {};
        let maxColorCount = 0;
        
        cellPlanets.forEach(p => {
          if (!p.color) return;
          colorCounts[p.color] = (colorCounts[p.color] || 0) + p.mass; // Weigh by volume/mass
          if (colorCounts[p.color] > maxColorCount) {
             maxColorCount = colorCounts[p.color];
             dominantColor = p.color;
          }
        });

        usedDays.push({
          id: cell.date,
          label: label as string,
          count: volume, // Use total volume
          wi,
          di,
          monthId: mStr,
          isAnchor: volume === monthMax.get(mStr),
          color: dominantColor
        });
      }
    });
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
      
      {/* Weekday labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8, padding: '12px 16px 0', position: 'relative', zIndex: 2 }}>
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--clr-text-muted)', letterSpacing: '0.04em' }}>{d}</div>
        ))}
      </div>

      {/* Scrollable calendar */}
      <div className="cal-scroll" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '0 10px 32px', position: 'relative' }}>
          
          {/* Overlay physics canvas locked to this scrollable document */}
          <CalendarScrollPhysics days={usedDays} />

          {weeks.map((week, wi) => {
            const isCurrentWeek = wi === currentWeekIdx;
            const allFuture = week.days.every((d) => d.isFuture);

            return (
              <div key={toISO(week.monday)} ref={isCurrentWeek ? currentWeekRef : undefined}>
                <div className="cal-week-row" style={{ opacity: allFuture ? 0.25 : 1 }}>
                  {week.days.map((cell) => {
                    const cellPlanets = dayPlanets[cell.date] || [];
                    const isLogged = cellPlanets.length > 0;
                    const dimFuture = cell.isFuture && !allFuture;

                    const isYearDigit = cell.monthNum === 0 && cell.dayNum >= 1 && cell.dayNum <= 4;
                    const yearDigit = isYearDigit ? cell.date.slice(0, 4)[cell.dayNum - 1] : null;
                    const isNonJanStart = cell.dayNum === 1 && cell.monthNum !== 0;

                    const label = isYearDigit
                      ? yearDigit
                      : isNonJanStart
                      ? monthName(cell.monthNum).charAt(0)
                      : String(cell.dayNum);

                    const hasFutureTasks = futureDatesWithTasks.has(cell.date);

                    const longPressProps = cell.isFuture ? {
                      onPointerDown: () => startLongPress(cell.date),
                      onPointerUp: cancelLongPress,
                      onPointerLeave: cancelLongPress,
                      onPointerCancel: cancelLongPress,
                    } : {};

                    if (isLogged) {
                      return (
                        <div
                          key={cell.date}
                          className="cal-day-cell"
                          onClick={() => { if (!longPressFiredRef.current) handleDateClick(cell.date); }}
                          style={{ cursor: 'pointer' }}
                          {...longPressProps}
                        >
                          <div className="cal-day-sq" style={{ opacity: 0 }} />
                        </div>
                      );
                    }

                    let cls = 'cal-day-sq';
                    if (isYearDigit) cls += ' cd-year';
                    if (cell.isToday) cls += ' cd-today';
                    if (isNonJanStart) cls += ' cd-month-start';

                    return (
                      <div
                        key={cell.date}
                        className="cal-day-cell"
                        style={{ opacity: dimFuture ? 0.32 : 1 }}
                        {...longPressProps}
                        onClick={() => { if (hasFutureTasks && cell.isFuture && !longPressFiredRef.current) { setFutureTaskDate(cell.date); setFutureTaskInput(''); } }}
                      >
                        <div className={cls} style={{ position: 'relative' }}>
                          <span>{label}</span>
                          {hasFutureTasks && (
                            <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--clr-base)' }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {futureTaskDate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--clr-surface)', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 16px', borderBottom: '1px solid var(--clr-border)', flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--clr-text-primary)' }}>{futureTaskDate}</h3>
              <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Planned Tasks</span>
            </div>
            <button
              onClick={() => setFutureTaskDate(null)}
              style={{ background: 'var(--clr-surface-raised)', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: 'var(--clr-text-secondary)', display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {getTasksForDate?.(futureTaskDate).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ flex: 1, fontSize: 14, color: 'var(--clr-text-primary)' }}>{task.text}</span>
                <button
                  onClick={() => onDeleteFutureTask?.(task.id)}
                  style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: 'var(--clr-text-muted)', display: 'flex', flexShrink: 0 }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            {getTasksForDate?.(futureTaskDate).length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--clr-text-muted)', fontSize: 13 }}>No tasks planned yet</div>
            )}
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--clr-border)', display: 'flex', gap: 10, flexShrink: 0 }}>
            <input
              type="text"
              value={futureTaskInput}
              onChange={e => setFutureTaskInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && futureTaskInput.trim()) {
                  onAddFutureTask?.(futureTaskDate, futureTaskInput.trim());
                  setFutureTaskInput('');
                }
              }}
              placeholder="Add a task..."
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--clr-border)', background: 'var(--clr-surface-raised)', color: 'var(--clr-text-primary)', fontSize: 14, outline: 'none' }}
              autoFocus
            />
            <button
              onClick={() => {
                if (futureTaskInput.trim()) {
                  onAddFutureTask?.(futureTaskDate, futureTaskInput.trim());
                  setFutureTaskInput('');
                }
              }}
              disabled={!futureTaskInput.trim()}
              style={{
                background: futureTaskInput.trim() ? 'var(--clr-base)' : 'var(--clr-surface-raised)',
                border: 'none', borderRadius: 10, padding: '10px 14px', cursor: futureTaskInput.trim() ? 'pointer' : 'default',
                color: futureTaskInput.trim() ? '#fff' : 'var(--clr-text-muted)', display: 'flex', alignItems: 'center'
              }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      )}

      {showPinModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--clr-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
          <Lock size={64} style={{ marginBottom: 24, color: 'var(--clr-text-muted)', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 32px', color: 'var(--clr-text-primary)' }}>Enter PIN</h3>

          <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: '50%',
                background: pinInput.length > i ? 'var(--clr-base)' : 'transparent',
                border: pinInput.length > i ? 'none' : '2px solid var(--clr-border)',
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
              );
            })}
          </div>

          <button
            onClick={() => setShowPinModal(false)}
            style={{ marginTop: 32, background: 'var(--clr-surface-raised)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: '10px 32px', cursor: 'pointer', color: 'var(--clr-text-secondary)', fontSize: 14, fontWeight: 600 }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
