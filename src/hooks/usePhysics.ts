import { useState, useEffect } from 'react';

export interface PhysicsConfig {
  G: number;
  MIN_SEPARATION: number;
  MAX_SPEED: number;
  SPIN_DELAY_SEC: number;
  SPIN_RADIUS_MULT: number;
  SPIN_MAGNITUDE: number;
  REPEL_FORCE: number;
  FRICTION: number;
  DAMPING: number;
  OVERLAP_PASSES: number;
  RADIUS_BASE: number;
  RADIUS_SCALE: number;
}

export const PHYSICS_DEFAULTS: PhysicsConfig = {
  G: 16200,
  MIN_SEPARATION: 2,
  MAX_SPEED: 300,
  SPIN_DELAY_SEC: 0.5,
  SPIN_RADIUS_MULT: 1.8,
  SPIN_MAGNITUDE: 250,
  REPEL_FORCE: 300,
  FRICTION: 2.5,
  DAMPING: 0.9925,
  OVERLAP_PASSES: 3,
  RADIUS_BASE: 4,
  RADIUS_SCALE: 4,
};

const STORAGE_KEY = 'pathway-physics';

function load(): PhysicsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return PHYSICS_DEFAULTS;
    return { ...PHYSICS_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return PHYSICS_DEFAULTS;
  }
}

export function usePhysics() {
  const [config, setConfig] = useState<PhysicsConfig>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateParam = <K extends keyof PhysicsConfig>(key: K, value: PhysicsConfig[K]) => {
    setConfig(c => ({ ...c, [key]: value }));
  };

  const resetDefaults = () => setConfig(PHYSICS_DEFAULTS);

  return { config, updateParam, resetDefaults };
}
