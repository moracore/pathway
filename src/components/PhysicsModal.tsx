import { useState } from 'react';
import { X, Save, Undo2 } from 'lucide-react';
import type { PhysicsConfig } from '../hooks/usePhysics';
import { PHYSICS_DEFAULTS } from '../hooks/usePhysics';

const SAVED_KEY = 'pathway-physics-saved';

interface Param {
  key: keyof PhysicsConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  description: string;
}

const PARAMS: Param[] = [
  { key: 'G',               label: 'Gravity',              min: 0,    max: 80000, step: 2000,  description: 'Gravitational pull between same-group planets' },
  { key: 'MAX_SPEED',       label: 'Max Speed',            min: 0,    max: 2000,  step: 100,   description: 'Absolute velocity cap' },
  { key: 'SPIN_DELAY_SEC',  label: 'Spin Delay (s)',       min: 0,    max: 5,     step: 0.25,  description: 'Time before spin repulsion activates in clusters' },
  { key: 'SPIN_RADIUS_MULT',label: 'Spin Radius',          min: 1,    max: 8,     step: 1,     description: 'How far the spin zone extends past touch distance' },
  { key: 'SPIN_MAGNITUDE',  label: 'Spin Force',           min: 0,    max: 2000,  step: 100,   description: 'Strength of the orbital spin tangent force' },
  { key: 'REPEL_FORCE',     label: 'Repel Force',          min: 0,    max: 2000,  step: 100,   description: 'Soft contact repulsion strength' },
  { key: 'FRICTION',        label: 'Surface Friction',     min: 0,    max: 30,    step: 1,     description: 'Friction between colliding planet surfaces' },
  { key: 'RADIUS_BASE',     label: 'Planet Radius Base',   min: 2,    max: 10,    step: 1,     description: 'Minimum planet radius' },
  { key: 'RADIUS_SCALE',    label: 'Planet Radius Scale',  min: 2,    max: 10,    step: 1,     description: 'Radius increase per size level' },
  { key: 'GLOW_MULT',       label: 'Planet Glow',          min: 0,    max: 8,     step: 0.5,   description: 'Glow radius multiplier around planets' },
];

interface Props {
  config: PhysicsConfig;
  onUpdate: <K extends keyof PhysicsConfig>(key: K, value: PhysicsConfig[K]) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function PhysicsModal({ config, onUpdate, onReset, onClose }: Props) {
  const [savedSnapshot, setSavedSnapshot] = useState<PhysicsConfig>(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      return raw ? { ...PHYSICS_DEFAULTS, ...JSON.parse(raw) } : { ...config };
    } catch { return { ...config }; }
  });

  const saveConfig = () => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(config));
    setSavedSnapshot({ ...config });
  };

  const revertToSaved = () => {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return;
    const saved: PhysicsConfig = { ...PHYSICS_DEFAULTS, ...JSON.parse(raw) };
    for (const key of Object.keys(saved) as (keyof PhysicsConfig)[]) {
      onUpdate(key, saved[key]);
    }
  };

  const btnStyle = { background: 'var(--clr-surface-raised)', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: 'var(--clr-text-secondary)', display: 'flex' as const };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--clr-surface)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 16px', borderBottom: '1px solid var(--clr-border)', flexShrink: 0 }}>
          <span style={{ flex: 1, fontSize: 18, fontWeight: 700, color: 'var(--clr-text-primary)' }}>Physics Engine</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveConfig} style={btnStyle} title="Save current settings"><Save size={18} /></button>
            <button onClick={revertToSaved} style={btnStyle} title="Revert to last save"><Undo2 size={18} /></button>
            <button onClick={onClose} style={btnStyle} title="Close"><X size={18} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {PARAMS.map(({ key, label, min, max, step, description }) => {
            const value = config[key] as number;
            const isDefault = value === savedSnapshot[key];
            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-primary)' }}>
                    {label}
                    {!isDefault && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--clr-base)', fontWeight: 700, textTransform: 'uppercase' }}>
                        modified
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-base)', minWidth: 52, textAlign: 'right' }}>
                    {Number.isInteger(step) ? value : value.toFixed(step < 0.01 ? 4 : step < 0.1 ? 3 : 1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={e => onUpdate(key, parseFloat(e.target.value) as PhysicsConfig[typeof key])}
                  style={{ width: '100%', accentColor: 'var(--clr-base)' }}
                />
                <span style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>{description}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
