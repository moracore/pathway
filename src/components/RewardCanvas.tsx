import { useRef, useEffect, useCallback, useState } from 'react';
import type { Planet } from '../types';
import { stepSimulation, planetRadius, getGhostPositions } from '../engine/physics';
import type { PhysicsConfig } from '../hooks/usePhysics';

// ── Particle system for spawn bursts ──
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

// ── Star for background ──
interface Star {
  x: number; // 0–1 normalized
  y: number;
  size: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  brightness: number;
}

function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.3,
      twinkleSpeed: Math.random() * 2 + 0.5,
      twinkleOffset: Math.random() * Math.PI * 2,
      brightness: Math.random() * 0.4 + 0.15,
    });
  }
  return stars;
}

// ── Toroidal circular mean ──
function circularMean(positions: number[], period: number): number {
  if (positions.length === 0) return period / 2;
  let sinSum = 0;
  let cosSum = 0;
  for (const p of positions) {
    const theta = (p / period) * Math.PI * 2;
    sinSum += Math.sin(theta);
    cosSum += Math.cos(theta);
  }
  sinSum /= positions.length;
  cosSum /= positions.length;
  let mean = Math.atan2(sinSum, cosSum) / (Math.PI * 2) * period;
  if (isNaN(mean)) return period / 2;
  if (mean < 0) mean += period;
  return mean;
}

function wrap(val: number, period: number): number {
  return ((val % period) + period) % period;
}

function getTheme(): 'dark' | 'light' {
  return (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
}

const THEME_PALETTE = {
  dark: {
    bg: '#080c14',
    starColor: (alpha: number) => `rgba(180, 200, 255, ${alpha})`,
    trailColor: (alpha: number) => `rgba(0, 150, 200, ${alpha})`,
    glowAlpha: '33',
    slingshotLine: 'rgba(255, 255, 255, 0.4)',
    planetStroke: '#fff',
  },
  light: {
    bg: '#e8ecf2',
    starColor: (alpha: number) => `rgba(100, 120, 160, ${alpha * 0.5})`,
    trailColor: (alpha: number) => `rgba(80, 120, 180, ${alpha * 0.6})`,
    glowAlpha: '22',
    slingshotLine: 'rgba(0, 0, 0, 0.3)',
    planetStroke: '#444',
  },
};

interface RewardCanvasProps {
  planets: Planet[];
  onDeploy?: (id: string, x: number, y: number, vx: number, vy: number) => void;
  onSyncState?: (planets: Planet[]) => void;
  physicsConfig?: PhysicsConfig;
}

export default function RewardCanvas({ planets, onDeploy, onSyncState, physicsConfig }: RewardCanvasProps) {
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planetsRef = useRef<Planet[]>([]);
  const timeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const starsRef = useRef<Star[]>(generateStars(60));
  const particlesRef = useRef<Particle[]>([]);
  const trailsRef = useRef<Map<string, { x: number; y: number }[]>>(new Map());
  const knownIdsRef = useRef<Set<string>>(new Set());
  const cameraOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStateRef = useRef<{ x: number, y: number, currX: number, currY: number } | null>(null);
  const contactTimersRef = useRef<Map<string, number>>(new Map());
  const physicsConfigRef = useRef(physicsConfig);
  useEffect(() => { physicsConfigRef.current = physicsConfig; }, [physicsConfig]);

  // Keep onSyncState fresh without re-running the unmount effect.
  const onSyncStateRef = useRef(onSyncState);
  useEffect(() => { onSyncStateRef.current = onSyncState; }, [onSyncState]);

  // Flush current simulation positions/velocities back to the parent on unmount,
  // so when the user navigates away and returns, the planets resume where they were.
  useEffect(() => {
    return () => {
      onSyncStateRef.current?.(planetsRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const currentIds = new Set(planetsRef.current.map(p => p.id));
    const incomingIds = new Set(planets.map(p => p.id));

    // Cleanup planets that are no longer in incoming state
    const kept = planetsRef.current.filter(p => incomingIds.has(p.id));
    const newPlanets = planets
      .filter(p => !currentIds.has(p.id) && p.isDeployed !== false)
      .map(p => {
        if (!knownIdsRef.current.has(p.id)) {
          knownIdsRef.current.add(p.id);
          const newStars = generateStars(1);
          starsRef.current = [...starsRef.current, ...newStars];
        }
        return {
          ...p,
          x: p.x !== 0 ? p.x : w * 0.92,
          y: p.y !== 0 ? p.y : h / 2 + (Math.random() - 0.5) * h * 0.1,
          vx: p.vx !== 0 ? p.vx : -180 - Math.random() * 80,
          vy: p.vy !== 0 ? p.vy : (Math.random() - 0.5) * 60,
        };
      });

    planetsRef.current = [...kept, ...newPlanets];

    const trails = trailsRef.current;
    for (const key of trails.keys()) {
      if (!incomingIds.has(key)) trails.delete(key);
    }

    // Clean up contact timers for removed planets
    for (const key of contactTimersRef.current.keys()) {
      const [idA, idB] = key.split(':');
      if (!incomingIds.has(idA) || !incomingIds.has(idB)) {
        contactTimersRef.current.delete(key);
      }
    }
  }, [planets]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const w = rect.width;
    const h = rect.height;
    const dt = isPausedRef.current ? 0 : 0.004;

    const palette = THEME_PALETTE[getTheme()];

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, w, h);

    timeRef.current += dt;
    const t = timeRef.current;

    // Step physics with verified "Sticky" engine
    planetsRef.current = stepSimulation(
      planetsRef.current, w, h, dt, undefined, undefined, contactTimersRef.current, physicsConfigRef.current
    );

    const simPlanets = planetsRef.current;

    // ── Compute camera offset (smooth tracking)
    let camOffsetX = 0;
    let camOffsetY = 0;
    if (simPlanets.length > 0) {
      const targetX = circularMean(simPlanets.map(p => p.x), w);
      const targetY = circularMean(simPlanets.map(p => p.y), h);
      
      let targetOffX = w / 2 - targetX;
      let targetOffY = h / 2 - targetY;
      if (targetOffX > w / 2) targetOffX -= w;
      else if (targetOffX < -w / 2) targetOffX += w;
      if (targetOffY > h / 2) targetOffY -= h;
      else if (targetOffY < -h / 2) targetOffY += h;

      const cam = cameraOffsetRef.current;
      cam.x = ((cam.x + w / 2) % w + w) % w - w / 2;
      cam.y = ((cam.y + h / 2) % h + h) % h - h / 2;
      const lerpSpeed = dt > 0 ? 0.05 : 0;
      let diffX = targetOffX - cam.x;
      let diffY = targetOffY - cam.y;
      if (diffX > w / 2) diffX -= w;
      else if (diffX < -w / 2) diffX += w;
      if (diffY > h / 2) diffY -= h;
      else if (diffY < -h / 2) diffY += h;

      cam.x += diffX * lerpSpeed;
      cam.y += diffY * lerpSpeed;
      camOffsetX = cam.x;
      camOffsetY = cam.y;
    }

    function toScreen(px: number, py: number): [number, number] {
      return [wrap(px + camOffsetX, w), wrap(py + camOffsetY, h)];
    }

    // ── Draw Stars
    for (const star of starsRef.current) {
      const [sx, sy] = toScreen(star.x * w, star.y * h);
      const twinkle = Math.sin(t * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
      const alpha = star.brightness * (0.5 + twinkle * 0.5);
      ctx.fillStyle = palette.starColor(alpha);
      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Trails
    const trails = trailsRef.current;
    if (dt > 0) {
      for (const planet of simPlanets) {
        let trail = trails.get(planet.id) || [];
        trail.push({ x: planet.x, y: planet.y });
        if (trail.length > 20) trail.shift();
        trails.set(planet.id, trail);
      }
    }

    for (const planet of simPlanets) {
      const trail = trails.get(planet.id);
      if (!trail || trail.length < 2) continue;
      for (let i = 1; i < trail.length; i++) {
        const [sx0, sy0] = toScreen(trail[i - 1].x, trail[i - 1].y);
        const [sx1, sy1] = toScreen(trail[i].x, trail[i].y);
        if (Math.abs(sx1 - sx0) > w / 2 || Math.abs(sy1 - sy0) > h / 2) continue;
        const alpha = (i / trail.length) * 0.15;
        ctx.strokeStyle = palette.trailColor(alpha);
        ctx.lineWidth = (i / trail.length) * 1.5;
        ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1); ctx.stroke();
      }
    }

    // ── Draw Planets
    for (const planet of simPlanets) {
      const r = planetRadius(planet.mass, physicsConfigRef.current);
      const [sx, sy] = toScreen(planet.x, planet.y);
      const ghosts = getGhostPositions(sx, sy, r, w, h);

      for (const [gx, gy] of ghosts) {
        if (gx+r+20 < 0 || gx-r-20 > w || gy+r+20 < 0 || gy-r-20 > h) continue;

        // Glow
        const glowMult = physicsConfigRef.current?.GLOW_MULT ?? 3;
        if (glowMult > 0) {
          const glow = ctx.createRadialGradient(gx, gy, r, gx, gy, r * glowMult);
          glow.addColorStop(0, planet.color + palette.glowAlpha);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(gx, gy, r * glowMult, 0, Math.PI * 2); ctx.fill();
        }

        // Core
        ctx.fillStyle = planet.color;
        ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── Particles
    const particles = particlesRef.current;
    if (dt > 0) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.96; p.vy *= 0.96;
        p.life -= dt / p.maxLife;
        if (p.life <= 0) particles.splice(i, 1);
      }
    }
    for (const p of particles) {
      const [sx, sy] = toScreen(p.x, p.y);
      ctx.fillStyle = p.color + Math.round(p.life * 255).toString(16).padStart(2, '0');
      ctx.beginPath(); ctx.arc(sx, sy, p.size * p.life, 0, Math.PI * 2); ctx.fill();
    }

    // ── Deployment Slingshot
    const drag = dragStateRef.current;
    if (drag) {
      ctx.strokeStyle = palette.slingshotLine;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(drag.x, drag.y); ctx.lineTo(drag.currX, drag.currY); ctx.stroke();
      ctx.setLineDash([]);

      const pending = planets.filter(p => !p.isDeployed);
      if (pending.length > 0) {
        const p = pending[0];
        const r = planetRadius(p.mass, physicsConfigRef.current);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(drag.x, drag.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = palette.planetStroke; ctx.lineWidth = 1; ctx.stroke();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [planets]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const pendingPlanets = planets.filter(p => !p.isDeployed);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (pendingPlanets.length === 0) {
      setIsPaused(p => !p);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = { x, y, currX: x, currY: y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStateRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragStateRef.current.currX = e.clientX - rect.left;
    dragStateRef.current.currY = e.clientY - rect.top;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStateRef.current || !canvasRef.current) return;
    const drag = dragStateRef.current;
    dragStateRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (pendingPlanets.length > 0) {
      const p = pendingPlanets[0];
      const dx = drag.x - drag.currX;
      const dy = drag.y - drag.currY;
      const vx = dx * 12;
      const vy = dy * 12;
      const canvas = canvasRef.current;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      
      let px = wrap(drag.x - cameraOffsetRef.current.x, w);
      let py = wrap(drag.y - cameraOffsetRef.current.y, h);

      if (onDeploy) onDeploy(p.id, px, py, vx, vy);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {pendingPlanets.length > 0 && <div className="pending-deployment-overlay" />}
      <canvas
        ref={canvasRef}
        className="reward-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ width: '100%', height: '100%', cursor: pendingPlanets.length > 0 ? 'crosshair' : 'pointer', touchAction: 'none', outline: 'none' }}
      />
    </div>
  );
}
