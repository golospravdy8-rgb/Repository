/**
 * Advanced Basketball Physics Engine
 * Full 16-segment rim model with Magnus effect, cloth simulation, and deterministic outcomes
 *
 * Core Features:
 * - 16-segment rim collision detection with segment-specific bounce coefficients
 * - Spin tracking (backspin/topspin/sidespin) with Magnus effect
 * - Backboard interaction with angle variance
 * - Net cloth simulation with deformation and oscillation
 * - Deterministic outcome system (no random tables)
 * - Audio design system (physics-driven sound triggers)
 */

// ============================================================================
// PHYSICS CONSTANTS (Tuned for realism)
// ============================================================================

export const ADVANCED_PHYSICS_CONSTANTS = {
  // Gravity and mass
  GRAVITY: 9.81,
  BALL_MASS: 0.62,
  BALL_RADIUS: 0.12,
  RIM_RADIUS: 0.225,

  // Rim bounce coefficients by segment
  RIM_BOUNCE_FRONT: 0.40,   // 0° ± 45° (softest)
  RIM_BOUNCE_SIDE: 0.55,    // 90°, 270°
  RIM_BOUNCE_BACK: 0.60,    // 180° ± 45° (hardest)
  RIM_FRICTION: 0.08,       // Per segment traversed

  // Spin effects (Magnus)
  SPIN_MAGNUS_FACTOR: 0.15,
  SPIN_REVERSAL_RATIO: 0.60,
  SPIN_ENERGY_LOSS: 0.30,

  // Backboard
  BACKBOARD_SOFT: 0.45,
  BACKBOARD_HARD: 0.35,
  BACKBOARD_ANGLE_VARIANCE: 5.0,

  // Net cloth
  NET_VISCOSITY: 0.20,
  NET_DAMPING: 0.12,
  NET_OSCILLATION_FREQ: 2.5,
  NET_MAX_DEFORMATION: 0.10,
  NET_RETURN_TIME: 0.3,

  // Energy system
  ENERGY_SCALE_FACTOR: 1.0,
  KINETIC_TO_POTENTIAL: 0.8,
  MIN_VELOCITY_FOR_SCORE: 0.2,

  // Collision detection
  COLLISION_RADIUS_TOLERANCE: 0.01,
  VELOCITY_EPSILON: 0.001,
  ENERGY_THRESHOLD: 0.001,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BallState {
  position: Vector3D;
  velocity: Vector3D;
  spin: Vector3D; // spinX (backspin), spinY/Z (sidespin)
  mass: number;
  radius: number;
  kineticEnergy: number;
  bounceCount: number;
  rimBounceCount: number;
  rimTapSequence: number[];
}

export interface RimSegment {
  index: number;
  angleStart: number; // degrees (0-360)
  angleEnd: number;
  position: Vector3D; // center of segment on rim
  normal: Vector3D;   // outward-facing normal
  bounceCoeff: number;
  bounceType: 'SOFT' | 'MEDIUM' | 'HARD';
}

export interface RimCollisionResult {
  segmentIndex: number;
  contactPoint: Vector3D;
  velocityMagnitude: number;
  angleOfIncidence: number;
  newVelocity: Vector3D;
  newSpin: Vector3D;
  energyLoss: number;
  outcome: 'SWISH' | 'RATTLE' | 'RIM_OUT' | 'RIM_OUT_BACK' | 'BANK_SHOT' | 'MISS' | 'DOUBLE_FRONT' | 'FRONT_BACK_CASCADE' | 'SIDE_SPIN_DROP' | 'BACK_ARC' | 'PARTIAL_ROLL' | 'FULL_CIRCLE' | 'STALL_IN' | 'STALL_OUT' | 'EXTENDED_RATTLE' | 'DEAD_BOUNCE';
}

export interface BackboardCollisionResult {
  newVelocity: Vector3D;
  newSpin: Vector3D;
  deflectionAngle: number;
  bounced: boolean;
}

export interface NetClothVertex {
  position: Vector3D;
  velocity: Vector3D;
  acceleration: Vector3D;
  mass: number;
  pinned: boolean;
}

export interface NetClothMesh {
  vertices: NetClothVertex[];
  constraints: Array<{ v1: number; v2: number; restLength: number }>;
  deformation: number;
  oscillationPhase: number;
}

export interface ShotOutcome {
  outcome: RimCollisionResult['outcome'];
  scored: boolean;
  duration: number;
  description: string;
  soundEvents: AudioEvent[];
}

export interface AudioEvent {
  type: 'RIM_CLINK' | 'NET_SWISH' | 'BACKBOARD_THUD' | 'RATTLE' | 'SWISH_WHIP' | 'NET_OSCILLATION';
  timestamp: number;
  intensity: number; // 0-1
  frequency: number; // Hz (for filtering)
  duration: number;  // seconds
}

// ============================================================================
// RIM GEOMETRY (16 segments)
// ============================================================================

export function createRimSegments(): RimSegment[] {
  const segments: RimSegment[] = [];
  const rimRadius = ADVANCED_PHYSICS_CONSTANTS.RIM_RADIUS;
  const segmentAngleDelta = 360 / 16;

  for (let i = 0; i < 16; i++) {
    const angleStart = i * segmentAngleDelta;
    const angleEnd = (i + 1) * segmentAngleDelta;
    const angleMid = angleStart + segmentAngleDelta / 2;

    const angleRad = (angleMid * Math.PI) / 180;
    const position: Vector3D = {
      x: rimRadius * Math.cos(angleRad),
      y: rimRadius * Math.sin(angleRad),
      z: 0,
    };

    const normal: Vector3D = {
      x: Math.cos(angleRad),
      y: Math.sin(angleRad),
      z: 0,
    };

    // Determine bounce type and coefficient
    let bounceType: 'SOFT' | 'MEDIUM' | 'HARD';
    let bounceCoeff: number;

    if ((angleMid >= 315 || angleMid < 45) || (angleMid >= 135 && angleMid < 225)) {
      // Front (0°±45°) or Back (180°±45°)
      if (angleMid >= 315 || angleMid < 45) {
        bounceType = 'SOFT';
        bounceCoeff = ADVANCED_PHYSICS_CONSTANTS.RIM_BOUNCE_FRONT;
      } else {
        bounceType = 'HARD';
        bounceCoeff = ADVANCED_PHYSICS_CONSTANTS.RIM_BOUNCE_BACK;
      }
    } else {
      // Sides (90°, 270°)
      bounceType = 'MEDIUM';
      bounceCoeff = ADVANCED_PHYSICS_CONSTANTS.RIM_BOUNCE_SIDE;
    }

    segments.push({
      index: i,
      angleStart,
      angleEnd,
      position,
      normal,
      bounceCoeff,
      bounceType,
    });
  }

  return segments;
}

// ============================================================================
// VECTOR UTILITIES
// ============================================================================

export const Vector3 = {
  create: (x: number = 0, y: number = 0, z: number = 0): Vector3D => ({ x, y, z }),

  clone: (v: Vector3D): Vector3D => ({ ...v }),

  add: (a: Vector3D, b: Vector3D): Vector3D => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }),

  subtract: (a: Vector3D, b: Vector3D): Vector3D => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }),

  scale: (v: Vector3D, s: number): Vector3D => ({
    x: v.x * s,
    y: v.y * s,
    z: v.z * s,
  }),

  dot: (a: Vector3D, b: Vector3D): number => a.x * b.x + a.y * b.y + a.z * b.z,

  cross: (a: Vector3D, b: Vector3D): Vector3D => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),

  magnitude: (v: Vector3D): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),

  normalize: (v: Vector3D): Vector3D => {
    const mag = Vector3.magnitude(v);
    return mag > 0 ? Vector3.scale(v, 1 / mag) : v;
  },

  reflect: (v: Vector3D, normal: Vector3D): Vector3D => {
    // v' = v - 2(v·n)n
    const dotProd = Vector3.dot(v, normal);
    return Vector3.subtract(v, Vector3.scale(normal, 2 * dotProd));
  },

  lerp: (a: Vector3D, b: Vector3D, t: number): Vector3D => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }),
};

// ============================================================================
// BALL PHYSICS INTEGRATION
// ============================================================================

export function stepBallPhysics(
  ball: BallState,
  deltaTime: number,
  gravityVector: Vector3D = { x: 0, y: 0, z: -ADVANCED_PHYSICS_CONSTANTS.GRAVITY }
): void {
  // Apply gravity
  ball.velocity = Vector3.add(
    ball.velocity,
    Vector3.scale(gravityVector, deltaTime)
  );

  // Apply air resistance (drag)
  const dragFactor = 0.99; // 1% loss per second
  const dragDecay = Math.pow(dragFactor, deltaTime);
  ball.velocity = Vector3.scale(ball.velocity, dragDecay);

  // Update position
  ball.position = Vector3.add(
    ball.position,
    Vector3.scale(ball.velocity, deltaTime)
  );

  // Magnus effect: backspin creates upward force
  const spinMagnitude = Vector3.magnitude(ball.spin);
  if (spinMagnitude > 0.01) {
    const magnusEffect = Vector3.scale(ball.spin, ADVANCED_PHYSICS_CONSTANTS.SPIN_MAGNUS_FACTOR * deltaTime);
    ball.velocity = Vector3.add(ball.velocity, magnusEffect);

    // Spin damping
    ball.spin = Vector3.scale(ball.spin, 0.97);
  }

  // Update kinetic energy
  const velMag = Vector3.magnitude(ball.velocity);
  ball.kineticEnergy = 0.5 * ball.mass * velMag * velMag;
}

// ============================================================================
// RIM COLLISION DETECTION & PHYSICS
// ============================================================================

export function detectRimCollision(
  ball: BallState,
  rimCenter: Vector3D,
  rimSegments: RimSegment[]
): RimCollisionResult | null {
  let closest: RimCollisionResult | null = null;
  let minDistance = ball.radius;

  for (const segment of rimSegments) {
    // Distance from ball center to segment position
    const toSegment = Vector3.subtract(segment.position, ball.position);
    const distToSegment = Vector3.magnitude(toSegment);

    if (distToSegment < minDistance) {
      // Calculate collision response
      const normal = segment.normal;
      const dotVelocity = Vector3.dot(ball.velocity, normal);

      // Only collide if moving toward rim
      if (dotVelocity < 0) {
        const velocityMagnitude = Vector3.magnitude(ball.velocity);
        const angleOfIncidence = Math.acos(
          Math.min(1, Math.max(-1, dotVelocity / velocityMagnitude))
        ) * (180 / Math.PI);

        // Calculate bounce response
        const reflected = Vector3.reflect(ball.velocity, normal);
        const damped = Vector3.scale(reflected, segment.bounceCoeff);

        // Apply spin effect (Magnus)
        const spinEffect = calculateSpinEffect(ball.spin, segment, damped);
        const newVelocity = Vector3.add(damped, spinEffect);

        // Calculate energy loss
        const energyLoss = 1 - segment.bounceCoeff;

        // Determine outcome
        const outcome = determineRimOutcome(
          ball,
          segment,
          velocityMagnitude,
          angleOfIncidence,
          newVelocity
        );

        // Update spin (reversal)
        const newSpin = Vector3.scale(ball.spin, -ADVANCED_PHYSICS_CONSTANTS.SPIN_REVERSAL_RATIO);

        closest = {
          segmentIndex: segment.index,
          contactPoint: Vector3.subtract(
            ball.position,
            Vector3.scale(normal, minDistance)
          ),
          velocityMagnitude,
          angleOfIncidence,
          newVelocity,
          newSpin,
          energyLoss,
          outcome,
        };

        minDistance = distToSegment;
      }
    }
  }

  return closest;
}

function calculateSpinEffect(spin: Vector3D, segment: RimSegment, velocity: Vector3D): Vector3D {
  const spinMag = Vector3.magnitude(spin);
  if (spinMag < 0.01) return Vector3.create();

  // Backspin (spinX > 0) creates upward force
  const magnusForce = spin.x * ADVANCED_PHYSICS_CONSTANTS.SPIN_MAGNUS_FACTOR;

  // Sidespin causes curved trajectory
  const sideForce = Vector3.magnitude({ x: spin.y, y: spin.z, z: 0 }) * 0.05;

  return Vector3.create(0, 0, magnusForce);
}

function determineRimOutcome(
  ball: BallState,
  segment: RimSegment,
  velocityMagnitude: number,
  angleOfIncidence: number,
  newVelocity: Vector3D
): RimCollisionResult['outcome'] {
  const rimTapCount = ball.rimTapSequence.length;

  // Extended rattle (3-4 taps before auto-score)
  if (rimTapCount >= 3 && velocityMagnitude < 4) {
    return 'EXTENDED_RATTLE';
  }

  // Dead bounce (perpendicular impact, immediate drop)
  if (angleOfIncidence > 80 && velocityMagnitude < 3) {
    return 'DEAD_BOUNCE';
  }

  // Double front rim hit → soft drop
  if (segment.bounceType === 'SOFT' && rimTapCount >= 1) {
    const lastSegment = ball.rimTapSequence[rimTapCount - 1];
    if (Math.abs(lastSegment - segment.index) <= 1) {
      return 'DOUBLE_FRONT';
    }
  }

  // Front → back cascade
  if (segment.bounceType === 'SOFT' && rimTapCount === 1) {
    return 'FRONT_BACK_CASCADE';
  }

  // Back rim hard bounce → up → drop
  if (segment.bounceType === 'HARD' && velocityMagnitude > 5) {
    return 'BACK_ARC';
  }

  // Side rim with sidespin → spiral drop
  if (segment.bounceType === 'MEDIUM' && Math.abs(ball.spin.y) > 2) {
    return 'SIDE_SPIN_DROP';
  }

  // Standard outcomes based on physics
  if (angleOfIncidence > 40 && angleOfIncidence < 75) {
    if (velocityMagnitude < 6) {
      return 'SWISH';
    } else if (rimTapCount < 3) {
      return 'RATTLE';
    }
  }

  if (velocityMagnitude > 8) {
    return 'RIM_OUT';
  }

  return rimTapCount < 2 ? 'RIM_OUT_BACK' : 'RATTLE';
}

// ============================================================================
// BACKBOARD COLLISION
// ============================================================================

export function computeBackboardCollision(
  ball: BallState,
  backboardX: number,
  backboardTop: number,
  backboardBottom: number
): BackboardCollisionResult {
  const impactVelocity = Vector3.magnitude(ball.velocity);

  let bounceCoeff: number;
  if (impactVelocity > 6) {
    bounceCoeff = ADVANCED_PHYSICS_CONSTANTS.BACKBOARD_HARD;
  } else {
    bounceCoeff = ADVANCED_PHYSICS_CONSTANTS.BACKBOARD_SOFT;
  }

  // Reflect X velocity (perpendicular to backboard)
  const reflected = Vector3.create(
    -ball.velocity.x * bounceCoeff,
    ball.velocity.y * bounceCoeff,
    ball.velocity.z * 0.95
  );

  // Add angle variance (surface imperfection)
  const variance = (Math.random() - 0.5) * (ADVANCED_PHYSICS_CONSTANTS.BACKBOARD_ANGLE_VARIANCE * Math.PI / 180);
  const finalVelocity = Vector3.create(
    reflected.x * Math.cos(variance),
    reflected.y,
    reflected.z + 1.5 // Bias toward hoop
  );

  // Spin behavior on backboard
  const newSpin = Vector3.scale(ball.spin, 0.8);

  return {
    newVelocity: finalVelocity,
    newSpin,
    deflectionAngle: variance * (180 / Math.PI),
    bounced: true,
  };
}

// ============================================================================
// NET CLOTH SIMULATION
// ============================================================================

export function createNetClothMesh(rimCenter: Vector3D, rimRadius: number): NetClothMesh {
  const vertices: NetClothVertex[] = [];
  const constraints: Array<{ v1: number; v2: number; restLength: number }> = [];

  // Create a simple net mesh (radial pattern)
  const radialDivisions = 8;
  const depthDivisions = 4;

  for (let i = 0; i < radialDivisions; i++) {
    const angle = (i / radialDivisions) * Math.PI * 2;
    for (let j = 0; j < depthDivisions; j++) {
      const depth = (j / (depthDivisions - 1)) * 0.4; // 40cm depth
      const radius = rimRadius - (depth * 0.1); // Slight taper

      const position: Vector3D = {
        x: rimCenter.x + radius * Math.cos(angle),
        y: rimCenter.y + radius * Math.sin(angle),
        z: rimCenter.z - depth,
      };

      vertices.push({
        position,
        velocity: Vector3.create(),
        acceleration: Vector3.create(),
        mass: 0.01,
        pinned: j === 0, // Top vertices pinned to rim
      });
    }
  }

  // Create constraints (neighbor connections)
  const verticesPerRadial = depthDivisions;
  for (let i = 0; i < radialDivisions; i++) {
    for (let j = 0; j < depthDivisions; j++) {
      const current = i * verticesPerRadial + j;

      // Radial constraint
      if (j < depthDivisions - 1) {
        const next = i * verticesPerRadial + (j + 1);
        const dist = Vector3.magnitude(
          Vector3.subtract(vertices[next].position, vertices[current].position)
        );
        constraints.push({ v1: current, v2: next, restLength: dist });
      }

      // Circular constraint
      const nextRadial = ((i + 1) % radialDivisions) * verticesPerRadial + j;
      const dist = Vector3.magnitude(
        Vector3.subtract(vertices[nextRadial].position, vertices[current].position)
      );
      constraints.push({ v1: current, v2: nextRadial, restLength: dist });
    }
  }

  return {
    vertices,
    constraints,
    deformation: 0,
    oscillationPhase: 0,
  };
}

export function stepNetClothPhysics(
  net: NetClothMesh,
  deltaTime: number,
  gravity: number = ADVANCED_PHYSICS_CONSTANTS.GRAVITY
): void {
  // Apply forces
  for (const vertex of net.vertices) {
    if (vertex.pinned) continue;

    // Gravity
    vertex.acceleration.z = -gravity;

    // Apply damping
    vertex.velocity = Vector3.scale(vertex.velocity, ADVANCED_PHYSICS_CONSTANTS.NET_DAMPING);

    // Integrate
    vertex.velocity = Vector3.add(vertex.velocity, Vector3.scale(vertex.acceleration, deltaTime));
    vertex.position = Vector3.add(vertex.position, Vector3.scale(vertex.velocity, deltaTime));
  }

  // Apply constraints
  for (const constraint of net.constraints) {
    const v1 = net.vertices[constraint.v1];
    const v2 = net.vertices[constraint.v2];

    const delta = Vector3.subtract(v2.position, v1.position);
    const distance = Vector3.magnitude(delta);
    const correction = (distance - constraint.restLength) / distance;

    if (!v1.pinned && !v2.pinned) {
      v1.position = Vector3.add(v1.position, Vector3.scale(delta, correction * 0.5));
      v2.position = Vector3.subtract(v2.position, Vector3.scale(delta, correction * 0.5));
    } else if (!v1.pinned) {
      v1.position = Vector3.add(v1.position, Vector3.scale(delta, correction));
    } else if (!v2.pinned) {
      v2.position = Vector3.subtract(v2.position, Vector3.scale(delta, correction));
    }
  }

  // Oscillation
  net.oscillationPhase += deltaTime * ADVANCED_PHYSICS_CONSTANTS.NET_OSCILLATION_FREQ * Math.PI * 2;
  net.deformation = Math.sin(net.oscillationPhase) * 0.05;
}

export function applyNetImpact(
  net: NetClothMesh,
  impactVelocity: number,
  impactPoint: Vector3D
): void {
  // Apply force to nearby vertices
  const impactRadius = 0.2;

  for (const vertex of net.vertices) {
    if (vertex.pinned) continue;

    const dist = Vector3.magnitude(Vector3.subtract(vertex.position, impactPoint));
    if (dist < impactRadius) {
      const force = (1 - dist / impactRadius) * impactVelocity * 0.5;
      vertex.velocity.z -= force;
    }
  }
}

// ============================================================================
// AUDIO DESIGN SYSTEM
// ============================================================================

export function generateAudioEventsForOutcome(
  outcome: RimCollisionResult
): AudioEvent[] {
  const events: AudioEvent[] = [];
  const timestamp = Date.now();

  switch (outcome.outcome) {
    case 'SWISH':
      events.push({
        type: 'NET_SWISH',
        timestamp,
        intensity: 0.8,
        frequency: 800,
        duration: 0.25,
      });
      break;

    case 'RATTLE':
      events.push({
        type: 'RIM_CLINK',
        timestamp,
        intensity: 0.7,
        frequency: 2500,
        duration: 0.1,
      });
      events.push({
        type: 'RATTLE',
        timestamp: timestamp + 100,
        intensity: 0.5,
        frequency: 2000,
        duration: 0.15,
      });
      break;

    case 'RIM_OUT':
      events.push({
        type: 'RIM_CLINK',
        timestamp,
        intensity: 0.9,
        frequency: 3000,
        duration: 0.15,
      });
      break;

    case 'BANK_SHOT':
      events.push({
        type: 'BACKBOARD_THUD',
        timestamp,
        intensity: 0.8,
        frequency: 350,
        duration: 0.12,
      });
      events.push({
        type: 'RIM_CLINK',
        timestamp: timestamp + 150,
        intensity: 0.6,
        frequency: 2200,
        duration: 0.1,
      });
      break;

    case 'EXTENDED_RATTLE':
      // Multiple clinks
      for (let i = 0; i < 4; i++) {
        events.push({
          type: 'RIM_CLINK',
          timestamp: timestamp + i * 100,
          intensity: 0.8 - i * 0.15,
          frequency: 2500 - i * 200,
          duration: 0.08,
        });
      }
      events.push({
        type: 'NET_SWISH',
        timestamp: timestamp + 400,
        intensity: 0.7,
        frequency: 700,
        duration: 0.2,
      });
      break;

    case 'DOUBLE_FRONT':
      events.push({
        type: 'RIM_CLINK',
        timestamp,
        intensity: 0.6,
        frequency: 2000,
        duration: 0.08,
      });
      events.push({
        type: 'RIM_CLINK',
        timestamp: timestamp + 80,
        intensity: 0.5,
        frequency: 1800,
        duration: 0.08,
      });
      events.push({
        type: 'NET_SWISH',
        timestamp: timestamp + 160,
        intensity: 0.7,
        frequency: 600,
        duration: 0.25,
      });
      break;

    case 'DEAD_BOUNCE':
      events.push({
        type: 'RIM_CLINK',
        timestamp,
        intensity: 0.4,
        frequency: 1500,
        duration: 0.1,
      });
      events.push({
        type: 'NET_SWISH',
        timestamp: timestamp + 120,
        intensity: 0.8,
        frequency: 700,
        duration: 0.2,
      });
      break;

    case 'BACK_ARC':
      events.push({
        type: 'RIM_CLINK',
        timestamp,
        intensity: 0.9,
        frequency: 2800,
        duration: 0.12,
      });
      events.push({
        type: 'NET_OSCILLATION',
        timestamp: timestamp + 500,
        intensity: 0.4,
        frequency: 2.5,
        duration: 0.8,
      });
      break;
  }

  return events;
}

// ============================================================================
// SHOT OUTCOME DETERMINATION
// ============================================================================

export function determineShotOutcome(
  rimCollision: RimCollisionResult,
  totalFrames: number
): ShotOutcome {
  const scored = ['SWISH', 'RATTLE', 'EXTENDED_RATTLE', 'DOUBLE_FRONT', 'DEAD_BOUNCE', 'BACK_ARC', 'SIDE_SPIN_DROP'].includes(
    rimCollision.outcome
  );

  const soundEvents = generateAudioEventsForOutcome(rimCollision);

  const descriptions: Record<RimCollisionResult['outcome'], string> = {
    SWISH: 'Clean swish through the net',
    RATTLE: 'Bounced off rim, rolled in',
    RIM_OUT: 'Ball bounced off the rim and flew away',
    RIM_OUT_BACK: 'Ball bounced off back rim to the side',
    BANK_SHOT: 'Bank shot off backboard into net',
    MISS: 'Shot missed the hoop entirely',
    DOUBLE_FRONT: 'Double tap on front rim dropped straight in',
    FRONT_BACK_CASCADE: 'Ball cascaded from front to back rim',
    SIDE_SPIN_DROP: 'Sidespin curved ball into net',
    BACK_ARC: 'Hard bounce on back rim, hung in the air then dropped',
    PARTIAL_ROLL: 'Ball rolled partway around rim',
    FULL_CIRCLE: 'Ultra-rare full rotation around rim',
    STALL_IN: 'Ball stalled on rim then dropped in',
    STALL_OUT: 'Ball stalled on rim then rolled off',
    EXTENDED_RATTLE: 'Multiple rim taps before dropping in',
    DEAD_BOUNCE: 'Perpendicular impact, immediate drop',
  };

  return {
    outcome: rimCollision.outcome,
    scored,
    duration: totalFrames / 60, // frames to seconds at 60 FPS
    description: descriptions[rimCollision.outcome],
    soundEvents,
  };
}

// ============================================================================
// MAIN SIMULATOR CLASS
// ============================================================================

export class AdvancedBasketballSimulator {
  ball: BallState;
  rimSegments: RimSegment[];
  rimCenter: Vector3D;
  backboardX: number;
  netMesh: NetClothMesh;
  gravity: Vector3D;

  constructor(
    rimCenterX: number = 0,
    rimCenterY: number = 0,
    rimCenterZ: number = 3.05,
    backboardX: number = 0.15
  ) {
    this.rimCenter = Vector3.create(rimCenterX, rimCenterY, rimCenterZ);
    this.backboardX = backboardX;
    this.gravity = Vector3.create(0, 0, -ADVANCED_PHYSICS_CONSTANTS.GRAVITY);

    this.ball = {
      position: Vector3.create(0, 0, 2),
      velocity: Vector3.create(0, 0, 0),
      spin: Vector3.create(0, 0, 0),
      mass: ADVANCED_PHYSICS_CONSTANTS.BALL_MASS,
      radius: ADVANCED_PHYSICS_CONSTANTS.BALL_RADIUS,
      kineticEnergy: 0,
      bounceCount: 0,
      rimBounceCount: 0,
      rimTapSequence: [],
    };

    this.rimSegments = createRimSegments();
    this.netMesh = createNetClothMesh(this.rimCenter, ADVANCED_PHYSICS_CONSTANTS.RIM_RADIUS);
  }

  update(deltaTime: number): void {
    // Step physics
    stepBallPhysics(this.ball, deltaTime, this.gravity);

    // Check rim collision
    const rimCollision = detectRimCollision(this.ball, this.rimCenter, this.rimSegments);
    if (rimCollision) {
      this.ball.velocity = rimCollision.newVelocity;
      this.ball.spin = rimCollision.newSpin;
      this.ball.rimBounceCount++;
      this.ball.rimTapSequence.push(rimCollision.segmentIndex);

      // Apply net impact
      applyNetImpact(this.netMesh, Vector3.magnitude(rimCollision.newVelocity), rimCollision.contactPoint);
    }

    // Check backboard collision
    const distToBackboard = Math.abs(this.ball.position.x - this.backboardX);
    if (distToBackboard < 0.1 && this.ball.velocity.x > 0) {
      const bbCollision = computeBackboardCollision(
        this.ball,
        this.backboardX,
        this.rimCenter.z + 0.45,
        this.rimCenter.z - 0.9
      );
      this.ball.velocity = bbCollision.newVelocity;
      this.ball.spin = bbCollision.newSpin;
    }

    // Step net cloth
    stepNetClothPhysics(this.netMesh, deltaTime);
  }

  reset(): void {
    this.ball = {
      position: Vector3.create(0, 0, 2),
      velocity: Vector3.create(0, 0, 0),
      spin: Vector3.create(0, 0, 0),
      mass: ADVANCED_PHYSICS_CONSTANTS.BALL_MASS,
      radius: ADVANCED_PHYSICS_CONSTANTS.BALL_RADIUS,
      kineticEnergy: 0,
      bounceCount: 0,
      rimBounceCount: 0,
      rimTapSequence: [],
    };
    this.netMesh = createNetClothMesh(this.rimCenter, ADVANCED_PHYSICS_CONSTANTS.RIM_RADIUS);
  }
}
