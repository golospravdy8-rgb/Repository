// Trajectory hashing for multiplayer desync detection
// Records ball trajectory checkpoints and classifies shot outcomes for server validation

export interface TrajectoryCheckpoint {
  tick: number;  // physics tick number
  x: number;     // meters, 3 decimal places
  y: number;     // meters, 3 decimal places
  vx: number;    // m/s, 2 decimal places
  vy: number;    // m/s, 2 decimal places
}

export interface TrajectoryHash {
  checkpoints: TrajectoryCheckpoint[];
  launchHash: string;   // base64 of launch params JSON
  outcomeHash: string;  // base64 of outcome classification
}

// Pure TS base64 that works in browser (btoa) and Node.js (Buffer)
function toBase64(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  // Node.js fallback
  return Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * Generate launch parameter hash for detecting if initial conditions match
 */
export function generateLaunchHash(params: {
  x_m: number;
  y_m: number;
  vx_m: number;
  vy_m: number;
  omega: number;
  launchTick: number;
}): string {
  const json = JSON.stringify({
    x: +params.x_m.toFixed(3),
    y: +params.y_m.toFixed(3),
    vx: +params.vx_m.toFixed(2),
    vy: +params.vy_m.toFixed(2),
    w: +params.omega.toFixed(2),
    t: params.launchTick,
  });
  return toBase64(json);
}

/**
 * Record a checkpoint every 30 physics ticks (0.25 sec at 120Hz)
 */
export function recordCheckpoint(
  b: { x: number; y: number; vx: number; vy: number; _physTick: number },
  checkpoints: TrajectoryCheckpoint[]
): void {
  checkpoints.push({
    tick: b._physTick,
    x: +b.x.toFixed(3),
    y: +b.y.toFixed(3),
    vx: +b.vx.toFixed(2),
    vy: +b.vy.toFixed(2),
  });
}

/**
 * Generate outcome hash for comparing final shot results
 */
export function generateOutcomeHash(
  outcome: string,
  rimContacts: number,
  scored: boolean
): string {
  const json = JSON.stringify({
    outcome,
    rimContacts,
    scored,
  });
  return toBase64(json);
}

/**
 * Compare server trajectory checkpoints with client's predicted trajectory
 * Used to detect desync and decide which outcome is authoritative
 */
export function compareTrajectories(
  serverCheckpoints: TrajectoryCheckpoint[],
  clientCheckpoints: TrajectoryCheckpoint[],
  thresholdX: number = 0.05,  // meters
  thresholdY: number = 0.05   // meters
): { desync: boolean; firstDeviationTick: number } {
  const minLen = Math.min(serverCheckpoints.length, clientCheckpoints.length);

  for (let i = 0; i < minLen; i++) {
    const s = serverCheckpoints[i];
    const c = clientCheckpoints[i];

    if (s.tick !== c.tick) continue;

    const dx = Math.abs(s.x - c.x);
    const dy = Math.abs(s.y - c.y);

    if (dx > thresholdX || dy > thresholdY) {
      return {
        desync: true,
        firstDeviationTick: s.tick,
      };
    }
  }

  return {
    desync: false,
    firstDeviationTick: -1,
  };
}
