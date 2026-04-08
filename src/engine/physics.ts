import type { Planet } from '../types';

// ── Simulation constants ──
const G = 16200;                // Balanced gravity
const DT = 0.016;               // Fixed timestep
const MIN_SEPARATION = 2;       // Buffer between surfaces
const MAX_SPEED = 300;          // Absolute speed cap
const SPIN_DELAY_SEC = 0.5;     // Quicker feedback for spin

/**
 * Returns the visual radius for a planet based on its mass.
 * Mass is 2^size, so size 1-5 maps to Mass 2-32.
 */
export function planetRadius(mass: number): number {
  const sizeLevel = Math.log2(mass);
  return 4 + sizeLevel * 4; // 8, 12, 16, 20, 24
}

/**
 * Toroidal shortest displacement between two points.
 */
function toroidalDelta(x1: number, y1: number, x2: number, y2: number, w: number, h: number): [number, number] {
  let dx = x2 - x1;
  let dy = y2 - y1;
  if (dx > w / 2) dx -= w;
  else if (dx < -w / 2) dx += w;
  if (dy > h / 2) dy -= h;
  else if (dy < -h / 2) dy += h;
  return [dx, dy];
}

/**
 * Wraps a coordinate to stay within the canvas bounds.
 */
function wrapPosition(x: number, y: number, w: number, h: number): [number, number] {
  return [((x % w) + w) % w, ((y % h) + h) % h];
}

/**
 * Steps the physics simulation.
 * This engine exclusively uses "Sticky" physics with Tangential (Spin) Repulsion.
 */
export interface PhysicsOptions {
  gravity?: boolean;
  spinning?: boolean;
  friction?: boolean;
}

export function stepSimulation(
  planets: Planet[],
  w?: number,
  h?: number,
  customDt?: number,
  radiusFn?: (mass: number) => number,
  options: PhysicsOptions = { gravity: true, spinning: true, friction: true },
  contactTimers: Map<string, number> = new Map()
): Planet[] {
  const canvasW = w || 400;
  const canvasH = h || 300;
  const getRadius = radiusFn || planetRadius;
  const activeDt = customDt !== undefined ? customDt : DT;

  // 1. Pre-calculate neighbor counts for multi-body logic
  const neighborCounts = planets.map((pi, i) => {
    let count = 0;
    for (let j = 0; j < planets.length; j++) {
      if (i === j) continue;
      const pj = planets[j];
      const [dx, dy] = toroidalDelta(pi.x, pi.y, pj.x, pj.y, canvasW, canvasH);
      const distSq = dx * dx + dy * dy;
      const touchDist = getRadius(pi.mass) + getRadius(pj.mass) + MIN_SEPARATION;
      const spinRadius = touchDist * 1.8;
      if (distSq < spinRadius * spinRadius) count++;
    }
    return count;
  });

  const newPlanets = planets.map((pi, i) => {
    let fx = 0;
    let fy = 0;

    for (let j = 0; j < planets.length; j++) {
      if (i === j) continue;
      const pj = planets[j];

      const [dx, dy] = toroidalDelta(pi.x, pi.y, pj.x, pj.y, canvasW, canvasH);
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist < 0.5) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const touchDist = getRadius(pi.mass) + getRadius(pj.mass) + MIN_SEPARATION;

      // 1. Grouped Gravitational Attraction
      if (options.gravity !== false) {
        const sameGroup = pi.monthId === pj.monthId;
        if (sameGroup) {
          const gravForce = (G * pi.mass * pj.mass) / Math.max(distSq, touchDist * touchDist);
          fx += nx * gravForce;
          fy += ny * gravForce;
        }
      }

      // 2. Spinning Repulsion (Tangent Forces with Delay - Only for 3+ body clusters)
      if (options.spinning !== false && neighborCounts[i] >= 2 && neighborCounts[j] >= 2) {
        const spinRadius = touchDist * 1.8;
        const pairKey = pi.id < pj.id ? `${pi.id}:${pj.id}` : `${pj.id}:${pi.id}`;

        if (dist < spinRadius) {
          const currentTimer = contactTimers.get(pairKey) || 0;
          const newTimer = currentTimer + activeDt;
          contactTimers.set(pairKey, newTimer);

          if (newTimer > SPIN_DELAY_SEC) {
            // Force perpendicular to normal creates orbital "spin"
            const tangentX = -ny;
            const tangentY = nx;
            const spinMagnitude = 250 * (1 - dist / spinRadius);
            fx += tangentX * spinMagnitude;
            fy += tangentY * spinMagnitude;
          }
        } else {
          contactTimers.set(pairKey, 0);
        }
      }

      // 3. Soft Contact Repulsion
      if (dist < touchDist) {
        const overlap = touchDist - dist;
        const repelForce = 300 * overlap / touchDist;
        fx -= nx * repelForce;
        fy -= ny * repelForce;

        // 4. Inter-planet Surface Friction
        const friction = 2.5;
        fx -= (pi.vx - pj.vx) * friction;
        fy -= (pi.vy - pj.vy) * friction;
      }
    }

    const ax = fx / pi.mass;
    const ay = fy / pi.mass;
    // Timestep-normalized damping (0.9925 baseline @ 0.016s)
    const damping = Math.pow(0.9925, activeDt / 0.016);

    let nvx = (pi.vx + ax * activeDt) * damping;
    let nvy = (pi.vy + ay * activeDt) * damping;

    const speed = Math.sqrt(nvx * nvx + nvy * nvy);
    if (speed > MAX_SPEED) {
      nvx = (nvx / speed) * MAX_SPEED;
      nvy = (nvy / speed) * MAX_SPEED;
    }

    let [nx2, ny2] = wrapPosition(pi.x + nvx * activeDt, pi.y + nvy * activeDt, canvasW, canvasH);
    return { ...pi, x: nx2, y: ny2, vx: nvx, vy: nvy };
  });

  // Hard Overlap Correction (only when unpaused)
  if (activeDt > 0) {
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < newPlanets.length; i++) {
        for (let j = i + 1; j < newPlanets.length; j++) {
          const pi = newPlanets[i];
          const pj = newPlanets[j];
          const [dx, dy] = toroidalDelta(pi.x, pi.y, pj.x, pj.y, canvasW, canvasH);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const touchDist = getRadius(pi.mass) + getRadius(pj.mass) + MIN_SEPARATION;

          if (dist < touchDist && dist > 0.01) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (touchDist - dist) * 0.5;
            const [ax, ay] = wrapPosition(pi.x - nx * overlap, pi.y - ny * overlap, canvasW, canvasH);
            const [bx, by] = wrapPosition(pj.x + nx * overlap, pj.y + ny * overlap, canvasW, canvasH);

            // Cancel approach velocity along the contact normal to prevent jitter.
            // approach > 0 means pi is moving toward pj; correct only then.
            const approach = (pi.vx - pj.vx) * nx + (pi.vy - pj.vy) * ny;
            if (approach > 0) {
              const totalMass = pi.mass + pj.mass;
              const impulseI = approach * pj.mass / totalMass;
              const impulseJ = approach * pi.mass / totalMass;
              newPlanets[i] = { ...pi, x: ax, y: ay, vx: pi.vx - impulseI * nx, vy: pi.vy - impulseI * ny };
              newPlanets[j] = { ...pj, x: bx, y: by, vx: pj.vx + impulseJ * nx, vy: pj.vy + impulseJ * ny };
            } else {
              newPlanets[i] = { ...pi, x: ax, y: ay };
              newPlanets[j] = { ...pj, x: bx, y: by };
            }
          }
        }
      }
    }
  }

  return newPlanets;
}

/**
 * Returns ghost positions for toroidal rendering.
 */
export function getGhostPositions(x: number, y: number, r: number, w: number, h: number): [number, number][] {
  const positions: [number, number][] = [[x, y]];
  const margin = r * 4;
  const nearLeft = x < margin;
  const nearRight = x > w - margin;
  const nearTop = y < margin;
  const nearBottom = y > h - margin;
  if (nearLeft) positions.push([x + w, y]);
  if (nearRight) positions.push([x - w, y]);
  if (nearTop) positions.push([x, y + h]);
  if (nearBottom) positions.push([x, y - h]);
  if (nearLeft && nearTop) positions.push([x + w, y + h]);
  if (nearLeft && nearBottom) positions.push([x + w, y - h]);
  if (nearRight && nearTop) positions.push([x - w, y + h]);
  if (nearRight && nearBottom) positions.push([x - w, y - h]);
  return positions;
}
