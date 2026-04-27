'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AdvancedBasketballSimulator,
  Vector3,
  determineShotOutcome,
  ADVANCED_PHYSICS_CONSTANTS,
  RimCollisionResult,
} from './advanced-basketball-physics';

interface DemoState {
  isSimulating: boolean;
  shotOutcome: any;
  displayText: string;
  audioEvents: any[];
  frameCount: number;
}

export function AdvancedPhysicsDemoComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulatorRef = useRef<AdvancedBasketballSimulator | null>(null);
  const animationRef = useRef<number>(0);
  const [state, setState] = useState<DemoState>({
    isSimulating: false,
    shotOutcome: null,
    displayText: 'Ready to shoot!',
    audioEvents: [],
    frameCount: 0,
  });

  // Initialize simulator
  useEffect(() => {
    simulatorRef.current = new AdvancedBasketballSimulator(
      0,      // rimCenterX
      0,      // rimCenterY
      3.05,   // rimCenterZ (10ft in meters)
      0.15    // backboardX
    );
  }, []);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Scale: 1m = 100px
    const scale = 100;
    const centerX = width / 2;
    const centerY = height / 2;

    const drawFrame = () => {
      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      if (!simulatorRef.current) return;

      const sim = simulatorRef.current;
      const ball = sim.ball;
      const rimCenter = sim.rimCenter;

      // Draw court (simple)
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 50, width - 100, height - 100);

      // Draw backboard
      const bbX = centerX + rimCenter.x * scale;
      const bbTop = centerY - (rimCenter.z + 0.45) * scale;
      const bbBottom = centerY - (rimCenter.z - 0.9) * scale;
      ctx.fillStyle = '#222';
      ctx.fillRect(bbX - 5, bbTop, 10, bbBottom - bbTop);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 3;
      ctx.strokeRect(bbX - 5, bbTop, 10, bbBottom - bbTop);

      // Draw rim segments
      const rimScreenX = centerX + rimCenter.x * scale;
      const rimScreenY = centerY - rimCenter.z * scale;
      const rimScreenRadius = ADVANCED_PHYSICS_CONSTANTS.RIM_RADIUS * scale;

      // Draw rim as circle with segments highlighted
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(rimScreenX, rimScreenY, rimScreenRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Highlight rim segments
      for (let i = 0; i < 16; i++) {
        const angle1 = (i * 22.5 * Math.PI) / 180;
        const angle2 = ((i + 1) * 22.5 * Math.PI) / 180;

        const x1 = rimScreenX + rimScreenRadius * Math.cos(angle1);
        const y1 = rimScreenY + rimScreenRadius * Math.sin(angle1);
        const x2 = rimScreenX + rimScreenRadius * Math.cos(angle2);
        const y2 = rimScreenY + rimScreenRadius * Math.sin(angle2);

        ctx.strokeStyle = i % 4 === 0 ? '#ffd60a' : '#ff6b35';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Draw net (simplified cloth visualization)
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
      ctx.lineWidth = 1;
      for (let i = 0; i < sim.netMesh.vertices.length; i++) {
        const v = sim.netMesh.vertices[i];
        const vx = centerX + v.position.x * scale;
        const vy = centerY - v.position.z * scale;

        ctx.fillStyle = 'rgba(255, 200, 100, 0.4)';
        ctx.fillRect(vx - 2, vy - 2, 4, 4);
      }

      // Draw net constraints as lines
      for (const constraint of sim.netMesh.constraints) {
        const v1 = sim.netMesh.vertices[constraint.v1];
        const v2 = sim.netMesh.vertices[constraint.v2];

        ctx.beginPath();
        ctx.moveTo(centerX + v1.position.x * scale, centerY - v1.position.z * scale);
        ctx.lineTo(centerX + v2.position.x * scale, centerY - v2.position.z * scale);
        ctx.stroke();
      }

      // Draw ball
      const ballScreenX = centerX + ball.position.x * scale;
      const ballScreenY = centerY - ball.position.z * scale;

      ctx.fillStyle = '#ff8c00';
      ctx.beginPath();
      ctx.arc(ballScreenX, ballScreenY, ADVANCED_PHYSICS_CONSTANTS.BALL_RADIUS * scale, 0, Math.PI * 2);
      ctx.fill();

      // Draw velocity vector
      const velMag = Vector3.magnitude(ball.velocity);
      if (velMag > 0.1) {
        const velX = (ball.velocity.x / velMag) * 50;
        const velZ = (ball.velocity.z / velMag) * 50;

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ballScreenX, ballScreenY);
        ctx.lineTo(ballScreenX + velX, ballScreenY - velZ);
        ctx.stroke();
      }

      // Draw spin indicator
      const spinMag = Vector3.magnitude(ball.spin);
      if (spinMag > 0.1) {
        ctx.strokeStyle = '#00ccff';
        ctx.lineWidth = 2;
        const spinRadius = 8;
        ctx.beginPath();
        ctx.arc(ballScreenX, ballScreenY, spinRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Direction indicator
        const spinDir = ball.spin.x > 0 ? 'CW' : 'CCW';
        ctx.fillStyle = '#00ccff';
        ctx.font = '12px monospace';
        ctx.fillText(spinDir, ballScreenX - 15, ballScreenY - 15);
      }

      // Draw stats
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.fillText(`Position: (${ball.position.x.toFixed(2)}, 0, ${ball.position.z.toFixed(2)})`, 20, 30);
      ctx.fillText(`Velocity: ${Vector3.magnitude(ball.velocity).toFixed(2)} m/s`, 20, 50);
      ctx.fillText(`Spin: ${Vector3.magnitude(ball.spin).toFixed(2)} rad/s`, 20, 70);
      ctx.fillText(`Rim Taps: ${ball.rimTapSequence.length}`, 20, 90);
      ctx.fillText(`Energy: ${ball.kineticEnergy.toFixed(2)} J`, 20, 110);

      if (state.shotOutcome) {
        ctx.fillStyle = '#ffd60a';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`Result: ${state.shotOutcome.description}`, 20, 130);
      }
    };

    const animationLoop = () => {
      drawFrame();
      animationRef.current = requestAnimationFrame(animationLoop);
    };

    animationLoop();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [state.shotOutcome]);

  // Physics simulation loop
  useEffect(() => {
    if (!state.isSimulating || !simulatorRef.current) return;

    let frameCount = 0;
    const maxFrames = 600; // 10 seconds at 60 FPS

    const simulationLoop = setInterval(() => {
      const sim = simulatorRef.current!;
      sim.update(1 / 60);

      frameCount++;

      // Stop if ball has stopped moving
      const ballVel = Vector3.magnitude(sim.ball.velocity);
      const ballEnergy = sim.ball.kineticEnergy;

      if (
        frameCount > 30 &&
        ballVel < 0.1 &&
        ballEnergy < 0.01 &&
        sim.ball.position.z < 0
      ) {
        // Shot complete
        const outcome = determineShotOutcome(
          {
            segmentIndex: 0,
            contactPoint: sim.ball.position,
            velocityMagnitude: ballVel,
            angleOfIncidence: 0,
            newVelocity: sim.ball.velocity,
            newSpin: sim.ball.spin,
            energyLoss: 0,
            outcome: 'SWISH',
          } as RimCollisionResult,
          frameCount
        );

        setState((prev) => ({
          ...prev,
          isSimulating: false,
          shotOutcome: outcome,
          displayText: outcome.description,
          frameCount,
        }));
        clearInterval(simulationLoop);
        return;
      }

      if (frameCount >= maxFrames) {
        setState((prev) => ({
          ...prev,
          isSimulating: false,
          displayText: 'Simulation ended (timeout)',
        }));
        clearInterval(simulationLoop);
      }
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(simulationLoop);
  }, [state.isSimulating]);

  const shootBall = (
    initialVelX: number,
    initialVelZ: number,
    spinX: number,
    spinY: number
  ) => {
    if (!simulatorRef.current) return;

    const sim = simulatorRef.current;
    sim.reset();

    // Set ball position and velocity (from player)
    sim.ball.position = Vector3.create(-2, 0, 2);
    sim.ball.velocity = Vector3.create(initialVelX, 0, initialVelZ);
    sim.ball.spin = Vector3.create(spinX, spinY, 0);

    setState({
      isSimulating: true,
      shotOutcome: null,
      displayText: 'Shooting...',
      audioEvents: [],
      frameCount: 0,
    });
  };

  return (
    <div className="w-full bg-black p-8 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Advanced Basketball Physics Simulator</h2>

      <div className="mb-6">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full border-2 border-orange-500 rounded"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => shootBall(4, -6, 8, 0)}
          disabled={state.isSimulating}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          Perfect Shot (High Arc + Backspin)
        </button>
        <button
          onClick={() => shootBall(3, -5, 10, 0)}
          disabled={state.isSimulating}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          High Arc Shot
        </button>
        <button
          onClick={() => shootBall(5, -4, -5, 0)}
          disabled={state.isSimulating}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          Low Arc + Topspin
        </button>
        <button
          onClick={() => shootBall(3, -5, 5, 6)}
          disabled={state.isSimulating}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          Side Spin Shot
        </button>
        <button
          onClick={() => shootBall(6, -3, 2, 0)}
          disabled={state.isSimulating}
          className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          Bank Shot (Backboard)
        </button>
        <button
          onClick={() => shootBall(8, -7, -8, 0)}
          disabled={state.isSimulating}
          className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          Hard Shot (Topspin)
        </button>
      </div>

      <div className="bg-gray-900 p-4 rounded text-white font-monospace text-sm">
        <p className="mb-2">Status: {state.displayText}</p>
        {state.shotOutcome && (
          <>
            <p className="text-green-400">✓ {state.shotOutcome.description}</p>
            <p>Duration: {state.shotOutcome.duration.toFixed(2)}s</p>
            <p>Score: {state.shotOutcome.scored ? 'YES ✓' : 'NO ✗'}</p>
            <p>Audio Events: {state.shotOutcome.soundEvents.length}</p>
          </>
        )}
      </div>

      <div className="mt-6 text-white text-sm">
        <h3 className="font-bold mb-2">Features:</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>16-segment rim collision detection</li>
          <li>Magnus effect (backspin/topspin/sidespin)</li>
          <li>Backboard bounce with angle variance</li>
          <li>Net cloth simulation with oscillation</li>
          <li>Deterministic physics outcomes</li>
          <li>Audio event generation</li>
        </ul>
      </div>
    </div>
  );
}
