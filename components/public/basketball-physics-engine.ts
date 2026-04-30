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

export interface LaunchParams { angle: number; power: number; accuracy: number; distToHoop: number; playerX: number; playerY: number; hoopX: number; hoopY: number; scaleX: number; }

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
    b.vx = -b.vx * 0.55;
    b.vy = b.vy * 0.70;
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
  const ccdF = sweepSphereVsSphere(b, { x: C.HOOP_X_M + C.RIM_RADIUS_M, y: C.HOOP_Y_M }, C.RIM_TUBE_R_M + C.BALL_RADIUS_M, dt);
  const ccdB = sweepSphereVsSphere(b, { x: C.HOOP_X_M - C.RIM_RADIUS_M, y: C.HOOP_Y_M }, C.RIM_TUBE_R_M + C.BALL_RADIUS_M, dt);
  const isFront = ccdF.hit && (!ccdB.hit || ccdF.t <= ccdB.t);
  const ccd = isFront && ccdF.hit ? ccdF : ccdB.hit ? ccdB : null;
  if (ccd && ccd.hit) {
    integratePhysics(b, ccd.t, C);
    applyRimImpulse(b, ccd, C);
    b.rimContacts++;
    if (isFront) b.rimContactMask |= 0b001;
    else b.rimContactMask |= 0b010;
    b.rimHitTimer = 18;
    const rem = dt - ccd.t;
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

export function computeLaunchVelocityMeters(p: { angle: number; power: number; accuracy: number; distToHoop_m: number; px_m?: number; py_m?: number }): { vx_m: number; vy_m: number; omega: number } {
  const bs = 6.0 + (p.distToHoop_m / 15.0) * 8.0;
  const ls = bs * (0.3 + (p.power / 200) * 1.7);
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

export function simulateTrajectory(p: LaunchParams): Array<{ x: number; y: number }> {
  // Use the same physics as real shot: compute launch velocity from angle and power
  const SCALE = p.scaleX * 15.0;  // pixels per meter (court is 15m)
  const px_m = p.playerX / SCALE;
  const py_m = p.playerY / SCALE;
  const distToHoop_m = Math.hypot(p.hoopX / SCALE - px_m, p.hoopY / SCALE - py_m);

  const { vx_m, vy_m } = computeLaunchVelocityMeters({
    angle: p.angle,
    power: p.power,
    accuracy: p.accuracy || 0,
    distToHoop_m, px_m, py_m,
  });

  // Simulate trajectory using same integration as stepBall
  const ball = {
    _x_m: px_m,
    _y_m: py_m,
    vx: vx_m,
    vy: vy_m,
    omega: 0,
  };

  const C: PhysicsConstantsM = {
    GRAVITY: 9.81,
    BALL_MASS: 0.623,
    BALL_RADIUS_M: 0.12,
    RIM_RADIUS_M: 0.6,  // Увеличено чтобы соответствовать визуальному HOOP_R=27px (вместо 10px)
    RIM_TUBE_R_M: 0.023,
    NET_ZONE_DEPTH_M: 0.8,
    E_RIM: 0.82,
    MU_RIM: 0.25,
    Cd: 0.004,
    Cm: 0.000045,
    OMEGA_DECAY: 0.985,
    HOOP_X_M: p.hoopX / SCALE,
    HOOP_Y_M: p.hoopY / SCALE,
    BOARD_X_M: (p.hoopX - 0) / SCALE,  // approximation
    BOARD_TOP_M: (p.hoopY - 107) / SCALE,
    BOARD_BOT_M: (p.hoopY - 41) / SCALE,
    GROUND_Y_M: (p.playerY + 34) / SCALE,  // ground below player
  };

  const pts: Array<{ x: number; y: number }> = [];
  const FIXED_DT = 1 / 120;  // 120Hz physics
  let time = 0;

  // Simulate until ball goes out of bounds or hits ground
  for (let tick = 0; tick < 500 && time < 5; tick++) {
    // Record trajectory point
    pts.push({ x: ball._x_m * SCALE, y: ball._y_m * SCALE });

    // Integrate physics
    integratePhysics(ball as BallStateM, FIXED_DT, C);

    // Stop if ball hits ground
    if (ball._y_m + C.BALL_RADIUS_M >= C.GROUND_Y_M) break;

    time += FIXED_DT;
  }

  return pts;
}

export function updateOscillator(cp: number, a: number = 0.3, f: number = 2.5): number {
  const t = (Date.now() % 10000) / 10000;
  return cp + a * Math.sin(t * f * Math.PI * 2);
}

export function computeLaunchVelocity(p: LaunchParams): { vx: number; vy: number; spin: number } {
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
