/**
 * ⭐ BASKETBALL RIM PHYSICS & VISUALIZATION CONSTANTS
 *
 * SINGLE SOURCE OF TRUTH for rim geometry.
 * All values in SI units (meters).
 * Used for both physics collision detection and canvas rendering.
 */

export const RIM = {
  // 🏀 RIM GEOMETRY (Official FIBA Basketball)
  OUTER_RADIUS_M: 0.2325,     // 45cm diameter outer edge = 0.45m, plus ~1.5cm steel rim
  INNER_RADIUS_M: 0.2175,     // 45cm diameter inner edge minus thickness
  THICKNESS_M: 0.015,          // Steel rim thickness ~1.5cm (FIBA spec)

  // 🏀 BALL GEOMETRY
  BALL_RADIUS_M: 0.12,         // Basketball 24cm diameter = 0.12m radius (FIBA spec)

  // 🏀 PHYSICS PROPERTIES
  RESTITUTION: 0.55,           // Coefficient of restitution (steel rim bounce)
  FRICTION: 0.30,              // Coefficient of friction (FIBA steel rim)
  GRAVITY_MS2: 9.81,           // Earth gravity

  // 🏀 PHYSICS DETECTION
  // Clearance = distance from ball center to rim edge where collision starts
  CONTACT_CLEARANCE_M: 0.001,  // 1mm tolerance for numerical stability
} as const;

/**
 * PIXELS_PER_METER: Canvas scaling
 * Set during game initialization based on canvas size.
 * Used to convert SI meters → pixels for rendering.
 */
export let PIXELS_PER_METER = 100;

/**
 * Set PIXELS_PER_METER based on canvas dimensions
 * Call this once at game start
 */
export function setPixelsPerMeter(canvasWidth: number, canvasHeight: number): void {
  // 1 meter ≈ 100 pixels on a standard canvas
  // This can be adjusted based on responsive design
  PIXELS_PER_METER = Math.min(canvasWidth, canvasHeight) / 15;
}

/**
 * Get rim geometry in pixels (for rendering)
 */
export function getRimGeometryPx(rimCenterX_m: number, rimCenterY_m: number) {
  return {
    centerX_px: rimCenterX_m * PIXELS_PER_METER,
    centerY_px: rimCenterY_m * PIXELS_PER_METER,
    outerRadius_px: RIM.OUTER_RADIUS_M * PIXELS_PER_METER,
    innerRadius_px: RIM.INNER_RADIUS_M * PIXELS_PER_METER,
    thickness_px: RIM.THICKNESS_M * PIXELS_PER_METER,
  };
}

/**
 * Get rim geometry in meters (for physics)
 */
export function getRimGeometryM() {
  return {
    outerRadius_m: RIM.OUTER_RADIUS_M,
    innerRadius_m: RIM.INNER_RADIUS_M,
    thickness_m: RIM.THICKNESS_M,
    ballRadius_m: RIM.BALL_RADIUS_M,
  };
}
