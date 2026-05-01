// Professional basketball physics engine — meter-space with 120Hz Verlet integration
// All physics in SI units (meters, m/s, m/s², rad/s) with CCD for rim collisions

import type { TrajectoryCheckpoint } from '@/lib/game/trajectoryHash';

export type ShotOutcome = 'swish' | 'rattle_in' | 'rattle_out' | 'front_rim_out' | 'back_rim_out' | 'airball' | 'bank' | 'bank_miss' | 'in_progress';

export interface PhysicsConstantsM {
  GRAVITY: number; BALL_MASS: number; BALL_RADIUS_M: number; RIM_RADIUS_M: number;
  RIM_TUBE_R_M: number; NET_ZONE_DEPTH_M: number; E_RIM: number; MU_RIM: number;
  Cd: number; Cm: number; OMEGA_DECAY: number;
  HOOP_X_M: number; HOOP_Y_M: number; BOARD_X_M: number; BOARD_TOP_M: number; BOARD_BOT_M: number; GROUND_Y_M: number;
  POLE_X_M?: number; // Стійка X координата (опціонально)
}

export interface BallStateM {
  _x_m: number; _y_m: number; vx: number; vy: number; omega: number; _accumulator: number; _physTick: number;
  _checkpoints: TrajectoryCheckpoint[]; _scale: number; rimContacts: number; rimContactMask: number;
  hitBackboard: boolean; rimHitTimer: number; x: number; y: number; rot: number;
  state: 'flying' | 'scored' | 'missed' | 'idle'; scoredGoal: boolean; outcome: ShotOutcome; spin: number;
  owner?: number; bounceCount?: number; boardHandled?: boolean; isGuided?: boolean; guaranteedScore?: boolean;
  frameCount?: number; T?: number; targetX?: number; targetY?: number; rimBounceCount?: number; angularVelocity?: number; drag?: number;
}

export interface CcdResult { hit: boolean; t: number; nx: number; ny: number; }

export interface BallPhysicsState { x: number; y: number; vx: number; vy: number; rot: number; spin: number; drag: number; bounceCount: number; rimBounceCount: number; }

export interface LaunchParams {
  // Old interface (legacy, still supported for backward compat)
  angle?: number; power?: number; accuracy?: number; distToHoop?: number; playerX?: number; playerY?: number; hoopX?: number; hoopY?: number; scaleX?: number;
  // New metric interface (preferred)
  vx_m?: number; vy_m?: number; x0_m?: number; y0_m?: number; scale?: number; groundY_m?: number;
}

export interface RimCollisionResult { newVx: number; newVy: number; outcome: string; shouldScore: boolean; }

export interface BackboardCollisionResult { newVx: number; newVy: number; bounced: boolean; }

export function integratePhysics(b: BallStateM, dt: number, C: PhysicsConstantsM): void {
  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  const dragAcc = C.Cd * speed;
  const ax = -dragAcc * b.vx - C.Cm * b.omega * b.vy;
  const ay = C.GRAVITY - dragAcc * b.vy + C.Cm * b.omega * b.vx;
  b._x_m += b.vx * dt + 0.5 * ax * dt * dt;
  b._y_m += b.vy * dt + 0.5 * ay * dt * dt;
  b.vx += ax * dt;
  b.vy += ay * dt;
  b.omega *= C.OMEGA_DECAY;
  b.spin = b.omega;
}

export function sweepSphereVsSphere(b: BallStateM, rimCenter: { x: number; y: number }, contactRadius: number, dt: number): CcdResult {
  const rx = b._x_m - rimCenter.x, ry = b._y_m - rimCenter.y, vx = b.vx, vy = b.vy;
  const a = vx * vx + vy * vy;
  if (a < 1e-12) return { hit: false, t: 0, nx: 0, ny: 0 };
  const b_c = 2 * (rx * vx + ry * vy), c_c = rx * rx + ry * ry - contactRadius * contactRadius;
  const disc = b_c * b_c - 4 * a * c_c;
  if (disc < 0) return { hit: false, t: 0, nx: 0, ny: 0 };
  const sqD = Math.sqrt(disc), t1 = (-b_c - sqD) / (2 * a), t2 = (-b_c + sqD) / (2 * a);
  let t = -1;
  if (t1 >= 1e-6 && t1 <= dt) t = t1;
  else if (t2 >= 1e-6 && t2 <= dt) t = t2;
  else return { hit: false, t: 0, nx: 0, ny: 0 };
  const cx = rx + vx * t, cy = ry + vy * t, dist = Math.sqrt(cx * cx + cy * cy) || 1;
  const nx = cx / dist, ny = cy / dist, vR = b.vx * nx + b.vy * ny;
  if (vR >= 0) return { hit: false, t: 0, nx: 0, ny: 0 };
  return { hit: true, t, nx, ny };
}

function applyRimImpulse(b: BallStateM, ccd: CcdResult, C: PhysicsConstantsM): void {
  const vn = b.vx * ccd.nx + b.vy * ccd.ny;
  const J_n = -(1 + C.E_RIM) * vn;
  const vtx = b.vx - vn * ccd.nx, vty = b.vy - vn * ccd.ny;
  const vt_mag = Math.sqrt(vtx * vtx + vty * vty);
  const v_spin = b.omega * C.BALL_RADIUS_M;
  const vt_eff = vt_mag + v_spin;
  const J_t = Math.min(C.MU_RIM * Math.abs(J_n), Math.abs(vt_eff)) * (vt_eff > 0 ? -1 : 1);
  b.vx += J_n * ccd.nx + J_t * ccd.ny;
  b.vy += J_n * ccd.ny - J_t * ccd.nx;
  b.omega *= 0.70;

  // 🚨 АНТИ-ЗАСТРЯГАННЯ: М'яч не завис на кільці
  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  if (speed < 0.5) {
    const pushDir = (b._x_m - C.HOOP_X_M) > 0 ? 1 : -1;
    b.vx += pushDir * 1.5;
    b.vy += 2.0;
  }
}

function checkBackboardCollision(b: BallStateM, C: PhysicsConstantsM): void {
  if (b.boardHandled || b.vx >= 0) return;
  const bx = b._x_m, face = C.BOARD_X_M;
  if (bx - C.BALL_RADIUS_M <= face && bx >= face - 0.1 && b._y_m >= C.BOARD_TOP_M && b._y_m <= C.BOARD_BOT_M) {
    b.boardHandled = true;
    b.hitBackboard = true;
    b._x_m = face + C.BALL_RADIUS_M;
    b.vx = -b.vx * 0.66;  // Backboard bounciness (GitHub)
    b.vy = b.vy * 0.62;   // 1 - 0.38 friction (GitHub)
  }
}

function checkPoleCollision(b: BallStateM, C: PhysicsConstantsM): void {
  // 🚨 ВИПРАВЛЕННЯ 2: Колізія зі стійкою (вертикальний циліндр)
  if (C.POLE_X_M === undefined || C.POLE_X_M === null) return; // Стійка не визначена

  const POLE_HALF_WIDTH = 0.05; // Половина ширини стійки в метрах (~10px для SCALE 100)
  const dx = b._x_m - C.POLE_X_M;

  // Перевіряємо чи м'яч торкається стійки
  if (Math.abs(dx) < POLE_HALF_WIDTH + C.BALL_RADIUS_M) {
    // М'яч торкнувся стійки — відштовхнемо його назад до гравців
    const pushDir = dx > 0 ? 1 : -1;
    b._x_m = C.POLE_X_M + pushDir * (POLE_HALF_WIDTH + C.BALL_RADIUS_M + 0.01);

    // Відскок з поглинанням енергії
    b.vx = -b.vx * 0.7;
    b.vy *= 0.9;
  }
}

export function checkAllCollisions(b: BallStateM, dt: number, C: PhysicsConstantsM): void {
  checkBackboardCollision(b, C);
  checkPoleCollision(b, C);

  // 🏀 8-POINT RIM COLLISION SYSTEM
  // Проверяем только боковые точки (|cos(angle)| > 0.25 = дужки слева и справа)
  const NUM_RIM_POINTS = 8;
  let bestCcd: CcdResult | null = null;
  let bestT = dt;

  for (let i = 0; i < NUM_RIM_POINTS; i++) {
    const angle = (i / NUM_RIM_POINTS) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Пропускаем точки сверху и снизу (| cosA | < 0.25 = верх и низ эллипса)
    if (Math.abs(cosA) < 0.25) continue;

    const rimX = C.HOOP_X_M + cosA * C.RIM_RADIUS_M;
    const rimY = C.HOOP_Y_M + sinA * C.RIM_RADIUS_M * 0.3;

    const ccd = sweepSphereVsSphere(
      b,
      { x: rimX, y: rimY },
      C.RIM_TUBE_R_M + C.BALL_RADIUS_M,
      dt
    );

    if (ccd.hit && ccd.t < bestT) {
      bestCcd = ccd;
      bestT = ccd.t;
    }
  }

  if (bestCcd && bestCcd.hit) {
    integratePhysics(b, bestCcd.t, C);
    applyRimImpulse(b, bestCcd, C);
    b.rimContacts++;
    // Determine front/back based on X position of rim
    const rimX = bestCcd.nx > 0 ? 1 : -1; // nx = normal X direction
    if (rimX > 0) b.rimContactMask |= 0b001;
    else b.rimContactMask |= 0b010;
    b.rimHitTimer = 18;
    const rem = dt - bestCcd.t;
    if (rem > 1e-6) integratePhysics(b, rem, C);
  }
  if (b._y_m + C.BALL_RADIUS_M >= C.GROUND_Y_M) {
    b._y_m = C.GROUND_Y_M - C.BALL_RADIUS_M;

    // 🚨 ВИПРАВЛЕННЯ 1: Реалістичний відскок від підлоги (NBA баскетбольний м'яч)
    const FLOOR_RESTITUTION = 0.62; // Стандартна упругість NBA м'яча
    const FLOOR_FRICTION = 0.4;

    if (Math.abs(b.vy) > 0.5) {
      // М'яч має досить енергії для відскоку
      b.vy = -b.vy * FLOOR_RESTITUTION; // Відскок вгору з поглинанням енергії
      b.vx = b.vx * (1 - FLOOR_FRICTION); // Тертя сповільнює горизонтальну швидкість
      b.omega *= 0.7; // Spin зменшується при контакті
      b.bounceCount = (b.bounceCount || 0) + 1;

      // Після 4 відскоків м'яч вважається зупиненим
      if ((b.bounceCount || 0) >= 4) {
        b.vx = 0; b.vy = 0; b.state = 'missed';
      }
    } else {
      // М'яч мало енергії — зупиняється
      b.vy = 0;
      b.vx *= 0.85;
      if (Math.abs(b.vx) < 0.1) {
        b.vx = 0;
        b.state = 'missed'; // М'яч повністю зупинений на підлозі
      }
    }
  }
}

export function checkGoalEntry(b: BallStateM, C: PhysicsConstantsM): boolean {
  // Deprecated: replaced by checkGateScoring (Top/Bottom Gate system)
  return false;
}

export function checkGateScoring(b: BallStateM, C: PhysicsConstantsM): boolean {
  // ⭐ TOP/BOTTOM GATE SCORING SYSTEM (from GitHub)
  // М'яч входить через верхню браму (Top Gate) і виходить через нижню (Bottom Gate)

  if (b.scoredGoal) return false;

  // М'яч ПОВИНЕН рухатись ВНИЗ (в canvas coords: vy > 0)
  if (b.vy <= 0) return false;

  // ширина воріт (85% від радіуса дужки)
  const gateHalfWidth = C.RIM_RADIUS_M * 0.85;
  const dx = Math.abs(b._x_m - C.HOOP_X_M);
  if (dx > gateHalfWidth) return false;

  // TOP GATE: м'яч входить зверху (трохи вище центру)
  // BOTTOM GATE: м'яч виходить знизу (0.35м нижче центру)
  const topGateY = C.HOOP_Y_M + 0.05;    // Верхня брама
  const bottomGateY = C.HOOP_Y_M + 0.35; // Нижня брама

  // Перевірити що м'яч між top і bottom gate (пройшов крізь кільце)
  if (b._y_m < topGateY || b._y_m > bottomGateY) return false;

  // ГОЛ! М'яч пройшов крізь обидві брами
  b.scoredGoal = true;
  b.state = 'scored';

  // Визначити тип гола (залежно від кількості торкань дужки)
  const rc = b.rimContacts || 0;
  if (rc === 0) {
    b.outcome = 'swish';      // Прямий гол без дотику
  } else if (rc <= 2) {
    b.outcome = 'rattle_in';  // 1-2 торкання
  } else {
    b.outcome = 'rattle_in';  // 3+ торкання (щастя)
  }

  return true;
}

// ⚙️ BASKETBALL THROW CONSTANTS (фізика реального кидка)
export const THROW_CONSTANTS = {
  GRAVITY: 9.81,           // м/с²
  MAX_THROW_SPEED: 18.0,   // м/с (максимум)
  MIN_THROW_SPEED: 4.0,    // м/с (мінімум)
  COURT_LENGTH_M: 15.0,    // довжина корту (SCALE basis)
  ARC_FACTOR: 1.15,        // множник для дуги (вище = більша дуга)
  POWER_SCALE: 0.8,        // power 100% = 80% від ідеальної швидкості + запас
  GREEN_ZONE_WIDTH: 0.12,  // ширина зеленої зони (±6% від ідеалу)
};

// Фізична формула ідеальної швидкості кидка
// v = sqrt(g * d² / (2 * cos²(θ) * (d*tan(θ) - h)))
// де: d = горизонтальна відстань, θ = кут від горизонталі, h = різниця висот
export function computeIdealSpeed(
  distToHoop_m: number,
  angle: number,        // від горизонталі (від'ємне = вгору)
  heightDiff_m: number  // HOOP_Y_M - player_Y_M (позитивне якщо кільце нижче)
): number {
  const g = THROW_CONSTANTS.GRAVITY;
  const theta = -angle;  // angle від'ємне у canvas, нам потрібне позитивне
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const tanT = Math.tan(theta);

  const numerator = g * distToHoop_m * distToHoop_m;
  const denominator = 2 * cosT * cosT * (distToHoop_m * tanT - heightDiff_m);

  if (denominator <= 0) return THROW_CONSTANTS.MIN_THROW_SPEED;

  const v2 = numerator / denominator;
  if (v2 <= 0) return THROW_CONSTANTS.MIN_THROW_SPEED;

  const v = Math.sqrt(v2);
  return Math.max(THROW_CONSTANTS.MIN_THROW_SPEED, Math.min(THROW_CONSTANTS.MAX_THROW_SPEED, v));
}

export function computeLaunchVelocityMeters(p: { angle: number; power: number; accuracy: number; distToHoop_m: number; px_m?: number; py_m?: number; heightDiff_m?: number }): { vx_m: number; vy_m: number; omega: number } {
  // Обчислити ідеальну швидкість фізично
  const heightDiff = p.heightDiff_m || 0;
  const idealSpeed = computeIdealSpeed(p.distToHoop_m, p.angle, heightDiff);

  // Power масштабуємо від 0-100 (не 0-200)
  // 100% power = 80% від ідеальної швидкості (з запасом)
  // 0% power = 40% від ідеальної швидкості
  const powerNorm = Math.max(0, Math.min(1, p.power / 100));
  const speedMultiplier = 0.4 + powerNorm * THROW_CONSTANTS.POWER_SCALE;
  const ls = idealSpeed * speedMultiplier;

  const vx_m = Math.cos(p.angle) * ls;
  const vy_m = Math.sin(p.angle) * ls;

  // Calculate backspin based on angle (high arc = backspin)
  const angleDeg = p.angle * (180 / Math.PI);
  let omega = angleDeg > 55 ? -(0.8 + (angleDeg - 55) * 0.01) : 0.2 + (50 - angleDeg) * 0.01;

  return { vx_m, vy_m, omega };
}

export function stepPhysics(): void {}
export function computeRimCollision(): RimCollisionResult { return { newVx: 0, newVy: 0, outcome: 'MISS', shouldScore: false }; }
export function computeBackboardCollision(): BackboardCollisionResult { return { newVx: 0, newVy: 0, bounced: false }; }
export function computeFloorBounce(b: BallPhysicsState): BallPhysicsState { return b; }

export function calculateAccuracy(mp: number, zc: number, t: number = 0.08): number {
  const d = Math.abs(mp - zc);
  if (d < t / 2) return 100;
  if (d < t) return 95 + Math.random() * 5;
  return Math.round(Math.max(5, 90 * (1 - ((d - t) / (1 - t)) ** 2)));
}

export function calculateGreenZonePosition(d: number, min: number = 0, max: number = 800): number {
  const nd = Math.max(0, Math.min(1, (d - min) / (max - min)));
  return Math.max(0.05, Math.min(0.95, 0.1 + nd * 0.8));
}

export function simulateTrajectory(p: {
  vx_m: number; vy_m: number;
  x0_m: number; y0_m: number;
  scale: number; groundY_m: number;
  hoopX_m?: number; hoopY_m?: number;
}): Array<{ x: number; y: number }> {
  const g = 9.81, dt = 1/120;
  const Cd = 0.004;  // Same as C.Cd in integratePhysics
  const Cm = 0.000045;  // Same as C.Cm in integratePhysics (set omega=0 for ideal arc)
  const pts: {x:number,y:number}[] = [];
  let x = p.x0_m, y = p.y0_m, vx = p.vx_m, vy = p.vy_m;
  const omega = 0;  // No spin for ideal arc calculation (simplified)

  for (let i = 0; i < 600; i++) {
    // Apply physics: drag + gravity (magnus=0 since omega=0)
    const speed = Math.sqrt(vx * vx + vy * vy);
    const dragAcc = Cd * speed;
    const ax = -dragAcc * vx;  // Drag on X
    const ay = g - dragAcc * vy;  // Gravity - drag on Y (same sign as integratePhysics)

    // Verlet integration (same as integratePhysics)
    x += vx * dt + 0.5 * ax * dt * dt;
    y += vy * dt + 0.5 * ay * dt * dt;
    vx += ax * dt;
    vy += ay * dt;

    pts.push({ x: x * p.scale, y: y * p.scale });

    // Stop if reached hoop
    if (p.hoopX_m && p.hoopY_m) {
      if (Math.abs(x - p.hoopX_m) < 0.15 && Math.abs(y - p.hoopY_m) < 0.25 && vy > 0) {
        pts.push({ x: p.hoopX_m * p.scale, y: p.hoopY_m * p.scale });
        break;
      }
    }

    if (y > p.groundY_m + 0.5) break;
  }
  return pts;
}

export function updateOscillator(cp: number, a: number = 0.3, f: number = 2.5): number {
  const t = (Date.now() % 10000) / 10000;
  return cp + a * Math.sin(t * f * Math.PI * 2);
}

export function computeLaunchVelocity(p: LaunchParams): { vx: number; vy: number; spin: number } {
  // Legacy function - deprecated, use computeLaunchVelocityMeters instead
  if (!p.power || !p.distToHoop || !p.angle || p.accuracy === undefined) {
    return { vx: 0, vy: 0, spin: 0 };
  }
  const pm = 0.3 + (p.power / 200) * 1.7, bs = 10 + (p.distToHoop / 500) * 8, ls = bs * pm;
  const vx = Math.cos(p.angle) * ls, vy = Math.sin(p.angle) * ls;
  const ad = Math.abs(p.angle * (180 / Math.PI));
  let spin = ad > 55 ? -0.8 - (ad - 55) * 0.01 : 0.2 + (50 - ad) * 0.01;
  if (p.accuracy > 90) return { vx: vx * 1.2, vy: vy * 1.2, spin };
  return { vx, vy, spin };
}

export interface BallPhysicsResult { newVx: number; newVy: number; newRot: number; state: string; outcome: string; }
export interface CollisionType { type: string; }

export const PHYSICS_CONSTANTS = {
  GRAVITY: 0.42, DRAG_COEFFICIENT: 0.0018, RIM_RESTITUTION: 0.68, RIM_FRICTION: 0.82,
  BACKBOARD_RESTITUTION_X: 0.55, BACKBOARD_RESTITUTION_Y: 0.70, FLOOR_RESTITUTION: 0.60, FLOOR_FRICTION: 0.75,
  MIN_BOUNCE_SPEED: 1.5, MAX_BOUNCES: 4, BALL_RADIUS: 10, SPIN_DAMPING: 0.97, SPIN_EFFECT_MAGNITUDE: 0.003,
} as const;
