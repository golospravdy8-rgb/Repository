/**
 * Basketball Rim Physics Configuration
 * Updated with FIBA-compliant specifications from Stefan's physics repository
 * All values in SI units (meters, seconds) when used in physics engine
 */

import { STEFAN_BASKETBALL_SPECS } from './metricsConversion';

export const RIM_PHYSICS_CONFIG = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RIM GEOMETRY (FIBA Official 45cm diameter)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  rimRadius: 27,              // Pixels (visual, adapter to SCALE in engine)
  rimDiameterM: 0.45,         // 0.45m (FIBA official, hard constant)
  rimRadiusM: 0.225,          // 0.225m (FIBA official 22.5cm, NOT 0.627m!)
  rimThicknessM: 0.018,       // 0.018m (18mm FIBA tube thickness)
  rimTubeRadiusM: 0.009,      // 0.009m (9mm half-thickness, minimal collision buffer)
  rimWidth: 7,                // Pixels (visual only)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RIM MATERIAL PROPERTIES (Stefan's Physics)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  rimRestitution: 0.45,       // Coefficient of restitution (realistic bounce)
  rimFriction: 0.35,          // Coefficient of friction (natural rim grip)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VELOCITY DAMPING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  linearDamping: 0.08,        // Linear damping after each physics step
  angularDamping: 0.18,       // Angular damping (spin decay)
  tangentialDamping: 0.8,     // Rim contact velocity reduction (SI calculation)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GATE SCORING SYSTEM (Pixels, adapter to SI in engine)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  topGateOffset: -14,         // Upper gate (ball enters from top)
  bottomGateOffset: 26,       // Lower gate (ball exits = GOAL!)
  gateWidth: 40,              // Gate opening width (pixels)

  // SI equivalents (calculated from SCALE)
  topGateOffsetM: 0.05,       // +5cm above rim center
  bottomGateOffsetM: 0.30,    // +30cm below rim center
  gateWidthM: (40 * STEFAN_BASKETBALL_SPECS.RIM_RADIUS_M) / 27,  // Proportional

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VELOCITY THRESHOLDS (SI m/s)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  minVelocityTopGate: 0.2,    // Min downward velocity to enter top gate
  minVelocityBottomGate: 0.4, // Min downward velocity to exit bottom gate
  captureSpeedThreshold: 0.5, // Speed below this → ball captures on rim

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BALL PROPERTIES (FIBA Official)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ballRadiusM: 0.12075,       // 0.12075m (FIBA official 24.15cm diameter)
  ballMassKg: 0.62,           // 0.62kg (FIBA official 620g)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FLOOR/BACKBOARD PROPERTIES (NBA Standard)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  floorRestitution: 0.62,     // NBA ball bounce on floor
  floorFriction: 0.4,         // Floor grip coefficient
  backboardRestitution: 0.66,  // Backboard bounce (harder than rim)
  backboardFriction: 0.38,     // Backboard friction
} as const;
