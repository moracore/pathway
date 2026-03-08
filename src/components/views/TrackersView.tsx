import { useState, useMemo, useRef, useCallback } from "react";
import { Plus, List, FileText, Minus } from "lucide-react";
import { useFileSystem } from "../../hooks";

// ── Types ────────────────────────────────────────────────────────────────────

interface Tracker {
  name: string;
  goal: number;
  current: number;
  importance: number;
  done: boolean;
}

// ── Parser / Serializer ───────────────────────────────────────────────────────

function parseTrackers(content: string): Tracker[] {
  const trackers: Tracker[] = [];
  let cur: Partial<Tracker> | null = null;

  for (const line of content.split("\n")) {
    if (line.startsWith("## ")) {
      if (cur?.name !== undefined) {
        trackers.push({
          name: cur.name!,
          goal: cur.goal ?? 100,
          current: cur.current ?? 0,
          importance: cur.importance ?? 1,
          done: cur.done ?? false,
        });
      }
      cur = { name: line.slice(3).trim() };
    } else if (cur) {
      const goal = line.match(/^>\s*Goal:\s*(\d+)/);
      const curr = line.match(/^>\s*Current:\s*(\d+)/);
      const imp  = line.match(/^>\s*Importance:\s*(\d+)/);
      const done = line.match(/^>\s*Done:\s*true/);
      if (goal) cur.goal       = parseInt(goal[1], 10);
      if (curr) cur.current    = parseInt(curr[1], 10);
      if (imp)  cur.importance = parseInt(imp[1], 10);
      if (done) cur.done       = true;
    }
  }
  if (cur?.name !== undefined) {
    trackers.push({
      name: cur.name!,
      goal: cur.goal ?? 100,
      current: cur.current ?? 0,
      importance: cur.importance ?? 1,
      done: cur.done ?? false,
    });
  }
  return trackers;
}

function serializeTrackers(trackers: Tracker[]): string {
  let out = "# Trackers\n";
  for (const t of trackers) {
    out += `\n## ${t.name}\n> Goal: ${t.goal}\n> Current: ${t.current}\n> Importance: ${t.importance}\n`;
    if (t.done) out += `> Done: true\n`;
  }
  return out;
}

const DEFAULT_CONTENT = "# Trackers\n";

// ── Main component ────────────────────────────────────────────────────────────

export function TrackersView() {
  const { trackersContent, saveTrackersContent } = useFileSystem();

  const [mode, setMode] = useState<"list" | "markdown">("list");
  const [mdContent, setMdContent] = useState(trackersContent ?? DEFAULT_CONTENT);
  const [addingName, setAddingName] = useState("");
  const [addingGoal, setAddingGoal] = useState("100");
  const [showAddRow, setShowAddRow] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestMd = useRef(mdContent);

  const scheduleSave = useCallback((c: string) => {
    latestMd.current = c;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveTrackersContent(latestMd.current), 1200);
  }, [saveTrackersContent]);

  const trackers = useMemo(() => parseTrackers(mdContent), [mdContent]);

  const applyTrackers = (updated: Tracker[]) => {
    const newContent = serializeTrackers(updated);
    setMdContent(newContent);
    saveTrackersContent(newContent);
  };

  const updateCurrent = (name: string, delta: number) => {
    applyTrackers(trackers.map(t =>
      t.name === name
        ? { ...t, current: Math.max(0, Math.min(t.goal, t.current + delta)) }
        : t
    ));
  };

  const completeTracker = (name: string) => {
    applyTrackers(trackers.map(t => t.name === name ? { ...t, done: true } : t));
  };

  const declineComplete = (name: string) => {
    applyTrackers(trackers.map(t =>
      t.name === name ? { ...t, current: Math.max(0, t.goal - 1) } : t
    ));
  };

  const handleAddTracker = () => {
    const name = addingName.trim();
    const goal = parseInt(addingGoal, 10);
    if (!name || isNaN(goal) || goal <= 0) return;
    applyTrackers([...trackers, { name, goal, current: 0, importance: 1, done: false }]);
    setAddingName("");
    setAddingGoal("100");
    setShowAddRow(false);
  };

  const switchMode = (next: "list" | "markdown") => {
    if (next === "list") setMdContent(latestMd.current);
    setMode(next);
  };

  // Active trackers only — done ones go to the Done page
  const sorted = [...trackers]
    .filter(t => !t.done)
    .sort((a, b) => {
      const aDone = a.current >= a.goal ? 1 : 0;
      const bDone = b.current >= b.goal ? 1 : 0;
      return aDone - bDone || b.importance - a.importance;
    });

  return (
    <div className="space-y-4 pb-20 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          Trackers
        </h1>
        <div
          className="flex rounded-lg p-0.5 shrink-0"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <ModeBtn active={mode === "list"}     onClick={() => switchMode("list")}     icon={<List size={14} />}     label="List" />
          <ModeBtn active={mode === "markdown"} onClick={() => switchMode("markdown")} icon={<FileText size={14} />} label="Markdown" />
        </div>
      </div>

      {/* ── List mode ── */}
      {mode === "list" && (
        <div className="space-y-3">
          {sorted.length === 0 && !showAddRow && (
            <div
              className="py-12 text-center text-sm rounded-xl"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              No active trackers — add one below or switch to Markdown to write your own.
            </div>
          )}

          {sorted.map(t => (
            <TrackerCard
              key={t.name}
              tracker={t}
              onDecrement={() => updateCurrent(t.name, -1)}
              onIncrement={() => updateCurrent(t.name, +1)}
              onComplete={() => completeTracker(t.name)}
              onDecline={() => declineComplete(t.name)}
            />
          ))}

          {/* Add row */}
          {showAddRow ? (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--accent)" }}
            >
              <input
                autoFocus
                value={addingName}
                onChange={e => setAddingName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddTracker(); if (e.key === "Escape") setShowAddRow(false); }}
                placeholder="Tracker name…"
                className="flex-1 bg-transparent outline-none text-sm min-w-32"
                style={{ color: "var(--text-primary)" }}
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Goal:</span>
                <input
                  type="number"
                  min={1}
                  value={addingGoal}
                  onChange={e => setAddingGoal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddTracker(); }}
                  className="w-20 bg-transparent outline-none text-sm text-center rounded px-2 py-1"
                  style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <button
                onClick={handleAddTracker}
                disabled={!addingName.trim()}
                className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: "var(--accent)" }}
              >
                Add
              </button>
              <button
                onClick={() => setShowAddRow(false)}
                className="shrink-0 text-sm px-2 py-1.5 rounded-lg"
                style={{ color: "var(--text-muted)" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRow(true)}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <Plus size={14} /> Add Tracker
            </button>
          )}
        </div>
      )}

      {/* ── Markdown mode ── */}
      {mode === "markdown" && (
        <textarea
          value={mdContent}
          onChange={e => { setMdContent(e.target.value); scheduleSave(e.target.value); }}
          spellCheck={false}
          className="w-full rounded-xl px-5 py-4 text-sm font-mono leading-relaxed outline-none resize-none custom-scrollbar"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            minHeight: "64vh",
            caretColor: "var(--accent)",
          }}
        />
      )}
    </div>
  );
}

// ── Tracker Card ──────────────────────────────────────────────────────────────

function TrackerCard({
  tracker,
  onDecrement,
  onIncrement,
  onComplete,
  onDecline,
}: {
  tracker: Tracker;
  onDecrement: () => void;
  onIncrement: () => void;
  onComplete: () => void;
  onDecline: () => void;
}) {
  const pct = tracker.goal > 0 ? Math.min(100, (tracker.current / tracker.goal) * 100) : 0;
  const atGoal = tracker.current >= tracker.goal;

  return (
    <div
      className="rounded-xl px-5 py-4 space-y-3"
      style={{
        background: "var(--bg-secondary)",
        border: `1px solid var(--border)`,
      }}
    >
      {/* Top row: name + importance + controls */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            {tracker.name}
          </span>
          <span
            className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            I{tracker.importance}
          </span>
        </div>

        {/* Fraction + % */}
        <span className="text-sm shrink-0" style={{ color: "var(--text-secondary)" }}>
          {tracker.current}&thinsp;/&thinsp;{tracker.goal}
          <span className="ml-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            ({Math.round(pct)}%)
          </span>
        </span>

        {/* − / + buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onDecrement}
            disabled={tracker.current <= 0}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            onMouseEnter={e => { if (tracker.current > 0) e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <Minus size={13} />
          </button>
          <button
            onClick={onIncrement}
            disabled={atGoal}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            onMouseEnter={e => { if (!atGoal) { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; } }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: atGoal ? "var(--success)" : "var(--accent)",
            boxShadow: pct > 0 ? `0 0 6px rgba(var(--accent-rgb),0.4)` : "none",
          }}
        />
      </div>

      {/* Complete? prompt */}
      {atGoal && (
        <div
          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
          style={{ background: "rgba(var(--success-rgb, 68,187,102),0.08)", border: "1px solid var(--success)" }}
        >
          <span style={{ color: "var(--success)", fontWeight: 600 }}>Complete?</span>
          <div className="flex gap-2">
            <button
              onClick={onDecline}
              className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              Not yet
            </button>
            <button
              onClick={onComplete}
              className="px-3 py-1 rounded-md text-xs font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--success)" }}
            >
              Yes, done!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
      style={{ background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--text-secondary)" }}
    >
      {icon}{label}
    </button>
  );
}
