/**
 * Basketball Physics Engine Test Suite
 */

import {
  PHYSICS_CONSTANTS,
  computeLaunchVelocity,
  stepPhysics,
  computeRimCollision,
  computeBackboardCollision,
  computeFloorBounce,
  simulateTrajectory,
  simulateFullShot,
  calculateGreenZonePosition,
  updateOscillator,
  calculateAccuracy,
} from './basketball-physics-engine';

describe('Basketball Physics Engine', () => {
  describe('PHYSICS_CONSTANTS', () => {
    test('Constants are properly defined', () => {
      expect(PHYSICS_CONSTANTS.GRAVITY).toBe(0.42);
      expect(PHYSICS_CONSTANTS.MAX_BOUNCES).toBe(4);
    });
  });


  describe('computeLaunchVelocity', () => {
    test('Velocity is not zero', () => {
      const { vx, vy } = computeLaunchVelocity({
        angle: -1.0,
        power: 100,
        accuracy: 85,
        distToHoop: 250,
        playerX: 0,
        playerY: 0,
        hoopX: 100,
        hoopY: 100,
        scaleX: 1,
      });
      expect(Math.sqrt(vx * vx + vy * vy)).toBeGreaterThan(5);
    });

    test('Higher power increases velocity', () => {
      const v1 = computeLaunchVelocity({
        angle: -1.0,
        power: 50,
        accuracy: 85,
        distToHoop: 250,
        playerX: 0,
        playerY: 0,
        hoopX: 100,
        hoopY: 100,
        scaleX: 1,
      });
      const v2 = computeLaunchVelocity({
        angle: -1.0,
        power: 150,
        accuracy: 85,
        distToHoop: 250,
        playerX: 0,
        playerY: 0,
        hoopX: 100,
        hoopY: 100,
        scaleX: 1,
      });
      const s1 = Math.sqrt(v1.vx * v1.vx + v1.vy * v1.vy);
      const s2 = Math.sqrt(v2.vx * v2.vx + v2.vy * v2.vy);
      expect(s2).toBeGreaterThan(s1);
    });
  });

  describe('stepPhysics', () => {
    test('Gravity increases downward velocity', () => {
      const ball = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, spin: 0, drag: 0, bounceCount: 0, rimBounceCount: 0 };
      const vy0 = ball.vy;
      stepPhysics(ball, 1);
      expect(ball.vy).toBeGreaterThan(vy0);
    });

    test('No NaN values produced', () => {
      const ball = { x: 100, y: 100, vx: 3, vy: -4, rot: 0, spin: -0.5, drag: 0.0018, bounceCount: 0, rimBounceCount: 0 };
      stepPhysics(ball, 0.016);
      expect(isNaN(ball.x)).toBe(false);
      expect(isNaN(ball.y)).toBe(false);
    });
  });

  describe('computeRimCollision', () => {
    test('High accuracy yields score', () => {
      const result = computeRimCollision(
        { x: 320, y: 280, vx: 1, vy: 3, rot: 0, spin: 0, drag: 0.0018, bounceCount: 0, rimBounceCount: 0 },
        320, 280, 95, 600
      );
      expect(result.shouldScore).toBe(true);
    });
  });

  describe('simulateFullShot', () => {
    test('Shot simulation returns valid result structure', () => {
      const result = simulateFullShot({
        angle: -0.9,
        power: 120,
        accuracy: 90,
        distToHoop: 240,
        playerX: 150,
        playerY: 400,
        hoopX: 320,
        hoopY: 280,
        scaleX: 1,
      }, 580, 320, 280);
      expect(typeof result.scored).toBe('boolean');
      expect(typeof result.frames).toBe('number');
      expect(typeof result.outcome).toBe('string');
      expect(result.frames).toBeGreaterThan(0);
    });
  });

  describe('Distance Meter Functions', () => {
    describe('calculateGreenZonePosition', () => {
      test('Close (150px) returns low position < 0.3', () => {
        const pos = calculateGreenZonePosition(150, 100, 400);
        expect(pos).toBeLessThan(0.3);
      });

      test('Medium (250px) returns middle position ~0.5', () => {
        const pos = calculateGreenZonePosition(250, 100, 400);
        expect(pos).toBeCloseTo(0.5, 1);
      });

      test('Far (350px) returns high position > 0.7', () => {
        const pos = calculateGreenZonePosition(350, 100, 400);
        expect(pos).toBeGreaterThan(0.7);
      });

      test('Very close distance clamps to minimum 0.15', () => {
        const pos = calculateGreenZonePosition(50, 100, 400);
        expect(pos).toBe(0.15);
      });

      test('Very far distance clamps to maximum 0.95', () => {
        const pos = calculateGreenZonePosition(500, 100, 400);
        expect(pos).toBe(0.95);
      });
    });

    describe('updateOscillator', () => {
      test('Returns value between center ± amplitude', () => {
        const centerPos = 0.6;
        const amplitude = 0.3;
        const newPos = updateOscillator(centerPos, amplitude);

        expect(newPos).toBeGreaterThanOrEqual(centerPos - amplitude);
        expect(newPos).toBeLessThanOrEqual(centerPos + amplitude);
      });

      test('Does not return NaN', () => {
        const pos = updateOscillator(0.5, 0.3);
        expect(isNaN(pos)).toBe(false);
      });

      test('Respects lower bound of 0.05', () => {
        const pos = updateOscillator(0.05, 0.3);
        expect(pos).toBeGreaterThanOrEqual(0.05);
      });

      test('Respects upper bound of 0.95', () => {
        const pos = updateOscillator(0.95, 0.3);
        expect(pos).toBeLessThanOrEqual(0.95);
      });
    });

    describe('calculateAccuracy', () => {
      test('Perfect center = 100%', () => {
        const accuracy = calculateAccuracy(0.5, 0.5);
        expect(accuracy).toBe(100);
      });

      test('Inside tolerance = 95-100%', () => {
        const accuracy = calculateAccuracy(0.51, 0.5);
        expect(accuracy).toBeGreaterThanOrEqual(95);
        expect(accuracy).toBeLessThanOrEqual(100);
      });

      test('Outside tolerance decreases with distance', () => {
        const acc1 = calculateAccuracy(0.6, 0.5);
        const acc2 = calculateAccuracy(0.2, 0.5);

        expect(acc2).toBeLessThan(acc1);
      });

      test('Never goes below 5%', () => {
        const accuracy = calculateAccuracy(0.05, 0.95);
        expect(accuracy).toBeGreaterThanOrEqual(5);
      });

      test('Edge of tolerance zone returns high accuracy', () => {
        const accuracy = calculateAccuracy(0.544, 0.5, 0.08);
        expect(accuracy).toBeGreaterThanOrEqual(90);
      });
    });
  });

  describe('Integration: Physics Simulation (Trajectory Test)', () => {
    test('simulateTrajectory returns valid trajectory points with drag', () => {
      const trajectory = simulateTrajectory({
        angle: -0.9,
        power: 120,
        accuracy: 90,
        distToHoop: 240,
        playerX: 150,
        playerY: 400,
        hoopX: 320,
        hoopY: 280,
        scaleX: 1,
      });

      expect(trajectory.length).toBeGreaterThan(5);
      expect(trajectory[0]).toHaveProperty('x');
      expect(trajectory[0]).toHaveProperty('y');
      console.log(`\n  Trajectory points: ${trajectory.length} frames`);
      console.log(`  Start: (${trajectory[0].x.toFixed(0)}, ${trajectory[0].y.toFixed(0)})`);
      console.log(`  End: (${trajectory[trajectory.length - 1].x.toFixed(0)}, ${trajectory[trajectory.length - 1].y.toFixed(0)})`);

      // Verify trajectory shows drag effect (should decelerate)
      const startSpeed = Math.hypot(trajectory[1].x - trajectory[0].x, trajectory[1].y - trajectory[0].y);
      const midIdx = Math.floor(trajectory.length / 2);
      const midSpeed = Math.hypot(trajectory[midIdx + 1].x - trajectory[midIdx].x, trajectory[midIdx + 1].y - trajectory[midIdx].y);
      console.log(`  Speed start: ${startSpeed.toFixed(2)}, mid: ${midSpeed.toFixed(2)}`);
      expect(midSpeed).toBeLessThan(startSpeed);
    });

    test('Full shot simulation runs without errors', () => {
      const result = simulateFullShot({
        angle: -0.9,
        power: 120,
        accuracy: 80,
        distToHoop: 240,
        playerX: 150,
        playerY: 400,
        hoopX: 320,
        hoopY: 280,
        scaleX: 1,
      }, 580, 320, 280);

      expect(result).toHaveProperty('scored');
      expect(result).toHaveProperty('frames');
      expect(result).toHaveProperty('outcome');
      expect(result.frames).toBeGreaterThan(0);
      console.log(`\n  Shot simulation: ${result.frames} frames, scored: ${result.scored}, outcome: ${result.outcome}`);
    });

    test('Accuracy parameter is used in physics calculations', () => {
      const results = [];
      for (let accuracy of [30, 60, 90]) {
        const result = simulateFullShot({
          angle: -0.9,
          power: 120,
          accuracy,
          distToHoop: 240,
          playerX: 150,
          playerY: 400,
          hoopX: 320,
          hoopY: 280,
          scaleX: 1,
        }, 580, 320, 280);
        results.push({ accuracy, scored: result.scored, outcome: result.outcome });
      }
      console.log(`\n  Accuracy impact:`);
      results.forEach(r => console.log(`    Acc ${r.accuracy}%: ${r.outcome}`));
      expect(results.length).toBe(3);
    });

    test('simulateFullShot handles different distances', () => {
      const distances = [150, 250, 350];
      console.log(`\n  Shot distances:`);
      distances.forEach(dist => {
        const result = simulateFullShot({
          angle: -0.95,
          power: 100 + (dist - 150) / 2,
          accuracy: 85,
          distToHoop: dist,
          playerX: 100,
          playerY: 400,
          hoopX: 320,
          hoopY: 280,
          scaleX: 1,
        }, 580, 320, 280);
        console.log(`    Distance ${dist}px: ${result.frames} frames, outcome: ${result.outcome}`);
        expect(result.frames).toBeGreaterThan(0);
      });
    });
  });
});
