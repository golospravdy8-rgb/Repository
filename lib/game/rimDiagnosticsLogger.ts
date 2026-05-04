/**
 * RIM DIAGNOSTICS LOGGER
 *
 * Real-time collision and physics monitoring
 * Logs collision points, normals, penetration depths, etc.
 */

export interface CollisionEvent {
  timestamp: number;
  ballX_px: number;
  ballY_px: number;
  ballX_m: number;
  ballY_m: number;
  rimCenterX_m: number;
  rimCenterY_m: number;
  contactX_m: number;
  contactY_m: number;
  normalX: number;
  normalY: number;
  penetrationDepth_m: number;
  ballVx_before: number;
  ballVy_before: number;
  ballVx_after: number;
  ballVy_after: number;
  energyLoss_percent: number;
  collisionType: 'FRONT_RIM' | 'SIDE_RIM' | 'BACK_RIM' | 'TOP_RIM' | 'INNER_RIM' | 'UNKNOWN';
  isEarlyCollision: boolean;
  isLateCollision: boolean;
}

export interface DiagnosticsSession {
  sessionId: string;
  startTime: number;
  collisions: CollisionEvent[];
  shotAttempts: number;
  successfulShots: number;
  rejectedShots: number;
  earlyCollisions: number;
  lateCollisions: number;
}

class RimDiagnosticsLogger {
  private session: DiagnosticsSession;
  private isEnabled: boolean = false;
  private collisionLog: CollisionEvent[] = [];
  private shotStartPositions: { x: number; y: number }[] = [];

  constructor() {
    this.session = {
      sessionId: `diag-${Date.now()}`,
      startTime: Date.now(),
      collisions: [],
      shotAttempts: 0,
      successfulShots: 0,
      rejectedShots: 0,
      earlyCollisions: 0,
      lateCollisions: 0
    };
  }

  enable(): void {
    this.isEnabled = true;
    console.log(`🔍 [DIAGNOSTICS] Session enabled: ${this.session.sessionId}`);
  }

  disable(): void {
    this.isEnabled = false;
    console.log(`🔍 [DIAGNOSTICS] Session disabled. Collisions logged: ${this.collisions.length}`);
  }

  logShotStart(x: number, y: number): void {
    if (!this.isEnabled) return;
    this.session.shotAttempts++;
    this.shotStartPositions.push({ x, y });
  }

  logShotResult(successful: boolean): void {
    if (!this.isEnabled) return;
    if (successful) {
      this.session.successfulShots++;
    } else {
      this.session.rejectedShots++;
    }
  }

  /**
   * Log a rim collision event
   */
  logCollision(event: Omit<CollisionEvent, 'timestamp' | 'collisionType' | 'isEarlyCollision' | 'isLateCollision'>): void {
    if (!this.isEnabled) return;

    // Determine collision type based on contact point position
    const rimCenterX = event.rimCenterX_m;
    const rimCenterY = event.rimCenterY_m;
    const contactX = event.contactX_m;
    const contactY = event.contactY_m;

    const dx = contactX - rimCenterX;
    const dy = contactY - rimCenterY;

    let collisionType: CollisionEvent['collisionType'];
    if (dy < -0.05) {
      collisionType = 'TOP_RIM';
    } else if (dy > 0.05) {
      collisionType = 'INNER_RIM';  // Ball deep in rim
    } else if (dx < -0.02) {
      collisionType = 'BACK_RIM';
    } else if (dx > 0.02) {
      collisionType = 'FRONT_RIM';
    } else {
      collisionType = 'UNKNOWN';
    }

    // Detect early/late collisions
    const ballDistFromCenter = Math.hypot(
      event.ballX_m - event.rimCenterX_m,
      event.ballY_m - event.rimCenterY_m
    );
    const isEarlyCollision = ballDistFromCenter > 0.3; // Too far away to collide?
    const isLateCollision = ballDistFromCenter < 0.05 && event.ballVy_before > 0; // Already deep in rim?

    const fullEvent: CollisionEvent = {
      ...event,
      timestamp: Date.now(),
      collisionType,
      isEarlyCollision,
      isLateCollision
    };

    this.collisionLog.push(fullEvent);
    this.session.collisions.push(fullEvent);

    if (isEarlyCollision) this.session.earlyCollisions++;
    if (isLateCollision) this.session.lateCollisions++;

    // Real-time console output
    console.log(
      `🎯 [COLLISION] ${collisionType} | Normal: (${event.normalX.toFixed(2)}, ${event.normalY.toFixed(2)}) ` +
      `| Penetration: ${(event.penetrationDepth_m * 1000).toFixed(1)}mm | Energy loss: ${event.energyLoss_percent.toFixed(1)}%`
    );
  }

  /**
   * Generate diagnostics report
   */
  generateReport(): string {
    const successRate =
      this.session.shotAttempts > 0
        ? ((this.session.successfulShots / this.session.shotAttempts) * 100).toFixed(1)
        : '0';

    const report = `
╔════════════════════════════════════════════════════════════════╗
║          RIM DIAGNOSTICS REPORT - Session: ${this.session.sessionId}  ║
╚════════════════════════════════════════════════════════════════╝

📊 SHOT STATISTICS
  Total shots: ${this.session.shotAttempts}
  Successful: ${this.session.successfulShots}
  Rejected: ${this.session.rejectedShots}
  Success rate: ${successRate}%

🎯 COLLISION ANALYSIS
  Total collisions: ${this.session.collisions.length}
  Early collisions: ${this.session.earlyCollisions}
  Late collisions: ${this.session.lateCollisions}

  Collision types:
    - Front rim: ${this.session.collisions.filter(c => c.collisionType === 'FRONT_RIM').length}
    - Back rim: ${this.session.collisions.filter(c => c.collisionType === 'BACK_RIM').length}
    - Side rim: ${this.session.collisions.filter(c => c.collisionType === 'SIDE_RIM').length}
    - Top rim: ${this.session.collisions.filter(c => c.collisionType === 'TOP_RIM').length}
    - Inner rim: ${this.session.collisions.filter(c => c.collisionType === 'INNER_RIM').length}

⚠️  PHYSICS ISSUES
  ${this.session.earlyCollisions > 0 ? `⚠️  Early collisions detected (${this.session.earlyCollisions}) - ball hitting rim too far away?` : '✓ No early collisions'}
  ${this.session.lateCollisions > 0 ? `⚠️  Late collisions detected (${this.session.lateCollisions}) - ball already deep in rim?` : '✓ No late collisions'}

📈 PENETRATION ANALYSIS
  ${this.getPenetrationStats()}

💡 NEXT STEPS
  1. Review collision log entries below
  2. Identify patterns in rejections
  3. Measure visual vs physics discrepancies
  4. Propose targeted fixes

─────────────────────────────────────────────────────────────────
DETAILED COLLISION LOG (first 20):
─────────────────────────────────────────────────────────────────
${this.getDetailedLog().join('\n')}
`;

    return report;
  }

  private getPenetrationStats(): string {
    if (this.session.collisions.length === 0) return 'No collision data';

    const depths = this.session.collisions.map(c => c.penetrationDepth_m);
    const avg = depths.reduce((a, b) => a + b, 0) / depths.length;
    const max = Math.max(...depths);
    const min = Math.min(...depths);

    return `Average: ${(avg * 1000).toFixed(1)}mm | Max: ${(max * 1000).toFixed(1)}mm | Min: ${(min * 1000).toFixed(1)}mm`;
  }

  private getDetailedLog(): string[] {
    return this.session.collisions.slice(0, 20).map((c, i) => {
      const earlyFlag = c.isEarlyCollision ? ' ⚠️ EARLY' : '';
      const lateFlag = c.isLateCollision ? ' ⚠️ LATE' : '';
      return `  [${i + 1}] ${c.collisionType} | Penetration: ${(c.penetrationDepth_m * 1000).toFixed(1)}mm | Energy: ${c.energyLoss_percent.toFixed(1)}%${earlyFlag}${lateFlag}`;
    });
  }

  get collisions(): CollisionEvent[] {
    return this.collisionLog;
  }

  exportSession(): DiagnosticsSession {
    return { ...this.session };
  }

  clearLog(): void {
    this.collisionLog = [];
    this.session.collisions = [];
    console.log('🔍 [DIAGNOSTICS] Log cleared');
  }
}

// Singleton instance
export const rimDiagnosticsLogger = new RimDiagnosticsLogger();

// Export types
export { RimDiagnosticsLogger };
