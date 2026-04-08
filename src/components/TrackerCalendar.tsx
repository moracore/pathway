import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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

function buildWeekRows(weeksBack: number, weeksForward: number): WeekRow[] {
  const today = new Date();
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

interface TrackerCalendarProps {
  color: string;
  completedDates: string[];
  onToggleDate: (date: string) => void;
  isAnti?: boolean;
  createdAt?: string;
  keywords?: string[];
  onUpdateKeywords?: (keywords: string[]) => void;
  streakStretch?: number;
  onUpdateStretch?: (stretch: number) => void;
  onUpdateColor?: (color: string) => void;
}

export default function TrackerCalendar({ color, completedDates, onToggleDate, isAnti, createdAt, keywords = [], onUpdateKeywords, streakStretch, onUpdateStretch, onUpdateColor }: TrackerCalendarProps) {
  const currentWeekRef = useRef<HTMLDivElement>(null);
  const completedSet = new Set(completedDates);

  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, []);

  const weeksBack = 26;
  const weeksForward = 12;
  const weeks = buildWeekRows(weeksBack, weeksForward);
  const currentWeekIdx = weeksBack;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8, padding: '12px 16px 0', position: 'relative', zIndex: 2 }}>
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--clr-text-muted)', letterSpacing: '0.04em' }}>{d}</div>
        ))}
      </div>

      <div className="cal-scroll" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '0 10px 32px', position: 'relative' }}>
          {weeks.map((week, wi) => {
            const isCurrentWeek = wi === currentWeekIdx;
            const allFuture = week.days.every((d) => d.isFuture);

            return (
              <div key={toISO(week.monday)} ref={isCurrentWeek ? currentWeekRef : undefined}>
                <div className="cal-week-row" style={{ opacity: allFuture ? 0.25 : 1 }}>
                  {week.days.map((cell) => {
                    const dimFuture = cell.isFuture && !allFuture;
                    const isYearDigit = cell.monthNum === 0 && cell.dayNum >= 1 && cell.dayNum <= 4;
                    const yearDigit = isYearDigit ? cell.date.slice(0, 4)[cell.dayNum - 1] : null;
                    const isNonJanStart = cell.dayNum === 1 && cell.monthNum !== 0;

                    const label = isYearDigit
                      ? yearDigit
                      : isNonJanStart
                      ? monthName(cell.monthNum).charAt(0)
                      : String(cell.dayNum);

                    // For anti-trackers: completedDates stores FAILED dates.
                    // A past day is "done" unless it's in the failed set,
                    // but only from createdAt onwards.
                    const inSet = completedSet.has(cell.date);
                    const afterCreation = !isAnti || !createdAt || cell.date >= createdAt;
                    const isDone = isAnti ? (!cell.isFuture && !inSet && afterCreation) : inSet;
                    const isFailed = isAnti && inSet && afterCreation;

                    let cls = 'cal-day-sq';
                    if (isYearDigit) cls += ' cd-year';
                    if (cell.isToday) cls += ' cd-today';
                    if (isNonJanStart) cls += ' cd-month-start';

                    return (
                      <div
                        key={cell.date}
                        className="cal-day-cell"
                        style={{ opacity: dimFuture ? 0.32 : 1, cursor: 'pointer' }}
                        onClick={() => onToggleDate(cell.date)}
                      >
                        <div
                           className={cls}
                           style={{
                              background: isDone ? color : 'transparent',
                              color: isDone ? '#fff' : isFailed ? 'var(--clr-danger)' : undefined,
                              fontWeight: isDone || isFailed ? 600 : undefined,
                              opacity: isFailed ? 0.5 : undefined,
                           }}
                        >
                          <span>{label}</span>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, padding: '16px 16px 0', borderTop: '1px solid var(--clr-border)' }}>
        {onUpdateColor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--clr-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>Tracker Color</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {['#009070', '#0ea5e9', '#5f26c2ff', '#cc133bff', '#f87204f1'].map(c => (
                <button
                  key={c}
                  onClick={() => onUpdateColor(c)}
                  style={{
                    width: 20, height: 20, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                    boxShadow: color === c ? `0 0 0 2px var(--clr-surface), 0 0 0 3px ${c}` : 'none'
                  }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => onUpdateColor(e.target.value)}
                style={{ width: 20, height: 20, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}

        {onUpdateStretch && streakStretch !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--clr-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>Streak stretch</span>
          <button
            onClick={() => onUpdateStretch(Math.max(1, streakStretch - 1))}
            style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--clr-surface-raised)', border: 'none', color: 'var(--clr-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600 }}
          >-</button>
          <span style={{ fontWeight: 700, color: 'var(--clr-text-primary)', minWidth: 20, textAlign: 'center', fontSize: 14 }}>{streakStretch}</span>
          <button
            onClick={() => onUpdateStretch(Math.min(365, streakStretch + 1))}
            style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--clr-surface-raised)', border: 'none', color: 'var(--clr-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600 }}
          >+</button>
        </div>
      )}
    </div>

    {onUpdateKeywords && (
        <div style={{ flexShrink: 0, padding: '12px 16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--clr-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Auto-track keywords</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {keywords.map((kw, i) => (
              <span key={i} style={{ background: 'var(--clr-surface-raised)', padding: '4px 10px', borderRadius: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                {kw}
                <button
                  onClick={() => onUpdateKeywords(keywords.filter((_, idx) => idx !== i))}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--clr-text-muted)', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              placeholder="+ keyword"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = e.currentTarget.value.trim().toLowerCase();
                  if (val && !keywords.map(k => k.toLowerCase()).includes(val)) {
                    onUpdateKeywords([...keywords, val]);
                    e.currentTarget.value = '';
                  }
                }
              }}
              style={{ background: 'transparent', border: '1px dashed var(--clr-border)', borderRadius: 20, padding: '4px 12px', fontSize: 13, color: 'var(--clr-text)', outline: 'none', minWidth: 90 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
