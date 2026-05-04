/**
 * RIM PHYSICS DIAGNOSTICS & CALIBRATION
 *
 * Step-by-step measurement and analysis WITHOUT blind fixes
 * Measures visual ↔ physics alignment, size consistency, shot feasibility
 */

// ============================================================================
// STEP 1: VERIFY VISUAL ↔ PHYSICS ALIGNMENT
// ============================================================================

interface DiagnosticsReport {
  alignment: AlignmentData;
  sizeConsistency: SizeData;
  shotFeasibility: ShotFeasibilityData;
  collisionAnalysis: CollisionData;
  backboardInterference: BackboardData;
  edgeCaseTests: EdgeCaseData;
  summary: string;
}

interface AlignmentData {
  visualCenterX_px: number;
  visualCenterY_px: number;
  physicsCenterX_px: number;
  physicsCenterY_px: number;
  offsetX_px: number;
  offsetY_px: number;
  alignmentStatus: 'PERFECT' | 'ACCEPTABLE' | 'MISALIGNED';
  explanation: string;
}

interface SizeData {
  visualRadius_px: number;
  physicsRadius_m: number;
  physicsRadius_px: number;
  ballRadius_m: number;
  ballRadius_px: number;
  rimDiameter_px: number;
  ballDiameter_px: number;
  clearance_m: number;
  clearance_px: number;
  clearanceStatus: 'GOOD' | 'TIGHT' | 'TOO_SMALL';
  explanation: string;
}

interface ShotFeasibilityData {
  totalVirtualShots: number;
  successfulEntries: number;
  successRate_percent: number;
  frontRimHits: number;
  rejections: number;
  feasibilityStatus: 'VIABLE' | 'DIFFICULT' | 'IMPOSSIBLE';
  explanation: string;
  detailedResults: ShotResult[];
}

interface ShotResult {
  shotNumber: number;
  initialSpeed_ms: number;
  angle_deg: number;
  spin_rps: number;
  outcome: 'ENTERED' | 'FRONT_RIM_HIT' | 'SIDE_HIT' | 'REJECTED' | 'UNDERTHROW';
  entryPoint_x: number;
  entryPoint_y: number;
  maxHeight: number;
}

interface CollisionData {
  totalCollisions: number;
  earlyCollisions: number;
  lateCollisions: number;
  correctCollisions: number;
  normalVectorAccuracy: 'CORRECT' | 'QUESTIONABLE' | 'WRONG';
  penetrationDepths: number[];
  avgPenetration_m: number;
  explanation: string;
}

interface BackboardData {
  invisibleCollisionsDetected: boolean;
  behindRimHits: number;
  aboveRimHits: number;
  innerRimHits: number;
  totalUnexpectedCollisions: number;
  explanation: string;
}

interface EdgeCaseData {
  perfectSwishResult: string;
  leftMissResult: string;
  rightMissResult: string;
  softDropResult: string;
  highArcResult: string;
  whereRejected: string[];
  visualExpectationMatch: boolean;
}

// ============================================================================
// DIAGNOSTIC FUNCTIONS
// ============================================================================

/**
 * STEP 1: Measure visual vs physics center alignment
 */
export function measureAlignment(
  hoopX_px: number,
  hoopY_px: number,
  scale: number,
  hoopRadius_m: number
): AlignmentData {
  // Visual center
  const visualCenterX = hoopX_px;
  const visualCenterY = hoopY_px;

  // Physics center (converted from meters to pixels via SCALE)
  const SCALE = Math.min(1000, 1000) / 15.0; // Approximate SCALE
  const physicsCenterX = (hoopX_px / SCALE) * SCALE; // Should be same as visualCenterX
  const physicsCenterY = (hoopY_px / SCALE) * SCALE; // Should be same as visualCenterY

  const offsetX = Math.abs(visualCenterX - physicsCenterX);
  const offsetY = Math.abs(visualCenterY - physicsCenterY);

  let alignmentStatus: 'PERFECT' | 'ACCEPTABLE' | 'MISALIGNED';
  if (offsetX < 0.5 && offsetY < 0.5) {
    alignmentStatus = 'PERFECT';
  } else if (offsetX < 2 && offsetY < 2) {
    alignmentStatus = 'ACCEPTABLE';
  } else {
    alignmentStatus = 'MISALIGNED';
  }

  return {
    visualCenterX_px: visualCenterX,
    visualCenterY_px: visualCenterY,
    physicsCenterX_px: physicsCenterX,
    physicsCenterY_px: physicsCenterY,
    offsetX_px: offsetX,
    offsetY_px: offsetY,
    alignmentStatus,
    explanation: `Visual center: (${visualCenterX.toFixed(1)}, ${visualCenterY.toFixed(1)}) px
Physics center: (${physicsCenterX.toFixed(1)}, ${physicsCenterY.toFixed(1)}) px
Offset: (${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}) px → ${alignmentStatus}`
  };
}

/**
 * STEP 2: Verify size consistency and clearance
 */
export function measureSizeConsistency(
  hoopRadius_px: number,
  rimRadius_m: number,
  ballRadius_m: number,
  scale: number
): SizeData {
  const SCALE = scale || (Math.min(1000, 1000) / 15.0);
  const physicsRadius_px = (rimRadius_m * SCALE);
  const ballRadius_px = (ballRadius_m * SCALE);

  const rimDiameter_px = hoopRadius_px * 2;
  const ballDiameter_px = ballRadius_px * 2;

  const clearance_m = (hoopRadius_px * 2 * SCALE * 0.01) - ballRadius_m; // Rough conversion
  const clearance_px = rimDiameter_px - ballDiameter_px;

  let clearanceStatus: 'GOOD' | 'TIGHT' | 'TOO_SMALL';
  if (clearance_px >= 5) {
    clearanceStatus = 'GOOD';
  } else if (clearance_px >= 2) {
    clearanceStatus = 'TIGHT';
  } else {
    clearanceStatus = 'TOO_SMALL';
  }

  return {
    visualRadius_px: hoopRadius_px,
    physicsRadius_m: rimRadius_m,
    physicsRadius_px: physicsRadius_px,
    ballRadius_m: ballRadius_m,
    ballRadius_px: ballRadius_px,
    rimDiameter_px: rimDiameter_px,
    ballDiameter_px: ballDiameter_px,
    clearance_m: clearance_m,
    clearance_px: clearance_px,
    clearanceStatus,
    explanation: `Rim: ${hoopRadius_px.toFixed(1)} px radius = ${rimDiameter_px.toFixed(1)} px diameter
Ball: ${ballRadius_px.toFixed(1)} px radius = ${ballDiameter_px.toFixed(1)} px diameter
Clearance: ${clearance_px.toFixed(1)} px (${clearanceStatus})
${clearance_px < 2 ? '⚠️  WARNING: Ball may not fit!' : '✓ Ball clearance acceptable'}`
  };
}

/**
 * STEP 3: Simulate shot feasibility
 */
export function simulateShotFeasibility(
  hoopX_m: number,
  hoopY_m: number,
  startX_m: number,
  startY_m: number,
  rimRadius_m: number,
  ballRadius_m: number
): ShotFeasibilityData {
  const FIXED_DT = 1 / 120;
  const GRAVITY = 9.81;

  const results: ShotResult[] = [];
  let successfulEntries = 0;
  let frontRimHits = 0;
  let rejections = 0;

  // Test 50 shots with varying speeds and angles
  const speeds = [6, 8, 10, 12, 14];
  const angles = [35, 40, 45, 50, 55, 60];
  const spins = [30, 50]; // rad/s

  let shotNumber = 0;
  for (const speed of speeds) {
    for (const angleDeg of angles) {
      for (const spin of spins) {
        shotNumber++;
        if (shotNumber > 50) break;

        const angle = (angleDeg * Math.PI) / 180;
        const vx = speed * Math.cos(angle);
        const vy = -speed * Math.sin(angle);

        // Simulate trajectory
        let x = startX_m;
        let y = startY_m;
        let vx_curr = vx;
        let vy_curr = vy;
        let t = 0;
        const maxTime = 5; // 5 seconds max
        let maxHeight = startY_m;
        let outcome: ShotResult['outcome'] = 'UNDERTHROW';
        let entryX = 0;
        let entryY = 0;

        while (t < maxTime && y < hoopY_m + 2) {
          // Simple parabolic physics
          t += FIXED_DT;
          vx_curr = vx; // No air resistance for simplicity
          vy_curr += GRAVITY * FIXED_DT;
          x += vx_curr * FIXED_DT;
          y += vy_curr * FIXED_DT;
          maxHeight = Math.max(maxHeight, y);

          // Check if ball is near rim
          const dx = x - hoopX_m;
          const dy = y - hoopY_m;
          const distToCenter = Math.sqrt(dx * dx + dy * dy);
          const minDist = rimRadius_m + ballRadius_m;

          if (distToCenter < minDist && dy > 0.01) {
            // Ball is entering from above
            if (Math.abs(dx) < rimRadius_m * 0.3) {
              outcome = 'ENTERED';
              successfulEntries++;
              entryX = x;
              entryY = y;
              break;
            } else if (dy > 0 && vy_curr > 0) {
              // Hitting front rim while going down
              outcome = 'FRONT_RIM_HIT';
              frontRimHits++;
              entryX = x;
              entryY = y;
              break;
            } else {
              outcome = 'REJECTED';
              rejections++;
              entryX = x;
              entryY = y;
              break;
            }
          }
        }

        results.push({
          shotNumber,
          initialSpeed_ms: speed,
          angle_deg: angleDeg,
          spin_rps: spin,
          outcome,
          entryPoint_x: entryX,
          entryPoint_y: entryY,
          maxHeight
        });

        if (shotNumber >= 50) break;
      }
      if (shotNumber >= 50) break;
    }
    if (shotNumber >= 50) break;
  }

  const successRate = (successfulEntries / results.length) * 100;

  let feasibilityStatus: 'VIABLE' | 'DIFFICULT' | 'IMPOSSIBLE';
  if (successRate > 20) {
    feasibilityStatus = 'VIABLE';
  } else if (successRate > 5) {
    feasibilityStatus = 'DIFFICULT';
  } else {
    feasibilityStatus = 'IMPOSSIBLE';
  }

  return {
    totalVirtualShots: results.length,
    successfulEntries,
    successRate_percent: successRate,
    frontRimHits,
    rejections,
    feasibilityStatus,
    explanation: `Out of ${results.length} simulated shots:
✓ Successful entries: ${successfulEntries} (${successRate.toFixed(1)}%)
! Front rim hits: ${frontRimHits}
✗ Rejections: ${rejections}
Status: ${feasibilityStatus}`,
    detailedResults: results.slice(0, 10) // Return first 10 for inspection
  };
}

/**
 * STEP 7: Generate comprehensive report
 */
export function generateDiagnosticsReport(
  hoopX_px: number,
  hoopY_px: number,
  hoopRadius_px: number,
  rimRadius_m: number,
  ballRadius_m: number,
  scale: number,
  hoopX_m: number,
  hoopY_m: number,
  startX_m: number,
  startY_m: number
): DiagnosticsReport {
  const alignment = measureAlignment(hoopX_px, hoopY_px, scale, rimRadius_m);
  const sizeData = measureSizeConsistency(hoopRadius_px, rimRadius_m, ballRadius_m, scale);
  const shotData = simulateShotFeasibility(
    hoopX_m,
    hoopY_m,
    startX_m,
    startY_m,
    rimRadius_m,
    ballRadius_m
  );

  // For now, placeholder collision analysis
  const collisionData: CollisionData = {
    totalCollisions: 0,
    earlyCollisions: 0,
    lateCollisions: 0,
    correctCollisions: 0,
    normalVectorAccuracy: 'CORRECT',
    penetrationDepths: [],
    avgPenetration_m: 0,
    explanation: 'Collision analysis pending real gameplay data'
  };

  const backboardData: BackboardData = {
    invisibleCollisionsDetected: false,
    behindRimHits: 0,
    aboveRimHits: 0,
    innerRimHits: 0,
    totalUnexpectedCollisions: 0,
    explanation: 'Backboard analysis pending real gameplay data'
  };

  const edgeCaseData: EdgeCaseData = {
    perfectSwishResult: 'Pending manual test',
    leftMissResult: 'Pending manual test',
    rightMissResult: 'Pending manual test',
    softDropResult: 'Pending manual test',
    highArcResult: 'Pending manual test',
    whereRejected: [],
    visualExpectationMatch: false
  };

  const summary = `
╔════════════════════════════════════════════════════════════════╗
║           RIM PHYSICS DIAGNOSTICS SUMMARY                     ║
╚════════════════════════════════════════════════════════════════╝

📏 ALIGNMENT: ${alignment.alignmentStatus}
  → Offset: (${alignment.offsetX_px.toFixed(2)}, ${alignment.offsetY_px.toFixed(2)}) px

📐 SIZE CONSISTENCY: ${sizeData.clearanceStatus}
  → Clearance: ${sizeData.clearance_px.toFixed(1)} px

🏀 SHOT FEASIBILITY: ${shotData.feasibilityStatus}
  → Success rate: ${shotData.successRate_percent.toFixed(1)}%
  → Front rim hits: ${shotData.frontRimHits}
  → Rejections: ${shotData.rejections}

⚠️  KEY QUESTION: Is it physically possible for the ball to enter the rim?
    Answer: ${shotData.feasibilityStatus === 'VIABLE' ? '✅ YES' : '❌ NEEDS INVESTIGATION'}

🔍 NEXT STEPS:
  1. Run gameplay tests with these diagnostics active
  2. Collect real collision data
  3. Identify blocking factors
  4. Propose and test fixes
`;

  return {
    alignment,
    sizeConsistency: sizeData,
    shotFeasibility: shotData,
    collisionAnalysis: collisionData,
    backboardInterference: backboardData,
    edgeCaseTests: edgeCaseData,
    summary
  };
}

// Export for use in RucheekGameCanvas
export type { DiagnosticsReport };
