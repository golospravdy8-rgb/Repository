import { GAME_CONSTANTS } from '@/config/socket.config';

export interface Vector2 {
  x: number;
  y: number;
}

export interface PhysicsBody {
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  radius: number;
  mass: number;
}

/**
 * Apply gravity to a physics body
 */
export function applyGravity(body: PhysicsBody, deltaTime: number): void {
  body.acceleration.y += GAME_CONSTANTS.GRAVITY;
  body.velocity.y += body.acceleration.y * deltaTime;
  body.velocity.x *= GAME_CONSTANTS.FRICTION;
}

/**
 * Update position based on velocity
 */
export function updatePosition(body: PhysicsBody, deltaTime: number): void {
  body.position.x += body.velocity.x * deltaTime;
  body.position.y += body.velocity.y * deltaTime;
  body.acceleration = { x: 0, y: 0 };
}

/**
 * Check collision between two circles
 */
export function checkCircleCollision(body1: PhysicsBody, body2: PhysicsBody): boolean {
  const dx = body2.position.x - body1.position.x;
  const dy = body2.position.y - body1.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < body1.radius + body2.radius;
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Vector2, p2: Vector2): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if ball is in basket
 */
export function isInBasket(ballPos: Vector2, basketX: number, basketY: number, basketRadius: number): boolean {
  const dist = distance(ballPos, { x: basketX, y: basketY });
  return dist <= basketRadius;
}

/**
 * Check boundary collisions
 */
export function checkBoundaryCollision(
  pos: Vector2,
  radius: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): { collided: boolean; normal: Vector2 } {
  const normal = { x: 0, y: 0 };
  let collided = false;

  // Left boundary
  if (pos.x - radius < minX) {
    pos.x = minX + radius;
    normal.x = 1;
    collided = true;
  }

  // Right boundary
  if (pos.x + radius > maxX) {
    pos.x = maxX - radius;
    normal.x = -1;
    collided = true;
  }

  // Top boundary
  if (pos.y - radius < minY) {
    pos.y = minY + radius;
    normal.y = 1;
    collided = true;
  }

  // Bottom boundary
  if (pos.y + radius > maxY) {
    pos.y = maxY - radius;
    normal.y = -1;
    collided = true;
  }

  return { collided, normal };
}

/**
 * Handle bounce from wall
 */
export function bounceFromNormal(velocity: Vector2, normal: Vector2): void {
  if (normal.x !== 0) {
    velocity.x *= -GAME_CONSTANTS.BOUNCE_COEFFICIENT;
  }
  if (normal.y !== 0) {
    velocity.y *= -GAME_CONSTANTS.BOUNCE_COEFFICIENT;
  }
}

/**
 * Calculate trajectory to hit target
 */
export function calculateShootTrajectory(
  from: Vector2,
  target: Vector2,
  speed: number = GAME_CONSTANTS.BALL_INITIAL_SPEED
): { vx: number; vy: number } {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return { vx: 0, vy: 0 };

  return {
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
  };
}

/**
 * Calculate angle from point A to point B
 */
export function calculateAngle(from: Vector2, to: Vector2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * Calculate position at time along parabolic trajectory
 */
export function calculateTrajectoryPosition(
  from: Vector2,
  velocity: Vector2,
  time: number,
  gravity: number = GAME_CONSTANTS.GRAVITY
): Vector2 {
  return {
    x: from.x + velocity.x * time,
    y: from.y + velocity.y * time + 0.5 * gravity * time * time,
  };
}

/**
 * Predict when ball will reach height
 */
export function predictTimeAtHeight(
  position: Vector2,
  velocity: Vector2,
  targetY: number,
  gravity: number = GAME_CONSTANTS.GRAVITY
): number | null {
  // Quadratic equation: y = y0 + vy*t + 0.5*g*t^2
  // Rearranged: 0.5*g*t^2 + vy*t + (y0 - targetY) = 0
  const a = 0.5 * gravity;
  const b = velocity.y;
  const c = position.y - targetY;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

  // Return the positive time closest to now
  if (t1 >= 0 && t2 >= 0) return Math.min(t1, t2);
  if (t1 >= 0) return t1;
  if (t2 >= 0) return t2;

  return null;
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
