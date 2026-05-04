/**
 * Basketball Physics Metrics Conversion
 *
 * Converts between pixels (Stefan's repo) and SI meters (your game)
 * FIBA-compliant specifications for official basketball dimensions
 */

export const PIXELS_PER_METER_STEFAN = 100;

/**
 * Official FIBA Basketball Specifications
 * Source: International Basketball Federation (FIBA) official rules
 * Stefan's Repo: Physics constants extracted from professional implementations
 */
export const STEFAN_BASKETBALL_SPECS = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RIM DIMENSIONS (Official FIBA)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RIM_DIAMETER_M: 0.45,              // 45cm diameter
  RIM_RADIUS_M: 0.225,               // 22.5cm radius
  RIM_THICKNESS_M: 0.018,            // 18mm thick steel tubing
  RIM_TUBE_R_M: 0.009,               // 9mm (half of thickness)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BALL DIMENSIONS (Official FIBA)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BALL_DIAMETER_M: 0.2415,           // 24.15cm diameter
  BALL_RADIUS_M: 0.12075,            // 12.075cm radius
  BALL_MASS_KG: 0.62,                // 620g official weight

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RIM MATERIAL PROPERTIES (Stefan's Physics)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RESTITUTION_RIM: 0.45,             // Coefficient of restitution (bouncing)
  FRICTION_RIM: 0.35,                // Coefficient of friction (sliding)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BALL PROPERTIES (Standard basketball)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  FLOOR_RESTITUTION: 0.62,           // Bounce coefficient on floor (NBA ball)
  FLOOR_FRICTION: 0.4,               // Friction coefficient on floor
  BACKBOARD_RESTITUTION: 0.66,       // Bounce off backboard
  BACKBOARD_FRICTION: 0.38,          // Friction on backboard
} as const;

/**
 * Convert pixels (Stefan's system) to meters (your game)
 * @param pixels Pixel value from Stefan's repo (PPM = 100)
 * @returns Meters (SI units)
 */
export function convertPixelsToMeters(pixels: number): number {
  return pixels / PIXELS_PER_METER_STEFAN;
}

/**
 * Convert meters (your game) to pixels (Stefan's system)
 * @param meters SI meter value
 * @returns Pixels (PPM = 100)
 */
export function convertMetersToPixels(meters: number): number {
  return meters * PIXELS_PER_METER_STEFAN;
}

/**
 * Validate rim physics constants during initialization
 * Ensures all specs are within physically reasonable ranges
 */
export function validateRimMetrics(): void {
  const specs = STEFAN_BASKETBALL_SPECS;
  const errors: string[] = [];

  // Check rim dimensions
  if (specs.RIM_DIAMETER_M !== 0.45) {
    errors.push(`❌ RIM_DIAMETER_M should be 0.45m, got ${specs.RIM_DIAMETER_M}`);
  }

  if (specs.RIM_RADIUS_M !== 0.225) {
    errors.push(`❌ RIM_RADIUS_M should be 0.225m, got ${specs.RIM_RADIUS_M}`);
  }

  if (specs.RIM_THICKNESS_M !== 0.018) {
    errors.push(`❌ RIM_THICKNESS_M should be 0.018m, got ${specs.RIM_THICKNESS_M}`);
  }

  // Check restitution
  if (specs.RESTITUTION_RIM < 0.40 || specs.RESTITUTION_RIM > 0.50) {
    errors.push(`⚠️  RESTITUTION_RIM ${specs.RESTITUTION_RIM} outside typical range [0.40-0.50]`);
  }

  // Check friction
  if (specs.FRICTION_RIM < 0.30 || specs.FRICTION_RIM > 0.40) {
    errors.push(`⚠️  FRICTION_RIM ${specs.FRICTION_RIM} outside typical range [0.30-0.40]`);
  }

  // Check ball dimensions
  if (Math.abs(specs.BALL_DIAMETER_M - 0.2415) > 0.001) {
    errors.push(`⚠️  BALL_DIAMETER_M should be ~0.2415m, got ${specs.BALL_DIAMETER_M}`);
  }

  if (errors.length === 0) {
    console.group('✅ Rim Metrics Validation');
    console.log('✓ RIM: FIBA compliant (45cm diameter, 18mm thickness)');
    console.log('✓ RESTITUTION: 0.45 (realistic NBA bounce)');
    console.log('✓ FRICTION: 0.35 (realistic rim grip)');
    console.log('✓ BALL: Official FIBA specifications');
    console.groupEnd();
  } else {
    console.group('❌ Rim Metrics Validation FAILED');
    errors.forEach(err => console.error(err));
    console.groupEnd();
  }
}

/**
 * Log all rim physics constants in a human-readable format
 */
export function logRimMetrics(): void {
  const specs = STEFAN_BASKETBALL_SPECS;

  console.group('🏀 Basketball Physics Constants');
  console.table({
    'Rim Diameter': `${specs.RIM_DIAMETER_M}m (45cm)`,
    'Rim Radius': `${specs.RIM_RADIUS_M}m (22.5cm)`,
    'Rim Thickness': `${specs.RIM_THICKNESS_M}m (18mm)`,
    'Rim Tube Radius': `${specs.RIM_TUBE_R_M}m (9mm)`,
    'Ball Diameter': `${specs.BALL_DIAMETER_M}m (24.15cm)`,
    'Ball Radius': `${specs.BALL_RADIUS_M}m (12.075cm)`,
    'Ball Mass': `${specs.BALL_MASS_KG}kg (620g)`,
    'Rim Restitution': `${specs.RESTITUTION_RIM} (bounce coefficient)`,
    'Rim Friction': `${specs.FRICTION_RIM} (grip coefficient)`,
    'Floor Restitution': `${specs.FLOOR_RESTITUTION} (NBA ball bounce)`,
    'Floor Friction': `${specs.FLOOR_FRICTION} (floor grip)`,
  });
  console.groupEnd();
}

/**
 * Compare current constants with FIBA official specs
 * Returns object with before/after for verification
 */
export function getSpecComparison() {
  return {
    before: {
      RIM_RADIUS_M: '~0.18-0.27m (variable)',
      RIM_TUBE_R_M: '~0.05m',
      E_RIM: 0.25,
      MU_RIM: 0.82,
    },
    after: {
      RIM_RADIUS_M: `${STEFAN_BASKETBALL_SPECS.RIM_RADIUS_M}m (FIBA)`,
      RIM_TUBE_R_M: `${STEFAN_BASKETBALL_SPECS.RIM_TUBE_R_M}m (FIBA)`,
      E_RIM: STEFAN_BASKETBALL_SPECS.RESTITUTION_RIM,
      MU_RIM: STEFAN_BASKETBALL_SPECS.FRICTION_RIM,
    },
  };
}
