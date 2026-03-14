import { useState } from "react";
import { Eye, EyeOff, ChevronUp, ChevronDown, Calendar, FolderKanban, Target, BarChart2, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

// ── Icons ─────────────────────────────────────────────────────────────────────

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// ── Accent presets ─────────────────────────────────────────────────────────────

const ACCENT_PRESETS = [
  { name: "Coral",         value: "#FF4444" },
  { name: "Orange",        value: "#FF8800" },
  { name: "Amber",         value: "#FFCC00" },
  { name: "Emerald",       value: "#44BB66" },
  { name: "Teal",          value: "#00BBCC" },
  { name: "Electric Blue", value: "#0080FF" },
  { name: "Purple",        value: "#AA44FF" },
  { name: "Pink",          value: "#FF44AA" },
];

// ── Nav tab metadata ───────────────────────────────────────────────────────────

const NAV_TAB_META: Record<string, { label: string; icon: React.ElementType; alwaysOn: boolean }> = {
  today:    { label: "Today",    icon: Calendar,     alwaysOn: false },
  projects: { label: "Projects", icon: FolderKanban, alwaysOn: true  },
  goals:    { label: "Goals",    icon: Target,       alwaysOn: false },
  trackers: { label: "Trackers", icon: BarChart2,    alwaysOn: false },
};

// ── HSL utilities ─────────────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const v = ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Slider value 0–100 ↔ actual S 40–100%
const sliderToS = (v: number) => 40 + v * 0.6;
const sToSlider = (s: number) => Math.round(Math.max(0, Math.min(100, (s - 40) / 0.6)));

// Slider value 0–100 ↔ actual L 35–80%
const sliderToL = (v: number) => 35 + v * 0.45;
const lToSlider = (l: number) => Math.round(Math.max(0, Math.min(100, (l - 35) / 0.45)));

function slidersFromHex(hex: string): [number, number, number] {
  const [h, s, l] = hexToHsl(hex);
  return [h, sToSlider(s), lToSlider(l)];
}

// ── Hour formatting ────────────────────────────────────────────────────────────

function formatHour(h: number): string {
  if (h === 0)  return "12:00 AM";
  if (h < 12)   return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--bg-secondary)",
  borderRadius: 16,
  border: "1px solid var(--border-subtle)",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  fontWeight: 700,
  letterSpacing: "0.6px",
  color: "var(--text-muted)",
  marginBottom: 2,
};

const rowBetween: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

function SecondaryBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--bg-tertiary)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
      onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-tertiary)")}
    >
      {children}
    </button>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        background: value ? "var(--accent)" : "var(--bg-elevated)",
        cursor: "pointer",
        position: "relative",
        transition: "background 200ms",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: value ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 200ms",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

function SliderRow({
  label, value, min, max, gradient, onChange,
}: {
  label: string; value: number; min: number; max: number;
  gradient: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
        {label}
      </span>
      <input
        type="range"
        className="hsl-slider"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ background: gradient }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsView() {
  const {
    theme, accentColor, toggleTheme, setAccentColor,
    enableToday, enableGoals, enableTrackers, enableDone,
    setEnableToday, setEnableGoals, setEnableTrackers, setEnableDone,
    navOrder, setNavOrder,
    resetHour, setResetHour,
    apiKey, setApiKey,
  } = useTheme();

  const [showKey, setShowKey] = useState(false);

  // HSL slider state — initialized from current accentColor
  const [hSlider, setHSlider] = useState(() => slidersFromHex(accentColor)[0]);
  const [sSlider, setSSlider] = useState(() => slidersFromHex(accentColor)[1]);
  const [lSlider, setLSlider] = useState(() => slidersFromHex(accentColor)[2]);

  const previewHex = hslToHex(hSlider, sliderToS(sSlider), sliderToL(lSlider));

  const applySliders = (h: number, sv: number, lv: number) => {
    setHSlider(h);
    setSSlider(sv);
    setLSlider(lv);
    setAccentColor(hslToHex(h, sliderToS(sv), sliderToL(lv)));
  };

  const handlePreset = (hex: string) => {
    const [h, sv, lv] = slidersFromHex(hex);
    setHSlider(h);
    setSSlider(sv);
    setLSlider(lv);
    setAccentColor(hex);
  };

  const themeName = {
    dark: "Dark Mode",
    light: "Light Mode",
    woodland: "Mora Woodland",
    axe: "Axe Grey",
  }[theme];

  const isWoodland = theme === "woodland";

  const actualS = Math.round(sliderToS(sSlider));
  const actualL = Math.round(sliderToL(lSlider));

  // ── Nav order helpers ──────────────────────────────────────────────────────

  const enableFlags: Record<string, boolean> = { enableToday, enableGoals, enableTrackers };
  const setEnableFlags: Record<string, (v: boolean) => void> = {
    today: setEnableToday, goals: setEnableGoals, trackers: setEnableTrackers,
  };

  const moveTab = (idx: number, dir: number) => {
    const next = [...navOrder];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setNavOrder(next);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 32 }}>
      {/* Page title */}
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
        Settings
      </h1>

      {/* ── Appearance ── */}
      <div style={card}>
        <p style={sectionTitle}>Appearance</p>
        <div style={rowBetween}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-primary)" }}>
            {theme === "dark" || theme === "woodland" ? <MoonIcon /> : <SunIcon />}
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{themeName}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Toggle app theme</div>
            </div>
          </div>
          <SecondaryBtn onClick={toggleTheme}>Cycle Theme</SecondaryBtn>
        </div>
      </div>

      {/* ── Accent Color ── */}
      <div
        style={{
          ...card,
          opacity: isWoodland ? 0.5 : 1,
          pointerEvents: isWoodland ? "none" : "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p style={sectionTitle}>
            Accent Color{" "}
            {isWoodland && (
              <span style={{ textTransform: "none", fontWeight: 400, fontSize: 11 }}>(Locked by theme)</span>
            )}
          </p>
        </div>

        {/* Preset circles + live color at the end */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              title={p.name}
              onClick={() => handlePreset(p.value)}
              style={{
                width: 36, height: 36, borderRadius: "50%", background: p.value,
                border: accentColor.toLowerCase() === p.value.toLowerCase()
                  ? "3px solid var(--text-primary)"
                  : "3px solid transparent",
                boxShadow: accentColor.toLowerCase() === p.value.toLowerCase()
                  ? "0 0 0 2px var(--bg-secondary)"
                  : "none",
                cursor: "pointer", padding: 0, outline: "none", transition: "all 150ms ease",
              }}
            />
          ))}
          {/* Divider */}
          <div style={{ width: 1, height: 28, background: "var(--border)", margin: "0 2px" }} />
          {/* Live current color */}
          <div
            title="Current color"
            style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: previewHex,
              border: "3px solid var(--text-primary)",
              boxShadow: `0 0 0 2px var(--bg-secondary), 0 0 10px ${previewHex}66`,
              transition: "background 80ms ease",
            }}
          />
        </div>

        {/* HSL Sliders */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SliderRow
            label="Hue"
            value={hSlider}
            min={0} max={360}
            gradient="linear-gradient(to right, hsl(0,80%,65%), hsl(30,80%,65%), hsl(60,80%,65%), hsl(90,80%,65%), hsl(120,80%,65%), hsl(150,80%,65%), hsl(180,80%,65%), hsl(210,80%,65%), hsl(240,80%,65%), hsl(270,80%,65%), hsl(300,80%,65%), hsl(330,80%,65%), hsl(360,80%,65%))"
            onChange={v => applySliders(v, sSlider, lSlider)}
          />
          <SliderRow
            label="Saturation"
            value={sSlider}
            min={0} max={100}
            gradient={`linear-gradient(to right, hsl(${hSlider},40%,${actualL}%), hsl(${hSlider},100%,${actualL}%))`}
            onChange={v => applySliders(hSlider, v, lSlider)}
          />
          <SliderRow
            label="Lightness"
            value={lSlider}
            min={0} max={100}
            gradient={`linear-gradient(to right, hsl(${hSlider},${actualS}%,35%), hsl(${hSlider},${actualS}%,80%))`}
            onChange={v => applySliders(hSlider, sSlider, v)}
          />
        </div>
      </div>

      {/* ── Today / Daily Reset ── */}
      <div style={card}>
        <p style={sectionTitle}>Daily Reset</p>
        <div style={rowBetween}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>Reset Time</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>New day starts at this hour</div>
          </div>
          <select
            value={resetHour}
            onChange={e => setResetHour(Number(e.target.value))}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 13,
              color: "var(--text-primary)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{formatHour(i)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Nav Order ── */}
      <div style={card}>
        <p style={sectionTitle}>Nav Order</p>

        {navOrder.map((id, idx) => {
          const meta = NAV_TAB_META[id];
          if (!meta) return null;
          const Icon = meta.icon;
          const isFirst = idx === 0;
          const isLast  = idx === navOrder.length - 1;
          const isEnabled = meta.alwaysOn || (enableFlags[`enable${id.charAt(0).toUpperCase() + id.slice(1)}`] ?? true);
          const setEnabled = meta.alwaysOn ? null : setEnableFlags[id];

          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Up / Down arrows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button
                  onClick={() => moveTab(idx, -1)}
                  disabled={isFirst}
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    width: 22, height: 22,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: isFirst ? "default" : "pointer",
                    opacity: isFirst ? 0.3 : 1,
                    color: "var(--text-muted)",
                  }}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={() => moveTab(idx, 1)}
                  disabled={isLast}
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    width: 22, height: 22,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: isLast ? "default" : "pointer",
                    opacity: isLast ? 0.3 : 1,
                    color: "var(--text-muted)",
                  }}
                >
                  <ChevronDown size={12} />
                </button>
              </div>

              {/* Icon + Label */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
                <Icon size={16} style={{ color: isEnabled ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }} />
                <span style={{ fontSize: 15, fontWeight: 500 }}>{meta.label}</span>
                {meta.alwaysOn && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Always on</span>
                )}
              </div>

              {/* Visibility toggle (optional tabs only) */}
              {setEnabled ? (
                <Toggle value={isEnabled} onChange={setEnabled} />
              ) : (
                <div style={{ width: 44 }} />
              )}
            </div>
          );
        })}

        {/* Dormant — always last, but removable */}
        <div style={{ height: 1, background: "var(--border-subtle)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22 + 22 + 2, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
            <Moon size={16} style={{ color: enableDone ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 500 }}>Dormant</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Always last</span>
          </div>
          <Toggle value={enableDone} onChange={setEnableDone} />
        </div>
      </div>

      {/* ── AI Integration ── */}
      <div style={card}>
        <p style={sectionTitle}>AI Integration</p>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>
            API Key
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            Gemini or OpenRouter key for AI-powered features
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-… or AIza…"
              spellCheck={false}
              autoComplete="off"
              style={{
                flex: 1,
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--text-primary)",
                outline: "none",
                fontFamily: "monospace",
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", paddingTop: 8 }}>
        Pathway · Project Tracker
      </div>
    </div>
  );
}
