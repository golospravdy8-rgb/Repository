/**
 * Basketball Physics Engine
 * High-fidelity physics simulation for basketball shot mechanics
 *
 * Features:
 * - Realistic drag and air resistance
 * - Spin mechanics (backspin/topspin)
 * - Proper rim collision physics
 * - Bankboard bounce simulation
 * - Floor bounce with friction
 */

// Physics constants calibrated for 60 FPS canvas environment
export const PHYSICS_CONSTANTS = {
  // Gravity in px/frame² (calibrated for ~1m = 35px)
  GRAVITY: 0.42,

  // Air resistance / drag coefficient
  DRAG_COEFFICIENT: 0.0018,

  // Rim collision (steel rim)
  RIM_RESTITUTION: 0.68,
  RIM_FRICTION: 0.82,

  // Backboard collision (glass)
  BACKBOARD_RESTITUTION_X: 0.55,
  BACKBOARD_RESTITUTION_Y: 0.70,

  // Floor collision
  FLOOR_RESTITUTION: 0.60,
  FLOOR_FRICTION: 0.75,
  MIN_BOUNCE_SPEED: 1.5,
  MAX_BOUNCES: 4,

  // Ball properties
  BALL_RADIUS: 10,

  // Spin effect
  SPIN_DAMPING: 0.97,
  SPIN_EFFECT_MAGNITUDE: 0.003,
};

export interface BallPhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  drag: number;
  bounceCount: number;
  rimBounceCount: number;
}

export interface LaunchParams {
  angle: number;        // radians (-π/2 to 0)
  power: number;        // 0-200
  accuracy: number;     // 0-100
  distToHoop: number;   // pixels
  playerX: number;
  playerY: number;
  hoopX: number;
  hoopY: number;
  scaleX: number;
}

export interface RimCollisionResult {
  newVx: number;
  newVy: number;
  outcome: 'SWISH' | 'RATTLE_IN' | 'RIM_OUT' | 'RIM_OUT_BACK' | 'LONG_BOUNCE' | 'MISS';
  shouldScore: boolean;
}

export interface BackboardCollisionResult {
  newVx: number;
  newVy: number;
  bounced: boolean;
}

/**
 * Compute launch velocity with spin and drag compensation
 */
export function computeLaunchVelocity(params: LaunchParams): { vx: number; vy: number; spin: number } {
  const { angle, power, accuracy, distToHoop, playerX, playerY, hoopX, hoopY } = params;

  // Power affects launch speed (0-200% → multiplier 0.3-2.0)
  const powerMultiplier = 0.3 + (power / 200) * 1.7;

  // Base speed calibrated to reach hoop at 100% power
  const baseSpeed = 10 + (distToHoop / 500) * 8; // 10-18 px/frame
  const launchSpeed = baseSpeed * powerMultiplier;

  // Angle to velocity
  const vx = Math.cos(angle) * launchSpeed;
  const vy = Math.sin(angle) * launchSpeed;

  // Spin determination based on angle
  // High arc (angle < -0.9, ~52°+) gets backspin
  // Low arc gets topspin
  const angleDeg = Math.abs(angle * 180 / Math.PI);
  let spin = 0;

  if (angleDeg > 55) {
    // High arc → backspin (negative, reduces horizontal drift at peak)
    spin = -0.8 - (angleDeg - 55) * 0.01; // -0.8 to -1.0
  } else {
    // Lower arc → topspin (positive, aids rotation)
    spin = 0.2 + (50 - angleDeg) * 0.01; // 0.2 to 0.5
  }

  // Accuracy compensation: very accurate shots compensate for drag slightly
  if (accuracy > 90) {
    // At accuracy > 92%, add slight speed boost to ensure hoop reach
    const speedBoost = (accuracy - 90) / 10 * 0.2;
    return {
      vx: vx * (1 + speedBoost),
      vy: vy * (1 + speedBoost),
      spin
    };
  }

  return { vx, vy, spin };
}

/**
 * Step physics by one frame with drag, gravity, and spin
 */
export function stepPhysics(ball: BallPhysicsState, dt: number): void {
  const { GRAVITY, DRAG_COEFFICIENT, SPIN_DAMPING, SPIN_EFFECT_MAGNITUDE } = PHYSICS_CONSTANTS;

  // Current speed for drag calculation
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

  // Drag force (proportional to velocity squared)
  const dragMagnitude = DRAG_COEFFICIENT * speed;
  const dragX = -dragMagnitude * ball.vx;
  const dragY = -dragMagnitude * ball.vy;

  // Apply gravity and drag to velocity
  ball.vx += dragX * dt;
  ball.vy += (GRAVITY + dragY) * dt;

  // Spin effect: backspin (negative) causes slight upward effect, topspin downward
  if (Math.abs(ball.spin) > 0.01) {
    ball.vx += ball.spin * SPIN_EFFECT_MAGNITUDE * dt;
    ball.spin *= SPIN_DAMPING;
  }

  // Update position
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Visual rotation (faster at higher speeds)
  ball.rot += (speed * 0.004) * (ball.vx > 0 ? 1 : -1);
}

/**
 * Compute rim collision physics and outcome determination
 */
export function computeRimCollision(
  ball: BallPhysicsState,
  rimX: number,
  rimY: number,
  accuracy: number,
  canvasHeight: number
): RimCollisionResult {
  const { RIM_RESTITUTION, RIM_FRICTION, BALL_RADIUS } = PHYSICS_CONSTANTS;

  // Vector from rim to ball
  const dx = ball.x - rimX;
  const dy = ball.y - rimY;
  const dist = Math.hypot(dx, dy);

  if (dist === 0) {
    return {
      newVx: 0,
      newVy: 0,
      outcome: 'SWISH',
      shouldScore: true,
    };
  }

  const nx = dx / dist; // normal X
  const ny = dy / dist; // normal Y

  // Relative velocity
  const relVx = ball.vx;
  const relVy = ball.vy;

  // Velocity component along normal
  const dotProduct = relVx * nx + relVy * ny;

  // Only bounce if ball is moving toward rim
  if (dotProduct >= 0) {
    return {
      newVx: ball.vx,
      newVy: ball.vy,
      outcome: 'MISS',
      shouldScore: false,
    };
  }

  // Reflection formula: v' = v - 2(v·n)n
  const reflectedVx = relVx - 2 * dotProduct * nx;
  const reflectedVy = relVy - 2 * dotProduct * ny;

  // Apply restitution and friction
  const newVx = reflectedVx * RIM_RESTITUTION * RIM_FRICTION;
  const newVy = reflectedVy * RIM_RESTITUTION;

  // Determine outcome based on:
  // 1. Incoming velocity angle
  // 2. Speed
  // 3. Distance from center
  // 4. Accuracy

  const incomingAngle = Math.atan2(-ball.vy, ball.vx) * (180 / Math.PI);
  const incomingSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

  let outcome: RimCollisionResult['outcome'] = 'RIM_OUT';
  let shouldScore = false;

  // High arc (45-70°) is most favorable for scoring
  if (incomingAngle > 40 && incomingAngle < 75) {
    if (incomingSpeed < 6 && accuracy > 80) {
      outcome = 'SWISH';
      shouldScore = true;
    } else if (accuracy > 75) {
      outcome = 'RATTLE_IN';
      shouldScore = true;
    } else if (accuracy > 50) {
      // 50/50 chance
      shouldScore = Math.random() < 0.5;
      outcome = shouldScore ? 'RATTLE_IN' : 'RIM_OUT';
    } else {
      outcome = 'RIM_OUT';
      shouldScore = false;
    }
  }
  // Moderate arc (30-45°)
  else if (incomingAngle > 25 && incomingAngle <= 40) {
    if (accuracy > 85) {
      outcome = 'RATTLE_IN';
      shouldScore = true;
    } else if (accuracy > 70) {
      shouldScore = Math.random() < 0.4;
      outcome = shouldScore ? 'RATTLE_IN' : 'RIM_OUT_BACK';
    } else {
      outcome = 'RIM_OUT_BACK';
      shouldScore = false;
    }
  }
  // Shallow angle (<30°)
  else {
    outcome = incomingSpeed > 8 ? 'LONG_BOUNCE' : 'RIM_OUT_BACK';
    shouldScore = accuracy > 95 ? Math.random() < 0.2 : false;
  }

  // Very low accuracy = almost always miss
  if (accuracy < 30 && outcome !== 'LONG_BOUNCE') {
    shouldScore = false;
    outcome = 'RIM_OUT';
  }

  return { newVx, newVy, outcome, shouldScore };
}

/**
 * Compute backboard collision and bounce
 */
export function computeBackboardCollision(
  ball: BallPhysicsState,
  boardX: number,
  boardTop: number,
  boardBottom: number
): BackboardCollisionResult {
  const { BACKBOARD_RESTITUTION_X, BACKBOARD_RESTITUTION_Y } = PHYSICS_CONSTANTS;

  // Simple reflection from vertical backboard
  const newVx = -ball.vx * BACKBOARD_RESTITUTION_X;
  const newVy = ball.vy * BACKBOARD_RESTITUTION_Y;

  // Add downward bias so ball comes back toward hoop
  const biasedVy = newVy + 1.5;

  return {
    newVx,
    newVy: biasedVy,
    bounced: true,
  };
}

/**
 * Compute floor bounce with friction
 */
export function computeFloorBounce(ball: BallPhysicsState, groundY: number): BallPhysicsState {
  const { FLOOR_RESTITUTION, FLOOR_FRICTION, MIN_BOUNCE_SPEED, MAX_BOUNCES } = PHYSICS_CONSTANTS;

  if (ball.y >= groundY) {
    if (ball.bounceCount < MAX_BOUNCES && Math.abs(ball.vy) >= MIN_BOUNCE_SPEED) {
      ball.y = groundY;

      // Fall angle affects restitution
      const fallAngle = Math.abs(Math.atan2(ball.vy, ball.vx));
      const effectiveRestitution = FLOOR_RESTITUTION * (0.8 + 0.4 * Math.cos(fallAngle));

      ball.vy = -ball.vy * effectiveRestitution;
      ball.vx *= FLOOR_FRICTION;
      ball.bounceCount++;
    } else {
      // Ball stopped bouncing
      ball.y = groundY;
      ball.vx = 0;
      ball.vy = 0;
    }
  }

  return ball;
}

/**
 * Simulate full trajectory for preview (must match real physics)
 */
export function simulateTrajectory(params: LaunchParams): Array<{ x: number; y: number }> {
  const { angle, power, accuracy, playerX, playerY, hoopX, hoopY, scaleX } = params;

  const { vx, vy, spin } = computeLaunchVelocity(params);

  const points: Array<{ x: number; y: number }> = [];

  let ball: BallPhysicsState = {
    x: playerX,
    y: playerY,
    vx,
    vy,
    rot: 0,
    spin,
    drag: PHYSICS_CONSTANTS.DRAG_COEFFICIENT,
    bounceCount: 0,
    rimBounceCount: 0,
  };

  points.push({ x: ball.x, y: ball.y });

  // Simulate up to 200 frames
  for (let i = 0; i < 200; i++) {
    stepPhysics(ball, 1);

    points.push({ x: ball.x, y: ball.y });

    // Stop if ball goes off screen far below
    if (ball.y > playerY + 500) break;

    // Stop on very low velocity (ball essentially stopped)
    if (Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) < 0.5) break;
  }

  return points;
}

/**
 * Utility: Determine if a shot should score based on accuracy
 * Used for guided mode (accuracy >= 92%)
 */
export function shouldGuidedScore(accuracy: number): boolean {
  return accuracy >= 92;
}

/**
 * Utility: Compute accuracy from power meter position and green zone
 */
export function computeAccuracy(
  markerPosition: number,
  zoneCenter: number,
  zoneSize: number
): number {
  const zoneMin = zoneCenter - zoneSize / 2;
  const zoneMax = zoneCenter + zoneSize / 2;

  if (markerPosition >= zoneMin && markerPosition <= zoneMax) {
    return 100;
  }

  // Accuracy falls off with distance from zone center
  const distance = Math.abs(markerPosition - zoneCenter);
  return Math.max(0, 100 - distance * 300);
}

/**
 * Batch test utility: Run full shot simulation
 */
export function simulateFullShot(params: LaunchParams, groundY: number, hoopX: number, hoopY: number): {
  scored: boolean;
  frames: number;
  outcome: string;
  finalPos: { x: number; y: number };
} {
  const { vx, vy, spin } = computeLaunchVelocity(params);

  const ball: BallPhysicsState = {
    x: params.playerX,
    y: params.playerY,
    vx,
    vy,
    rot: 0,
    spin,
    drag: PHYSICS_CONSTANTS.DRAG_COEFFICIENT,
    bounceCount: 0,
    rimBounceCount: 0,
  };

  let frames = 0;
  let scored = false;
  let outcome = 'MISS';

  const hoop_radius = 22; // pixels

  while (frames < 500 && ball.y < groundY + 200) {
    stepPhysics(ball, 1);
    frames++;

    // Check rim collision
    const distToHoop = Math.hypot(ball.x - hoopX, ball.y - hoopY);
    if (distToHoop < 40 && ball.vy > 0) {
      const result = computeRimCollision(ball, hoopX, hoopY, params.accuracy, groundY);

      if (result.shouldScore) {
        scored = true;
        outcome = result.outcome;
        break;
      }

      ball.vx = result.newVx;
      ball.vy = result.newVy;
      ball.rimBounceCount++;
    }

    // Check floor bounce
    if (ball.y >= groundY) {
      computeFloorBounce(ball, groundY);
      if (ball.bounceCount >= PHYSICS_CONSTANTS.MAX_BOUNCES) {
        outcome = 'MISSED_FLOOR';
        break;
      }
    }
  }

  return {
    scored,
    frames,
    outcome,
    finalPos: { x: ball.x, y: ball.y },
  };
}

/**
 * Distance Meter Functions — для интеграции UI індикатора відстані
 */

/**
 * Розраховує позицію Green Zone на основі відстані до кільця
 * @param distToHoop - відстань до кільця (px)
 * @param minDistance - мінімальна відстань (100px)
 * @param maxDistance - максимальна відстань (400px)
 * @returns позиція зони 0.0-1.0 (0=низ, 1=верх)
 */
export function calculateGreenZonePosition(
  distToHoop: number,
  minDistance: number = 0,
  maxDistance: number = 800
): number {
  // Dynamic Sweet Spot formula based on distance to hoop
  // Normalize distance: min distance → Sweet Spot at bottom (5-15%), max distance → Sweet Spot at top (85-95%)
  const normalizedDist = maxDistance > minDistance
    ? (distToHoop - minDistance) / (maxDistance - minDistance)
    : 0;

  // Clamp normalized distance to [0, 1]
  const clampedDist = Math.max(0, Math.min(1, normalizedDist));

  // Map to Sweet Spot position: bottom at 10%, top at 90%
  // Formula: zonePos = 0.10 + clampedDist * 0.80
  // This ensures:
  //   - At distToHoop = 0 (min) → zonePos = 0.10 (10%)
  //   - At distToHoop = maxDistance → zonePos = 0.90 (90%)
  const zonePos = 0.10 + clampedDist * 0.80;

  // Final clamp to valid meter range
  return Math.max(0.05, Math.min(0.95, zonePos));
}

/**
 * Оновлює позицію осцилюючого бігунка
 * @param centerPos - центральна позиція (де Green Zone)
 * @param amplitude - амплітуда коливання (0.3 = ±30%)
 * @param frequency - частота (Hz)
 * @returns нова позиція бігунка 0.0-1.0
 */
export function updateOscillator(
  centerPos: number,
  amplitude: number = 0.3,
  frequency: number = 2.5
): number {
  // Синусоїдальний рух
  const oscillatorValue = Math.sin((Date.now() / 1000) * frequency * Math.PI * 2);
  const oscillationOffset = oscillatorValue * amplitude;

  // Нова позиція з границями
  const sliderPos = Math.max(0.05, Math.min(0.95, centerPos + oscillationOffset));

  return sliderPos;
}

/**
 * Розраховує точність броска на основі позиції бігунка
 * @param sliderPosition - де зупинився бігунок (0.0-1.0)
 * @param greenZonePosition - де знаходиться Green Zone (0.0-1.0)
 * @param tolerance - ширина зеленої зони (0.08 = 8%)
 * @returns точність 0-100
 */
export function calculateAccuracy(
  sliderPosition: number,
  greenZonePosition: number,
  tolerance: number = 0.08
): number {
  // Відстань від слайдера до зони
  const distance = Math.abs(sliderPosition - greenZonePosition);

  // Якщо в центрі зони → 100%
  if (distance < tolerance / 2) {
    return 100;
  }

  // Якщо всередині зони → 95-100%
  if (distance < tolerance) {
    return Math.round(95 + Math.random() * 5);
  }

  // За межами зони → квадратичне падіння
  const maxDeviation = 1.0 - tolerance / 2;
  const deviationRatio = (distance - tolerance / 2) / maxDeviation;

  const accuracy = Math.max(5, 90 * Math.pow(1 - deviationRatio, 2));

  return Math.round(accuracy);
}
