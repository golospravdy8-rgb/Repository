"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { io, Socket } from "socket.io-client";
import { PowerMeterSystem } from "@/lib/game/powerMeterSystem";
import { createMeterElement, hideMeter, showAccuracyFeedback } from "@/lib/game/powerMeterUI";

interface RucheekGameCanvasProps {
  isVisible: boolean;
  userName?: string;
  userPhone?: string;
  gameRoomId?: string;
}

const PLAYER_COLORS = ["#4fc3f7","#81c784","#ffb74d","#f06292","#ce93d8","#80cbc4"];
const MAX_PLAYERS = 6;

export default function RucheekGameCanvas({ isVisible, userName = "", userPhone = "", gameRoomId = "general" }: RucheekGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pnameRef = useRef<HTMLInputElement>(null);
  const btnStartRef = useRef<HTMLButtonElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const remotePlayersRef = useRef<Map<string, any>>(new Map());
  const [mounted, setMounted] = useState(false);
  const [pname, setPname] = useState(userName);
  const [showModal, setShowModal] = useState(false);
  const [, forceUpdate] = useState(0);
  const gsRef = useRef<any>({
    state: "waiting",
    players: [] as any[],
    shootStates: [] as any[],
    flashes: [] as any[],
    selectedMoveIdx: -1,
    disputeP1: 0,
    disputeP2: -1,
    netShake: false,
    netShakeEnd: 0,
    netShakeT: 0,
  });
  const playerIdRef = useRef<number>(0);
  const lastEmitTimeRef = useRef<number>(0);

  // Power Meter System refs and state
  const powerMeterRef = useRef<PowerMeterSystem | null>(null);
  const meterElementRef = useRef<HTMLDivElement | null>(null);
  const [meterVisible, setMeterVisible] = useState(false);
  const [greenLinePosition, setGreenLinePosition] = useState(180);

  useEffect(() => { setMounted(true); }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!mounted || socketRef.current) return;

    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3006';
    const socketUrl = `${protocol}//${host}`;

    console.log(`[RucheekGameCanvas] Connecting to Socket.IO at ${socketUrl}`);

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log(`[RucheekGameCanvas] Connected: ${socket.id}`);
      // Join game room
      socket.emit('join_game', {
        roomId: gameRoomId,
        playerIndex: playerIdRef.current,
        x: 680,
        y: 584,
        playerName: userName,
      });
    });

    // Listen for remote player movements
    socket.on('player_moved', (data: any) => {
      console.log('[RucheekGameCanvas] Remote player moved:', data);
      remotePlayersRef.current.set(data.socketId, {
        socketId: data.socketId,
        playerIndex: data.playerIndex,
        x: data.x,
        y: data.y,
        status: data.status,
        name: data.name || `Player ${data.playerIndex}`,
      });
      forceUpdate(n => n + 1);
    });

    // Listen for player joined
    socket.on('player_joined', (data: any) => {
      console.log('[RucheekGameCanvas] Remote player joined:', data);
      if (data.socketId !== socket.id) {
        remotePlayersRef.current.set(data.socketId, {
          socketId: data.socketId,
          playerIndex: data.playerIndex,
          x: data.x,
          y: data.y,
          status: 'alive',
          name: data.name || `Player ${data.playerIndex}`,
        });
      }
    });

    // Listen for disconnections
    socket.on('player_disconnected', (data: any) => {
      console.log('[RucheekGameCanvas] Remote player disconnected:', data);
      remotePlayersRef.current.delete(data.socketId);
      forceUpdate(n => n + 1);
    });

    socket.on('disconnect', () => {
      console.log('[RucheekGameCanvas] Disconnected from server');
      remotePlayersRef.current.clear();
    });

    socket.on('error', (error: any) => {
      console.error('[RucheekGameCanvas] Socket error:', error);
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [mounted, gameRoomId, userName]);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    if (!isVisible) {
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Get chat container dimensions with fallback
    const chatContainer = document.querySelector('[style*="flex: 1"][style*="overflowY"]') ||
                         document.querySelector('[style*="flex: 1, overflowY"]');
    const rect = chatContainer
      ? (chatContainer as HTMLElement).getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    canvas.style.position = "fixed";
    canvas.style.left = rect.left + "px";
    canvas.style.top = rect.top + "px";
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const W_ORIG = 860, H_ORIG = 624, GY_ORIG = 584;
    const scaleX = canvas.width / W_ORIG;
    const scaleY = canvas.height / H_ORIG;
    const W = canvas.width;
    const H = canvas.height;
    const GY = GY_ORIG * scaleY;
    // Real gravity: 9.81 m/s² = 0.095 px/frame² at 35px=1m, 60fps
    // Using 0.12 for slightly stronger visual arc
    const G = 0.12;

    const POLE_X = 12*scaleX, ARM_X = 52*scaleX;
    const BOARD_X = 57*scaleX, BOARD_W = 10*scaleX;
    const BOARD_TOP = 189*scaleY, BOARD_BOT = 292*scaleY;
    const BOARD_FACE = BOARD_X + BOARD_W;
    const HOOP_X = 110*scaleX, HOOP_Y = 307*scaleY;
    const HOOP_R = 27*scaleX;
    const P_START = W * 0.65, P_STEP = W * 0.07;
    const P_START_Y = 584 * scaleY;

    const gs = gsRef.current;
    let ss_ideal_power = 50;

    // КРОК 1: Правильний maxDistance розрахунок
    // Максимальна дистанція = від стартової позиції гравця до кільця
    const realMaxDistance = Math.hypot(
      HOOP_X - P_START,
      HOOP_Y - P_START_Y
    );

    // Initialize Power Meter System з правильним maxDistance
    if (!powerMeterRef.current) {
      powerMeterRef.current = new PowerMeterSystem(realMaxDistance);
      console.log(`[CALIBRATION] maxDistance=${realMaxDistance.toFixed(0)}px (from P_START=${P_START.toFixed(0)}, Y=${P_START_Y.toFixed(0)} to HOOP=${HOOP_X.toFixed(0)}, ${HOOP_Y.toFixed(0)})`);
    }

    // Ball physics constants
    const BALL_RADIUS = 12 * scaleX;
    const HOOP_RADIUS = 22 * scaleX;
    const HOOP_DEPTH = 15 * scaleY;
    const MIN_BALL_SPEED = 5.0;
    const MAX_BALL_SPEED = 16.0;

    function calculateBallSpeedFromPower(powerPercent: number): number {
      // Power scale: 0-200% → Speed: 5-16 m/s
      const clampedPower = Math.max(0, Math.min(200, powerPercent));
      const speedMultiplier = clampedPower / 200;
      return MIN_BALL_SPEED + (MAX_BALL_SPEED - MIN_BALL_SPEED) * speedMultiplier;
    }

    function checkBallInHoop(ballPos: any, hoopX: number, hoopY: number, hoopRadius: number): boolean {
      const dx = ballPos.x - hoopX;
      const dy = ballPos.y - hoopY;
      const horizontalDist = Math.abs(dx);
      const inRimArea = horizontalDist < (hoopRadius + BALL_RADIUS);
      const belowRim = ballPos.y > hoopY + 10 * scaleY;
      return inRimArea && belowRim;
    }

    function getHoopInsideDepth(ballX: number, ballY: number, hoopX: number, hoopY: number): number {
      const dx = ballX - hoopX;
      const horizontalDist = Math.abs(dx);
      if (horizontalDist > HOOP_RADIUS) return 0;
      const depthPercent = (ballY - hoopY) / HOOP_DEPTH;
      return Math.max(0, Math.min(1, depthPercent));
    }

    function recalculateIdealPowerFor200Scale(distFraction: number): number {
      if (distFraction <= 0.3) return 100;
      if (distFraction <= 0.6) return 140;
      if (distFraction <= 0.85) return 190;
      return 200;
    }

    function calculateIdealPowerByExactDistance(distToHoop: number): number {
      // Professional calibration: distance → ideal power (0-200%)
      const maxDist = Math.hypot(W, H);
      const distFraction = distToHoop / maxDist;

      let idealPower;

      if (distFraction <= 0.15) {
        // Very close (0-15%)
        idealPower = 30 + (distFraction / 0.15) * 20;
      } else if (distFraction <= 0.35) {
        // Close (15-35%)
        idealPower = 50 + ((distFraction - 0.15) / 0.20) * 20;
      } else if (distFraction <= 0.55) {
        // Mid-range (35-55%)
        idealPower = 70 + ((distFraction - 0.35) / 0.20) * 50;
      } else if (distFraction <= 0.80) {
        // Three-point (55-80%)
        idealPower = 120 + ((distFraction - 0.55) / 0.25) * 50;
      } else {
        // Deep (80%+)
        idealPower = 170 + ((distFraction - 0.80) / 0.20) * 30;
      }

      return Math.max(30, Math.min(200, Math.round(idealPower)));
    }

    // Game logic functions from original demo
    function hitTestPlayer(mx: number, my: number, px: number, py: number) {
      if (Math.hypot(mx - px, my - (py - 54*scaleY)) <= 12*scaleX) return true;
      if (mx >= px - 5*scaleX && mx <= px + 5*scaleX && my >= py - 44*scaleY && my <= py - 17*scaleY) return true;
      if (my >= py - 19*scaleY && my <= py + 1*scaleY) {
        const t = (my - (py - 18*scaleY)) / (18*scaleY);
        if (mx >= px - 12*scaleX*t && mx <= px + 12*scaleX*t) return true;
      }
      return false;
    }

    function addFlash(text: string, x: number, y: number, color: string) {
      gs.flashes.push({ text, x, y, color, alpha: 1, dy: 0 });
    }

    function simTraj(sx: number, sy: number, angle: number, speed: number, maxSteps: number) {
      const pts = [{ x: sx, y: sy }];
      let x = sx, y = sy, vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
      for (let i = 0; i < (maxSteps || 95); i++) {
        vy += G;
        x += vx;
        y += vy;
        pts.push({ x, y });
        if (y > GY || x < 0 || x > W) break;
      }
      return pts;
    }

    function getIdealAngleForDistance(distToHoop: number) {
      const distFraction = distToHoop / Math.hypot(W, H);
      let angleRange = { min: -0.60, ideal: -0.70, max: -0.80 };

      if (distFraction > 0.5) {
        angleRange = { min: -0.75, ideal: -0.87, max: -0.98 };
      }
      if (distFraction > 0.75) {
        angleRange = { min: -0.85, ideal: -0.93, max: -1.02 };
      }
      return angleRange;
    }

    function calculateGreenZoneBands(distToHoop: number) {
      const distFraction = distToHoop / Math.hypot(W, H);
      let tolerance;
      if (distFraction <= 0.3) {
        tolerance = 5;
      } else if (distFraction <= 0.6) {
        tolerance = 8;
      } else {
        tolerance = 7;
      }
      return tolerance;
    }

    // NEW: Calculate ideal power based on distance (0-200% scale)
    function calculateIdealPowerByDistance(playerX: number, playerY: number): number {
      const distToHoop = Math.hypot(HOOP_X - playerX, HOOP_Y - playerY);
      const maxDist = Math.hypot(W, H);
      const distFraction = distToHoop / maxDist;

      let idealPower;
      if (distFraction <= 0.3) {
        // Close range: 20% → 50% power
        idealPower = 30 + (distFraction / 0.3) * 20;
      } else if (distFraction <= 0.6) {
        // Mid range: 30-60% → 95-100% power
        idealPower = 50 + ((distFraction - 0.3) / 0.3) * 50;
      } else if (distFraction <= 0.85) {
        // Three-point: 60-85% → 150% power
        idealPower = 100 + ((distFraction - 0.6) / 0.25) * 50;
      } else {
        // Deep range: 85%+ → 190% power
        idealPower = 150 + ((distFraction - 0.85) / 0.15) * 40;
      }
      return Math.max(30, Math.min(200, Math.round(idealPower)));
    }

    // NEW: Calculate green zone tolerance percentage based on distance
    function calculateGreenZoneTolerance(distFraction: number): number {
      if (distFraction <= 0.3) {
        return 5; // Close: ±5%
      } else if (distFraction <= 0.6) {
        return 8; // Mid: ±8%
      } else if (distFraction <= 0.85) {
        return 7; // Three-point: ±7%
      } else {
        return 6; // Deep: ±6%
      }
    }

    // NEW: Draw dynamic power meter with distance-based green zone
    function drawDynamicPowerMeter(ctx: any, x: number, y: number, width: number, height: number, currentPower: number, idealPower: number, tolerance: number) {
      const fillHeight = (currentPower / 200) * height;
      const idealY = y + height - (idealPower / 200) * height;
      const toleranceHeight = (tolerance * 2 / 100) * height;

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);

      // Green zone (dynamic position based on ideal power)
      ctx.fillStyle = 'rgba(68,255,68,0.5)';
      ctx.fillRect(x, idealY - toleranceHeight / 2, width, toleranceHeight);

      // Current power fill
      const clr = currentPower > 92 ? '#00ffaa' : currentPower > 85 ? '#44cc44' : currentPower > 55 ? '#ffcc00' : '#e05545';
      ctx.fillStyle = clr;
      ctx.fillRect(x, y + height - fillHeight, width, fillHeight);

      // Current power indicator line
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - 5, y + height - fillHeight);
      ctx.lineTo(x + width + 5, y + height - fillHeight);
      ctx.stroke();

      // Ideal power line (dashed)
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(100,255,100,0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 3, idealY);
      ctx.lineTo(x + width + 3, idealY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function getShootingPhysicsForDistance(distToHoop: number) {
      const maxDist = Math.hypot(W, H);
      const distFraction = distToHoop / maxDist;

      let physics = {
        minPowerRequired: 35,
        idealPower: 50,
        maxPowerUseful: 70,
        tolerance: 5,
        estimatedSpeed: 6.5,
        optimalAngle: 38,
        angleTolerance: 4
      };

      if (distFraction < 0.30) {
        physics = {
          minPowerRequired: 35,
          idealPower: 50,
          maxPowerUseful: 70,
          tolerance: 8,
          estimatedSpeed: 6.5,
          optimalAngle: 38,
          angleTolerance: 4
        };
      } else if (distFraction < 0.60) {
        physics = {
          minPowerRequired: 55,
          idealPower: 70,
          maxPowerUseful: 85,
          tolerance: 7,
          estimatedSpeed: 8.0,
          optimalAngle: 44,
          angleTolerance: 3.5
        };
      } else if (distFraction < 0.85) {
        physics = {
          minPowerRequired: 75,
          idealPower: 88,
          maxPowerUseful: 98,
          tolerance: 6,
          estimatedSpeed: 9.5,
          optimalAngle: 50,
          angleTolerance: 3
        };
      } else {
        physics = {
          minPowerRequired: 90,
          idealPower: 98,
          maxPowerUseful: 100,
          tolerance: 5,
          estimatedSpeed: 11.0,
          optimalAngle: 53,
          angleTolerance: 2.5
        };
      }

      return physics;
    }

    function calculateRealisticAccuracy(
      distToHoop: number,
      shotAngle: number,
      shotPower: number,
      idealAngle: number,
      idealPower: number,
      greenZoneTolerance: number
    ) {
      // Check if power is in green zone
      const powerInZone = Math.abs(shotPower - idealPower) <= greenZoneTolerance;

      // Check if angle is acceptable (±6° tolerance converted to radians)
      const angleInRange = Math.abs(shotAngle - idealAngle) <= (6 * Math.PI / 180);

      // GUARANTEED SCORE: Power in zone AND angle reasonable
      if (powerInZone && angleInRange) {
        return { score: true, matchPct: 95 };
      }

      // LIKELY SCORE: Power in zone but angle slightly off (±8°)
      if (powerInZone && Math.abs(shotAngle - idealAngle) <= (8 * Math.PI / 180)) {
        return { score: true, matchPct: 85 };
      }

      // POSSIBLE SCORE: Angle good but power slightly off (±tolerance+3)
      if (angleInRange && Math.abs(shotPower - idealPower) <= (greenZoneTolerance + 3)) {
        return { score: true, matchPct: 75 };
      }

      // RISKY: Both factors somewhat off
      if (Math.abs(shotPower - idealPower) <= (greenZoneTolerance + 8) &&
          Math.abs(shotAngle - idealAngle) <= (12 * Math.PI / 180)) {
        return { score: Math.random() < 0.4, matchPct: 40 };
      }

      // MISS: Way off in power or angle
      return { score: false, matchPct: 15 };
    }

    function findIdealSpeedForAngle(sx: number, sy: number, angle: number) {
      let bestSpd = 10, bestD = 1e9;
      for (let spd = 4; spd <= 16; spd += 0.12) {
        const pts = simTraj(sx, sy, angle, spd, 95);
        for (const pt of pts) {
          const d = Math.hypot(pt.x - HOOP_X, pt.y - HOOP_Y);
          if (d < bestD && pt.y < GY) { bestD = d; bestSpd = spd; }
        }
      }
      return bestSpd;
    }

    function stepBall(b: any) {
      if (b.state !== 'flying') return;
      const prevX = b.x, prevY = b.y;
      b.vy += G;
      b.x += b.vx;
      b.y += b.vy;
      b.rot += 0.14;
      if (b.x < 10) { b.x = 10; b.vx = Math.abs(b.vx) * 0.5; }
      if (b.x > W - 10) { b.x = W - 10; b.vx = -Math.abs(b.vx) * 0.5; }
      if (b.y < 10) { b.y = 10; b.vy = Math.abs(b.vy) * 0.4; }

      if (b.outcome === 'perfect_direct' || b.outcome === 'direct') {
        const toHX = HOOP_X - b.x, toHY = HOOP_Y - b.y;
        const dist = Math.hypot(toHX, toHY);
        if (dist > 0) {
          const strength = b.outcome === 'perfect_direct' ? 0.015 : 0.008;
          const onlyFalling = b.outcome === 'direct';
          if (!onlyFalling || (onlyFalling && b.vy > 0 && dist < 180)) {
            const pull = strength * (1 - Math.min(1, dist / 200));
            b.vx += toHX / dist * pull * dist;
            b.vy += toHY / dist * pull * dist;
          }
        }
      }

      if (!b.boardHandled) {
        const crossedFace = (prevX > BOARD_FACE && b.x <= BOARD_FACE) || (prevX >= BOARD_FACE && b.x < BOARD_FACE);
        const nearFace = b.x <= BOARD_FACE + 12 && b.x >= BOARD_X - 4 && b.vx < 0;
        if ((crossedFace || nearFace) && b.vx < 0) {
          const hitY = prevY + (b.y - prevY) * Math.max(0, Math.min(1, (prevX - BOARD_FACE) / Math.max(0.001, prevX - b.x)));
          if (hitY >= BOARD_TOP - 8 && hitY <= BOARD_BOT + 8) {
            b.boardHandled = true;
            b.x = BOARD_FACE + 2;
            const hitRatio = Math.max(0, Math.min(1, (hitY - BOARD_TOP) / (BOARD_BOT - BOARD_TOP)));
            const impactSpd = Math.hypot(b.vx, b.vy);
            const goIn = Math.random() < 0.50;
            if (goIn) {
              addFlash('💥 ВІДБІЙ!', BOARD_X + 50*scaleX, BOARD_TOP - 32*scaleY, '#ff9900');
              const toHX = HOOP_X - b.x, toHY = HOOP_Y - hitY;
              const toHLen = Math.hypot(toHX, toHY);
              const normHX = toHX / toHLen, normHY = toHY / toHLen;
              const reflectVx = Math.abs(b.vx) * 0.65, reflectVy = b.vy * 0.80;
              const blendToHoop = 0.80 - hitRatio * 0.40;
              const physBlend = 1 - blendToHoop;
              const finalSpd = impactSpd * 0.68;
              b.vx = (normHX * blendToHoop + (reflectVx / impactSpd) * physBlend) * finalSpd + (Math.random() - 0.5) * 0.3;
              b.vy = (normHY * blendToHoop + (reflectVy / impactSpd) * physBlend) * finalSpd + (Math.random() - 0.5) * 0.2;
              b.outcome = 'direct';
            } else {
              addFlash('🔶 ВІДБІЙ→МИМО', BOARD_X + 50*scaleX, BOARD_TOP - 32*scaleY, '#ff6600');
              b.vx = Math.abs(b.vx) * 0.60 * (0.9 + Math.random() * 0.2);
              b.vy = b.vy * 0.50 + Math.random() * 0.5;
              b.outcome = 'miss_fly';
            }
          }
        }
      }

      if (!b.rimHandled && (b.outcome === 'rim_in' || b.outcome === 'rim_out')) {
        const dLeft = Math.hypot(b.x - (HOOP_X - HOOP_R), b.y - HOOP_Y);
        const dRight = Math.hypot(b.x - (HOOP_X + HOOP_R), b.y - HOOP_Y);
        const dPrevLeft = Math.hypot(prevX - (HOOP_X - HOOP_R), prevY - HOOP_Y);
        const dPrevRight = Math.hypot(prevX - (HOOP_X + HOOP_R), prevY - HOOP_Y);
        const hitRim = (dLeft < 14 || dRight < 14 || dPrevLeft < 14 || dPrevRight < 14) && b.vy > -2;
        if (hitRim) {
          b.rimHandled = true;
          if (b.outcome === 'rim_in') {
            addFlash('🔥 РИМ-ШОТ!', HOOP_X, HOOP_Y - 52*scaleY, '#ff44ff');
            b.vx *= 0.12;
            b.vy = Math.abs(b.vy) * 0.18;
            b.outcome = 'direct';
          } else {
            addFlash('💢 В ОБІД!', HOOP_X, HOOP_Y - 52*scaleY, '#ff8800');
            b.vx *= -0.55;
            b.vy = -Math.abs(b.vy) * 0.65;
            b.outcome = 'miss_fly';
          }
        }
      }

      // Enhanced ball-in-hoop collision detection
      const inHoop = checkBallInHoop({ x: b.x, y: b.y }, HOOP_X, HOOP_Y, HOOP_RADIUS);
      if (inHoop && !b.scoredGoal && b.vy > 0) {
        b.scoredGoal = true;
        b.state = 'scored';
        b.vx = 0;
        b.vy = 0;
        b.x = HOOP_X;
        b.y = HOOP_Y + 26*scaleY;
        addFlash('🎯 ГОЛ!', HOOP_X, HOOP_Y - 52*scaleY, '#44ff88');
        return;
      }

      // Fallback: traditional hoop distance check for direct/perfect outcomes
      const d = Math.hypot(b.x - HOOP_X, b.y - HOOP_Y);
      if (d < 32 && (b.outcome === 'direct' || b.outcome === 'perfect_direct') && b.vy > 0 && !b.scoredGoal) {
        b.scoredGoal = true;
        b.state = 'scored';
        b.vx = 0;
        b.vy = 0;
        b.x = HOOP_X;
        b.y = HOOP_Y + 26*scaleY;
        return;
      }

      if (b.y >= GY) {
        b.y = GY;
        b.state = 'missed';
        b.vx = 0;
        b.vy = 0;
      }
    }

    function launchBall(idx: number) {
      console.log(`[LAUNCH] Player ${idx} launching ball with power ${gs.shootStates[idx].power.toFixed(0)}%`);
      const p = gs.players[idx];
      const ss = gs.shootStates[idx];
      const px = p.x - 15*scaleX;
      const py = p.y - 55*scaleY;
      const angle = ss.aimAngle;

      // Calculate distance-based physics with 200% power scale
      const distToHoop = Math.hypot(HOOP_X - px, HOOP_Y - py);
      const maxDist = Math.hypot(W, H);
      const distFraction = distToHoop / maxDist;

      // Use NEW dynamic distance-based ideal power calculation
      const idealPwrPct = calculateIdealPowerByDistance(px, py);
      const greenZoneTolerance = Math.round(calculateGreenZoneTolerance(distFraction) * 2);
      const inGreenZone = Math.abs(ss.power - idealPwrPct) <= greenZoneTolerance;

      // Store for power bar visualization
      ss.distFraction = distFraction;
      ss.idealPowerForDistance = idealPwrPct;

      // Check angle acceptability (±3 degrees)
      const angleRange = getIdealAngleForDistance(distToHoop);
      const angleError = Math.abs(angle - angleRange.ideal);
      const angleAcceptable = angleError <= (3 * Math.PI / 180);

      // CRITICAL FIX: Convert power % directly to pixels-per-frame velocity
      // Power meter 0-200% → ball velocity 5-16 m/s → pixels per frame
      // Scaling: ~140 pixels = 1 meter of court distance (4.0x for accuracy multiplier compensation)
      const speedInMS = calculateBallSpeedFromPower(ss.power);
      const pixelsPerMeter = 35 * 4.0; // 140px/meter — КРОК 2: збільшено для компенсації accuracy
      const framesPerSecond = 60; // Game loop runs at 60fps

      // CRITICAL: Normalize velocity to frame rate
      // speedPixelsPerSecond = speedInMS * pixelsPerMeter
      // speedPixelsPerFrame = speedPixelsPerSecond / framesPerSecond
      let curSpd = (speedInMS * pixelsPerMeter) / framesPerSecond;

      // КРОК 3: Перевірити accuracy multiplier та додати логування
      console.log(
        `[LAUNCH] speedInMS=${speedInMS.toFixed(2)}, pixelsPerMeter=${pixelsPerMeter.toFixed(0)}, ` +
        `baseSpd=${curSpd.toFixed(1)}px/frame`
      );

      // КРОК 5: Застосовуємо accuracy multiplier з PowerMeter
      if (ss.powerMeterResult) {
        const accuracy = ss.powerMeterResult.accuracy;
        const accuracyMultiplier = accuracy / 100;
        curSpd = curSpd * accuracyMultiplier;
        console.log(
          `[SHOT] accuracy=${accuracy}%, multiplier=${accuracyMultiplier.toFixed(2)}, ` +
          `curSpd=${curSpd.toFixed(1)}px/frame (was ${(curSpd / accuracyMultiplier).toFixed(1)})`
        );
      }

      // GREEN ZONE GUARANTEE: Power in zone AND angle acceptable = 100% score
      let guaranteedScore = false;
      if (inGreenZone && angleAcceptable) {
        const idealSpeedMS = calculateBallSpeedFromPower(idealPwrPct);
        curSpd = idealSpeedMS * pixelsPerMeter;
        guaranteedScore = true;
        addFlash('✅ ГАРАНТОВАНИЙ ГОЛ!', p.x, p.y - 115*scaleY, '#44ff88');
      } else if (inGreenZone) {
        addFlash('⚡ ДОБРИЙ БРОСОК!', p.x, p.y - 115*scaleY, '#ffff44');
      }

      const pts = simTraj(px, py, angle, curSpd, 95);

      let nearBoard = false;
      for (const pt of pts) {
        if (pt.x >= BOARD_X - 30 && pt.x <= BOARD_FACE + 30 && pt.y >= BOARD_TOP - 15 && pt.y <= BOARD_BOT + 15) {
          nearBoard = true;
          break;
        }
      }

      let rimHit = false;
      for (const pt of pts) {
        const dRim = Math.hypot(pt.x - (HOOP_X + HOOP_R), pt.y - HOOP_Y);
        const dRim2 = Math.hypot(pt.x - (HOOP_X - HOOP_R), pt.y - HOOP_Y);
        if (dRim < 9 || dRim2 < 9) { rimHit = true; break; }
      }

      let outcome = 'miss';

      // Scoring logic
      if (guaranteedScore) {
        outcome = 'direct';
      } else if (inGreenZone) {
        outcome = Math.random() < 0.85 ? 'direct' : (nearBoard ? 'board_out' : 'miss');
      } else {
        if (nearBoard) {
          outcome = Math.random() < 0.50 ? 'board_in' : 'board_out';
        } else if (rimHit) {
          outcome = Math.random() < 0.35 ? 'rim_in' : 'rim_out';
        } else {
          outcome = 'miss';
        }
      }

      ss.ball = {
        x: px, y: py,
        vx: Math.cos(angle) * curSpd, vy: Math.sin(angle) * curSpd,
        rot: 0, state: 'flying', outcome,
        boardHandled: false, rimHandled: false, owner: idx,
        guaranteedScore: guaranteedScore,
        scoredGoal: false
      };
      ss.phase = 'flying';
      ss.lockedAngle = null;
      ss.idealTraj = null;
      p.status = 'shooting';
      if (idx === gs.disputeP1 && gs.disputeP2 === -1 && gs.players.length > 1) gs.disputeP2 = 1;
    }

    function update() {
      if (gs.state !== 'playing') return;
      for (let i = 0; i < gs.players.length; i++) {
        const p = gs.players[i], ss = gs.shootStates[i];
        if (p.status === 'eliminated') continue;
        if (ss.phase === 'aiming') {
          const sx = p.x - 15*scaleX;
          const behindBoard = sx < BOARD_FACE;
          ss.aimAngle += 0.022 * ss.aimDir;
          if (behindBoard) {
            if (ss.aimAngle >= -0.06) { ss.aimAngle = -0.06; ss.aimDir = -1; }
            if (ss.aimAngle <= -Math.PI * 0.5) { ss.aimAngle = -Math.PI * 0.5; ss.aimDir = 1; }
          } else {
            if (ss.aimAngle >= -Math.PI * 0.5) { ss.aimAngle = -Math.PI * 0.5; ss.aimDir = -1; }
            if (ss.aimAngle <= -Math.PI * 0.94) { ss.aimAngle = -Math.PI * 0.94; ss.aimDir = 1; }
          }
        }
        if (ss.phase === 'charging') {
          ss.power += 2.6 * ss.powerDir; // Doubled rate for 200% range
          if (ss.power >= 200) { ss.power = 200; ss.powerDir = -1; }
          if (ss.power <= 0) { ss.power = 0; ss.powerDir = 1; }
        }
        if (ss.phase === 'flying' && ss.ball) {
          stepBall(ss.ball);
          if (ss.ball.state === 'scored') handleScored(i);
          else if (ss.ball.state === 'missed') handleMissed(i);
        }
        if (ss.phase === 'auto_run' || ss.phase === 'manual_run') {
          p.rf++;
          const t = ss.runTarget;
          if (!t) { ss.phase = ss.phase === 'auto_run' ? 'pickup_wait' : null; p.status = 'idle'; continue; }
          const dx = t.x - p.x;
          if (Math.abs(dx) > 4) { p.x += Math.sign(dx) * 3.5; }
          else {
            if (ss.phase === 'auto_run') { ss.phase = 'pickup_wait'; ss.ball = null; }
            else ss.phase = null;
            p.status = 'idle';
          }
        }
      }
      if (gs.netShake && Date.now() > gs.netShakeEnd) gs.netShake = false;
      if (gs.netShake) gs.netShakeT += 0.4;
      gs.flashes = gs.flashes.filter((f: any) => {
        f.dy -= 0.5;
        f.alpha -= 0.011;
        return f.alpha > 0;
      });
    }

    function handleScored(idx: number) {
      const p = gs.players[idx];
      p.score++;
      gs.shootStates[idx].inDanger = false;
      addFlash('✅ ПОПАВ! +1', HOOP_X + 55*scaleX, HOOP_Y - 45*scaleY, '#44cc44');
      gs.netShake = true;
      gs.netShakeEnd = Date.now() + 700;
      const ss = gs.shootStates[idx];
      ss.phase = null;
      ss.ball = null;
      ss.lockedAngle = null;
      ss.idealTraj = null;

      // DEBUG: Log scoring event
      console.log(`[SCORE] Player ${idx} (${p.name}) scored! Total: ${p.score}`);

      if (idx === gs.disputeP2 && gs.disputeP1 >= 0 && gs.disputeP1 < gs.players.length) {
        const p1ph = gs.shootStates[gs.disputeP1]?.phase;
        const dangerPhases = ['auto_run', 'pickup_wait', 'flying', 'aiming', 'charging'];
        if (dangerPhases.includes(p1ph) || gs.shootStates[gs.disputeP1]?.inDanger) {
          addFlash('💀 ВИБИТО!', gs.players[gs.disputeP1]?.x || 300, GY - 130*scaleY, '#ff4444');
          if (gs.players[gs.disputeP1]) gs.players[gs.disputeP1].status = 'eliminated';
          if (gs.players[idx]) gs.players[idx].kills = (gs.players[idx].kills || 0) + 1;
          setTimeout(() => {
            const idx2 = gs.disputeP1;
            if (idx2 < gs.players.length) { gs.players.splice(idx2, 1); gs.shootStates.splice(idx2, 1); }
            gs.disputeP1 = 0;
            gs.disputeP2 = -1;
            if (gs.players.length <= 1) { gs.state = 'finished'; return; }
          }, 900);
          return;
        }
      }

      if (idx === 0) {
        const w = gs.players.shift(), sw = gs.shootStates.shift();
        if (w && sw) {
          const tailX = P_START + gs.players.length * P_STEP;
          w.status = 'running';
          sw.phase = 'manual_run';
          sw.runTarget = { x: tailX, y: GY };
          sw.inDanger = false;
          gs.players.push(w);
          gs.shootStates.push(sw);
          gs.disputeP1 = 0;
          gs.disputeP2 = -1;
          gs.players.forEach((p2: any, i: number) => { p2.x = P_START + i * P_STEP; });
        }
      }
      // Only end game if only 1 player left alive (all others eliminated)
      const aliveCount = gs.players.filter((p: any) => p.status !== 'eliminated').length;
      console.log(`[GAME] Total players: ${gs.players.length}, Alive: ${aliveCount}, State: ${gs.state}`);
      if (aliveCount <= 1) {
        console.log(`[GAME-OVER] Game finished! Winner: ${gs.players[0]?.name}`);
        gs.state = 'finished';
      }
    }

    function handleMissed(idx: number) {
      const ss = gs.shootStates[idx];
      const p = gs.players[idx];
      ss.inDanger = true;
      addFlash('❌ МИМО!', p.x, p.y - 100*scaleY, '#e05545');
      const bx = ss.ball ? ss.ball.x : p.x;
      ss.runTarget = { x: Math.max(50*scaleX, Math.min(W - 30*scaleX, bx)), y: GY };
      ss.phase = 'auto_run';
      p.status = 'running';
    }

    function drawBball(cx: number, cy: number, r: number) {
      ctx.fillStyle = '#e06030';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a2008';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.stroke();
    }

    function drawStick(x: number, y: number, pose: string, rf: number, danger: boolean, playerColor: string) {
      ctx.save();
      let sc = playerColor || '#e05545';
      if (danger) {
        const t = (Date.now() / 300) % 1;
        const r = Math.floor(220 + 35 * Math.sin(t * Math.PI * 2));
        sc = `rgb(${r},40,40)`;
      }
      ctx.strokeStyle = sc;
      ctx.fillStyle = sc;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (pose === 'run') {
        const leg = Math.sin(rf * 0.65) * 17, lean = -5;
        ctx.beginPath();
        ctx.arc(x + lean, y - 54*scaleY, 10*scaleX, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + lean, y - 43*scaleY);
        ctx.lineTo(x + lean - 2*scaleX, y - 18*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean, y - 35*scaleY);
        ctx.lineTo(x + lean - 18*scaleX, y - 25*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean, y - 35*scaleY);
        ctx.lineTo(x + lean + 15*scaleX, y - 25*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean - 2*scaleX, y - 18*scaleY);
        ctx.lineTo(x + lean - 2*scaleX + leg, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + lean - 2*scaleX, y - 18*scaleY);
        ctx.lineTo(x + lean - 2*scaleX - leg, y);
        ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.1;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(x + lean + 17*scaleX + k * 4*scaleX, y - 38*scaleY + k * 7*scaleY);
          ctx.lineTo(x + lean + 28*scaleX + k * 4*scaleX, y - 38*scaleY + k * 7*scaleY);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (pose === 'shoot') {
        ctx.beginPath();
        ctx.arc(x, y - 54*scaleY, 10*scaleX, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - 43*scaleY);
        ctx.lineTo(x, y - 18*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 35*scaleY);
        ctx.lineTo(x - 25*scaleX, y - 43*scaleY);
        ctx.stroke();
        drawBball(x - 33*scaleX, y - 46*scaleY, 9*scaleX);
        ctx.strokeStyle = sc;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 35*scaleY);
        ctx.lineTo(x + 13*scaleX, y - 25*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x - 11*scaleX, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x + 11*scaleX, y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y - 54*scaleY, 10*scaleX, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - 43*scaleY);
        ctx.lineTo(x, y - 18*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 37*scaleY);
        ctx.lineTo(x + 17*scaleX, y - 22*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 37*scaleY);
        ctx.lineTo(x - 12*scaleX, y - 26*scaleY);
        ctx.stroke();
        drawBball(x + 24*scaleX, y - 12*scaleY, 10*scaleX);
        ctx.strokeStyle = sc;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x - 10*scaleX, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x + 10*scaleX, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawTrajPts(pts: any[], color: string, dash?: number[], lw?: number) {
      if (!pts || pts.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw || 1.5;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const pt of pts) ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawAimArrow(px: number, py: number, angle: number) {
      const hx = px, hy = py - 52*scaleY;
      const ex = hx + Math.cos(angle) * 88*scaleX, ey = hy + Math.sin(angle) * 88*scaleY;
      ctx.strokeStyle = '#ffdd00';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - Math.cos(angle - 0.4) * 11*scaleX, ey - Math.sin(angle - 0.4) * 11*scaleY);
      ctx.lineTo(ex - Math.cos(angle + 0.4) * 11*scaleX, ey - Math.sin(angle + 0.4) * 11*scaleY);
      ctx.closePath();
      ctx.fill();
    }

    function drawPowerBar(p: any, pwr: number, matchPct: number, ss: any) {
      const bw = 22*scaleX, bh = 115*scaleY, bx = p.x + 16*scaleX, by = p.y - bh - 32*scaleY;
      const px = p.x - 15*scaleX, py = p.y - 55*scaleY;
      const distToHoop = Math.hypot(HOOP_X - px, HOOP_Y - py);

      // Get dynamic ideal power and tolerance based on distance
      const maxDist = Math.hypot(W, H);
      const distFraction = distToHoop / maxDist;
      const idealPower = calculateIdealPowerByDistance(px, py);
      const tolerance = calculateGreenZoneTolerance(distFraction);

      // Use new dynamic power meter drawer
      drawDynamicPowerMeter(ctx, bx, by, bw, bh, pwr, idealPower, tolerance);

      // Power percentage label
      const clr = matchPct > 92 ? '#00ffaa' : matchPct > 85 ? '#44cc44' : matchPct > 55 ? '#ffcc00' : '#e05545';
      ctx.fillStyle = clr;
      ctx.font = `bold ${11*scaleX}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(pwr) + '%', bx + bw / 2, by - 7*scaleY);

      // Distance indicator
      ctx.fillStyle = 'rgba(150,200,255,0.8)';
      ctx.font = `${8*scaleX}px sans-serif`;
      ctx.textAlign = 'center';
      const distPercent = Math.round(distFraction * 100);
      ctx.fillText(`${distPercent}% dist`, bx + bw / 2, by + bh + 12*scaleY);
    }

    function drawBasket() {
      const sh = gs.netShake ? Math.sin(gs.netShakeT) * 2.5 : 0;
      ctx.save();
      ctx.strokeStyle = '#e05545';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5*scaleX;
      ctx.beginPath();
      ctx.moveTo(POLE_X, GY);
      ctx.lineTo(POLE_X, 209*scaleY);
      ctx.stroke();
      ctx.lineWidth = 3*scaleX;
      ctx.beginPath();
      ctx.moveTo(POLE_X, 209*scaleY);
      ctx.lineTo(ARM_X, 209*scaleY);
      ctx.stroke();
      ctx.lineWidth = 3*scaleX;
      ctx.strokeRect(BOARD_X, BOARD_TOP, BOARD_W, BOARD_BOT - BOARD_TOP);
      ctx.lineWidth = 1.5*scaleX;
      ctx.strokeRect(BOARD_X + 1*scaleX, 227*scaleY, BOARD_W - 2*scaleX, 30*scaleY);
      ctx.lineWidth = 1.8*scaleX;
      ctx.beginPath();
      ctx.moveTo(BOARD_FACE, 262*scaleY);
      ctx.lineTo(HOOP_X - HOOP_R + 3*scaleX, HOOP_Y + sh * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(BOARD_FACE, 276*scaleY);
      ctx.lineTo(HOOP_X - HOOP_R + 3*scaleX, HOOP_Y + sh * 0.3);
      ctx.stroke();
      ctx.lineWidth = 3*scaleX;
      ctx.beginPath();
      ctx.ellipse(HOOP_X + sh * 0.3, HOOP_Y + sh * 0.15, HOOP_R, 8*scaleY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1*scaleX;
      ctx.globalAlpha = 0.65;
      for (let i = 0; i < 7; i++) {
        const tx = HOOP_X - HOOP_R + 3*scaleX + i * (HOOP_R * 2 - 6*scaleX) / 6;
        const bx2 = HOOP_X - 11*scaleX + i * 22*scaleX / 6;
        ctx.beginPath();
        ctx.moveTo(tx + sh * 0.08 * (i - 3), HOOP_Y + 8*scaleY);
        ctx.lineTo(bx2 + sh * 0.12 * (i - 3), HOOP_Y + 46*scaleY + sh);
        ctx.stroke();
      }
      for (let j = 0; j < 3; j++) {
        const t = (j + 1) / 4;
        const yw = HOOP_Y + 8*scaleY + t * 38*scaleY + sh * 0.08;
        const hw = HOOP_R * (1 - t * 0.4) - 2*scaleX;
        ctx.beginPath();
        ctx.moveTo(HOOP_X - hw, yw);
        ctx.lineTo(HOOP_X + hw, yw);
        ctx.stroke();
      }
      if (gs.netShake) {
        const a = Math.max(0, (gs.netShakeEnd - Date.now()) / 700);
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = '#44cc44';
        ctx.beginPath();
        ctx.ellipse(HOOP_X, HOOP_Y, HOOP_R + 14*scaleX, 11*scaleY, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, GY);
      ctx.lineTo(W, GY);
      ctx.stroke();
      ctx.globalAlpha = 1;
      drawBasket();

      for (let i = 0; i < gs.players.length; i++) {
        const p = gs.players[i], ss = gs.shootStates[i];
        if (p.status === 'eliminated') continue;
        const sx = p.x - 15*scaleX, sy = p.y - 55*scaleY;
        const danger = ss.inDanger || false;

        if (danger && (ss.phase !== 'flying')) {
          const al = 0.3 + 0.4 * Math.sin(Date.now() / 200);
          ctx.strokeStyle = `rgba(255,50,50,${al})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 37*scaleY, 48*scaleX, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (i === gs.selectedMoveIdx) {
          const al = 0.5 + 0.4 * Math.sin(Date.now() / 250);
          ctx.strokeStyle = `rgba(255,220,50,${al})`;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.arc(p.x, p.y - 37*scaleY, 46*scaleX, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = `rgba(255,220,50,${al * 0.85})`;
          ctx.font = `bold ${10*scaleX}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('ПКМ на підлогу → бігти', p.x, p.y - 92*scaleY);
        }

        if (ss.phase === 'aiming') {
          const pts = simTraj(sx, sy, ss.aimAngle, 10, 95);
          drawTrajPts(pts, 'rgba(220,80,60,0.45)', [5, 5]);
          drawAimArrow(p.x, p.y, ss.aimAngle);
        }

        if (ss.phase === 'charging') {
          if (ss.idealTraj) drawTrajPts(ss.idealTraj, 'rgba(255,230,0,0.75)', [6, 5], 1.9);
          const curSpd = 5 + (ss.power / 100) * 11;
          const pts = simTraj(sx, sy, ss.aimAngle, curSpd, 95);
          const idealEnd = ss.idealTraj ? ss.idealTraj[ss.idealTraj.length - 1] : { x: HOOP_X, y: HOOP_Y };
          const curEnd = pts[pts.length - 1];
          const endDiff = Math.hypot(curEnd.x - idealEnd.x, curEnd.y - idealEnd.y);
          const spdDiff = Math.abs(curSpd - ss.idealSpeed);
          const matchPct = Math.max(0, Math.min(100, 100 - spdDiff * 13 - endDiff * 0.3));
          let tColor;
          if (matchPct > 92) tColor = 'rgba(0,255,170,0.9)';
          else if (matchPct > 85) tColor = 'rgba(60,220,80,0.8)';
          else if (matchPct > 55) tColor = 'rgba(255,210,0,0.7)';
          else tColor = 'rgba(220,80,60,0.6)';
          drawTrajPts(pts, tColor, [4, 4], 2.2);
          const distToHoop = Math.hypot(HOOP_X - sx, HOOP_Y - sy);
          const maxDist = Math.hypot(W, H);
          ss_ideal_power = 50 + (distToHoop / maxDist) * 50;
          drawPowerBar(p, ss.power, matchPct, ss);
          if (matchPct > 92) {
            const pulse = 0.4 + 0.5 * Math.sin(Date.now() / 120);
            ctx.strokeStyle = `rgba(0,255,170,${pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(HOOP_X, HOOP_Y, HOOP_R + 8*scaleX, 11*scaleY, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = `rgba(0,255,170,${pulse * 0.35})`;
            ctx.beginPath();
            ctx.ellipse(HOOP_X, HOOP_Y, HOOP_R + 8*scaleX, 11*scaleY, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (ss.ball && ss.phase === 'flying') {
          ctx.save();
          ctx.translate(ss.ball.x, ss.ball.y);
          ctx.rotate(ss.ball.rot);
          drawBball(0, 0, 11*scaleX);
          ctx.restore();
        }
        if (ss.ball && ss.phase === 'auto_run') {
          ctx.save();
          ctx.translate(ss.ball.x, ss.ball.y);
          ctx.rotate(ss.ball.rot || 0);
          drawBball(0, 0, 11*scaleX);
          ctx.restore();
        }

        if (ss.phase === 'pickup_wait') {
          const al = 0.4 + 0.5 * Math.sin(Date.now() / 180);
          ctx.strokeStyle = `rgba(255,220,0,${al})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 37*scaleY, 42*scaleX, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(255,220,0,${al})`;
          ctx.font = `bold ${10*scaleX}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('← КЛІКНИ → кидок', p.x, p.y - 90*scaleY);
        }

        let pose = 'idle';
        if (p.status === 'running') pose = 'run';
        else if (p.status === 'shooting') pose = 'shoot';
        drawStick(p.x, p.y, pose, p.rf, danger, p.color);

        const kills = p.kills || 0;
        const isMine = i === 0;
        if (kills > 0) {
          ctx.fillStyle = '#ff6644';
          ctx.font = `bold ${11*scaleX}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('💀×' + kills, p.x, p.y - 84*scaleY);
        }
        const namePrefix = danger ? '🎯 ' : (isMine ? '👤 ' : '🔒 ');
        ctx.fillStyle = danger ? 'rgba(255,110,110,0.95)' : isMine ? p.color : 'rgba(180,180,180,0.6)';
        ctx.font = (danger ? 'bold ' : isMine ? 'bold ' : '') + `${11*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(namePrefix + (danger ? p.name : p.name), p.x, p.y - 73*scaleY);
        ctx.fillStyle = danger ? '#ff5555' : '#ffdd00';
        ctx.font = `bold ${11*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🏀 ' + p.score, p.x, p.y - 61*scaleY);

        if (i === gs.disputeP2 && ss.phase === null && gs.state === 'playing' && gs.players.length > 1) {
          const al = 0.7 + 0.3 * Math.sin(Date.now() / 200);
          ctx.fillStyle = `rgba(255,200,0,${al})`;
          ctx.font = `bold ${10*scaleX}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('▶ ВИБИЙ!', p.x, p.y - 90*scaleY);
        }
      }

      // Draw remote players from Socket.IO
      remotePlayersRef.current.forEach((rp: any) => {
        const rpx = rp.x;
        const rpy = rp.y;
        const rpColor = '#80cbc4'; // Cyan for remote players

        // Draw simple circle for remote player (idle pose)
        ctx.fillStyle = rpColor;
        ctx.beginPath();
        ctx.arc(rpx, rpy - 54*scaleY, 10*scaleX, 0, Math.PI * 2);
        ctx.fill();

        // Draw body
        ctx.strokeStyle = rpColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(rpx, rpy - 43*scaleY);
        ctx.lineTo(rpx, rpy - 18*scaleY);
        ctx.stroke();

        // Draw arms
        ctx.beginPath();
        ctx.moveTo(rpx, rpy - 35*scaleY);
        ctx.lineTo(rpx - 12*scaleX, rpy - 28*scaleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rpx, rpy - 35*scaleY);
        ctx.lineTo(rpx + 12*scaleX, rpy - 28*scaleY);
        ctx.stroke();

        // Draw legs
        ctx.beginPath();
        ctx.moveTo(rpx, rpy - 18*scaleY);
        ctx.lineTo(rpx - 8*scaleX, rpy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rpx, rpy - 18*scaleY);
        ctx.lineTo(rpx + 8*scaleX, rpy);
        ctx.stroke();

        // Draw name label
        ctx.fillStyle = rpColor;
        ctx.font = `bold ${11*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🌐 ' + (rp.name || `Remote ${rp.playerIndex}`), rpx, rpy - 73*scaleY);

        // Draw status
        ctx.fillStyle = '#80cbc4';
        ctx.font = `${10*scaleX}px sans-serif`;
        ctx.fillText(rp.status === 'alive' ? '✓ alive' : '✗ eliminated', rpx, rpy - 60*scaleY);
      });

      gs.flashes.forEach((f: any) => {
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = f.color;
        ctx.font = `bold ${17*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y + f.dy);
      });
      ctx.globalAlpha = 1;

      if (gs.state === 'playing' || gs.state === 'waiting') {
        const listX = 4, listY = 8, rowH = 19, padX = 6, padY = 4;
        const roster = gs.players;
        if (roster.length > 0) {
          const panelW = 110*scaleX, panelH = rowH * roster.length + padY * 2 + 14;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(listX, listY, panelW, panelH);
          ctx.strokeStyle = 'rgba(255,255,255,0.07)';
          ctx.lineWidth = 1;
          ctx.strokeRect(listX, listY, panelW, panelH);

          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.font = `bold ${8*scaleX}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText('УЧАСНИКИ', listX + padX, listY + padY + 7);

          roster.forEach((p2: any, i2: number) => {
            const ry = listY + padY + 15 + i2 * rowH;
            const ss2 = gs.state === 'playing' ? gs.shootStates[i2] : null;
            const danger2 = ss2?.inDanger || false;
            const eliminated2 = p2.status === 'eliminated';
            const isMine2 = i2 === 0;
            const blink = danger2 ? (Math.sin(Date.now() / 180) > 0) : true;

            if (eliminated2) {
              ctx.fillStyle = 'rgba(120,120,120,0.2)';
              ctx.fillRect(listX + 3, ry - 11, panelW - 6, rowH - 2);
              ctx.fillStyle = 'rgba(150,150,150,0.4)';
              ctx.font = `${10*scaleX}px sans-serif`;
              ctx.textAlign = 'left';
              ctx.fillText('✖ ' + p2.name, listX + padX + 10, ry + 1);
              ctx.strokeStyle = 'rgba(180,60,60,0.45)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              const tw = ctx.measureText('✖ ' + p2.name).width;
              ctx.moveTo(listX + padX + 10, ry - 4);
              ctx.lineTo(listX + padX + 10 + tw, ry - 4);
              ctx.stroke();
            } else if (danger2 && blink) {
              ctx.fillStyle = 'rgba(200,30,30,0.4)';
              ctx.fillRect(listX + 3, ry - 11, panelW - 6, rowH - 2);
              ctx.fillStyle = 'rgba(255,80,80,0.95)';
              ctx.font = `bold ${10*scaleX}px sans-serif`;
              ctx.textAlign = 'left';
              ctx.fillText('🎯 ' + p2.name, listX + padX, ry + 1);
              ctx.fillStyle = 'rgba(255,150,150,0.8)';
              ctx.font = `${8*scaleX}px sans-serif`;
              ctx.textAlign = 'right';
              ctx.fillText('🏀' + p2.score, listX + panelW - padX, ry + 1);
            } else {
              if (isMine2) {
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(listX + 3, ry - 11, panelW - 6, rowH - 2);
              }
              ctx.fillStyle = p2.color || '#fff';
              ctx.beginPath();
              ctx.arc(listX + padX + 3, ry - 2, 3*scaleX, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = isMine2 ? (p2.color || '#fff') : 'rgba(220,220,220,0.65)';
              ctx.font = (isMine2 ? 'bold ' : '') + `${10*scaleX}px sans-serif`;
              ctx.textAlign = 'left';
              ctx.fillText(p2.name, listX + padX + 10, ry + 1);
              ctx.fillStyle = 'rgba(255,220,80,0.7)';
              ctx.font = `${8*scaleX}px sans-serif`;
              ctx.textAlign = 'right';
              ctx.fillText('🏀' + p2.score, listX + panelW - padX, ry + 1);
            }
          });
        }
      }

      ctx.textAlign = 'left';
      if (gs.state === 'playing') {
        const activeIdx = gs.selectedMoveIdx >= 0 ? gs.selectedMoveIdx : -1;
        const ph = activeIdx >= 0 ? gs.shootStates[activeIdx]?.phase : null;
        const hints: any = {
          null: 'ПКМ на гравця → активувати  |  ЛКМ на підлогу → бігти  |  ПКМ на пустому → скинути вибір',
          aiming: '[1] ЛКМ — зафіксуй кут  |  ПКМ на гравця → скасувати',
          charging: '[2] ЛКМ на гравця = кидок  |  ПКМ на гравця = ↺ переприціл',
          flying: 'М\'яч летить...',
          auto_run: 'Біжить за м\'ячем...',
          pickup_wait: 'Підібрав! ЛКМ щоб кидати знову',
          manual_run: 'Біжить...',
        };
        let hintText = hints[ph] ?? 'ПКМ на гравця → активувати  |  ЛКМ на підлогу → бігти  |  ЛКМ на гравця → кидок';
        if (activeIdx >= 0 && gs.players[activeIdx]) {
          hintText = '[' + gs.players[activeIdx].name + '] ' + (hints[ph] ?? '');
        }
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.font = `${13*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(hintText, W / 2, H - 11*scaleY);
        const alive = gs.players.filter((p: any) => p.status !== 'eliminated').length;
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.font = `${11*scaleX}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('Гравців: ' + alive + '/6', W - 8*scaleX, 17*scaleY);
      }

      if (gs.state === 'waiting') {
        // Canvas clean - no hint text
      }

      if (gs.state === 'finished') {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffdd00';
        ctx.font = `bold ${30*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🏆 ГРА ЗАВЕРШЕНА', W / 2, 165*scaleY);
        if (gs.players.length === 1) {
          ctx.fillStyle = '#44cc44';
          ctx.font = `bold ${22*scaleX}px sans-serif`;
          ctx.fillText('Переможець: ' + gs.players[0].name + ' 🥇', W / 2, 205*scaleY);
        }
        [...gs.players].sort((a: any, b: any) => b.score - a.score).forEach((p: any, k: number) => {
          ctx.fillStyle = k === 0 ? '#ffdd00' : 'rgba(255,255,255,0.8)';
          ctx.font = (k === 0 ? `bold ${17*scaleX}px` : `${14*scaleX}px`) + ' sans-serif';
          ctx.fillText((k === 0 ? '🥇' : (k === 1 ? '🥈' : '🥉')) + ' ' + p.name + ' — ' + p.score + ' очок', W / 2, 245*scaleY + k * 24*scaleY);
        });
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = `${13*scaleX}px sans-serif`;
        ctx.fillText('↺ Рестарт', W / 2, 410*scaleY);
      }
    }

    canvas.addEventListener("click", (e: MouseEvent) => {
      if (gs.state !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const sc = W / rect.width;
      const mx = (e.clientX - rect.left) * sc;
      const my = (e.clientY - rect.top) * sc;
      let hitIdx = -1;
      for (let i = 0; i < gs.players.length; i++) {
        if (gs.players[i].status === "eliminated") continue;
        if (hitTestPlayer(mx, my, gs.players[i].x, gs.players[i].y)) { hitIdx = i; break; }
      }
      if (hitIdx >= 0) {
        const p = gs.players[hitIdx], ss = gs.shootStates[hitIdx];
        if (ss.phase === null || ss.phase === "pickup_wait") {
          ss.phase = "aiming";
          const behindBoard = (p.x - 15*scaleX) < BOARD_FACE;
          ss.aimAngle = behindBoard ? -0.1 : -Math.PI*0.72;
          ss.aimDir = behindBoard ? -1 : 1;
          ss.lockedAngle = null;
          ss.idealTraj = null;
          p.status = "shooting";
          if (hitIdx === 0) gs.disputeP1 = 0;
        } else if (ss.phase === "aiming") {
          ss.lockedAngle = ss.aimAngle;
          const idealSpd = findIdealSpeedForAngle(p.x - 15*scaleX, p.y - 55*scaleY, ss.lockedAngle);
          ss.idealSpeed = idealSpd;
          const px = p.x - 15*scaleX;
          const py = p.y - 55*scaleY;
          const distToHoop = Math.hypot(HOOP_X - px, HOOP_Y - py);
          const maxDist = Math.hypot(W, H);
          ss_ideal_power = 50 + (distToHoop / maxDist) * 50;
          ss.idealTraj = simTraj(px, py, ss.lockedAngle, idealSpd, 95);
          ss.phase = "charging";
          ss.power = 0;
          ss.powerDir = 1;

          // КРОК 1: Додаємо PowerMeter при першому клику
          if (powerMeterRef.current) {
            const currentDist = distToHoop;
            const greenLine = powerMeterRef.current.calculateGreenLinePosition(currentDist);
            powerMeterRef.current.setGreenLinePosition(greenLine);
            setGreenLinePosition(greenLine);

            const meter = createMeterElement(greenLine);
            meterElementRef.current = meter;
            setMeterVisible(true);

            powerMeterRef.current.startMeterAnimation();

            console.log(
              `[FirstClick] currentDistance=${currentDist.toFixed(0)}px, greenLinePosition=${greenLine.toFixed(0)}px`
            );
          }
        } else if (ss.phase === "charging") {
          // КРОК 4: При другому клику обраховуємо accuracy
          if (powerMeterRef.current) {
            const meterHeight = powerMeterRef.current.getMeterCurrentHeight();
            const px = p.x - 15*scaleX;
            const py = p.y - 55*scaleY;
            const currentDist = Math.hypot(HOOP_X - px, HOOP_Y - py);

            const accuracy = powerMeterRef.current.calculateAccuracy(meterHeight, greenLinePosition);
            ss.powerMeterResult = { accuracy, meterHeight, greenLinePosition };

            showAccuracyFeedback(accuracy, p.x, p.y - 130*scaleY);

            powerMeterRef.current.stopMeterAnimation();
            if (meterElementRef.current) {
              hideMeter(meterElementRef.current);
            }
            setMeterVisible(false);

            console.log(
              `[SecondClick] accuracy=${accuracy}%, meterHeight=${meterHeight.toFixed(0)}px, greenLine=${greenLinePosition.toFixed(0)}px`
            );
          }
          launchBall(hitIdx);
        }
      } else {
        if (gs.selectedMoveIdx >= 0 && gs.selectedMoveIdx < gs.players.length) {
          const p = gs.players[gs.selectedMoveIdx], ss = gs.shootStates[gs.selectedMoveIdx];
          if (p.status !== "eliminated" && (ss.phase === null || ss.phase === "pickup_wait" || ss.phase === "manual_run")) {
            ss.runTarget = { x: Math.max(50*scaleX, Math.min(W - 30*scaleX, mx)), y: GY };
            ss.phase = "manual_run";
            p.status = "running";
          }
        }
      }
    });

    canvas.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      if (gs.state !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const sc = W / rect.width;
      const mx = (e.clientX - rect.left) * sc;
      const my = (e.clientY - rect.top) * sc;
      let hitIdx = -1;
      for (let i = 0; i < gs.players.length; i++) {
        if (gs.players[i].status === "eliminated") continue;
        if (hitTestPlayer(mx, my, gs.players[i].x, gs.players[i].y)) { hitIdx = i; break; }
      }
      if (hitIdx >= 0) {
        const p = gs.players[hitIdx], ss = gs.shootStates[hitIdx];
        if (ss.phase === "charging") {
          ss.phase = "aiming";
          ss.aimAngle = ss.lockedAngle || ss.aimAngle;
          ss.aimDir = 1;
          ss.lockedAngle = null;
          ss.idealTraj = null;
          addFlash("↺ переприціл", p.x, p.y - 105*scaleY, "rgba(255,210,80,0.95)");
        } else if (ss.phase === "aiming") {
          ss.phase = null;
          ss.lockedAngle = null;
          ss.idealTraj = null;
          ss.ball = null;
          p.status = "idle";
          gs.selectedMoveIdx = -1;
          addFlash("✖ скасовано", p.x, p.y - 95*scaleY, "rgba(200,200,200,0.9)");
        } else if (p.status !== "eliminated") {
          gs.selectedMoveIdx = hitIdx;
          addFlash("👆 вибрано", p.x, p.y - 95*scaleY, "rgba(255,220,80,0.95)");
        }
      } else {
        if (gs.selectedMoveIdx >= 0) addFlash("✖ вибір скасовано", mx, my - 20*scaleY, "rgba(200,200,200,0.85)");
        gs.selectedMoveIdx = -1;
      }
    });

    function renderLoop() {
      update();
      draw();

      // Emit player position every 100ms to server
      const now = Date.now();
      if (now - lastEmitTimeRef.current > 100) {
        emitPlayerPosition();
        lastEmitTimeRef.current = now;
      }

      rafRef.current = requestAnimationFrame(renderLoop);
    }
    renderLoop();

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, isVisible]);

  const gs = gsRef.current;

  const emitPlayerPosition = useCallback(() => {
    if (!socketRef.current?.connected || gs.players.length === 0) return;
    const myPlayer = gs.players[0];
    if (myPlayer) {
      socketRef.current.emit('player_move', {
        index: 0,
        x: myPlayer.x,
        y: myPlayer.y,
        status: myPlayer.status || 'idle',
        name: myPlayer.name,
      });
    }
  }, []);

  const handleAddPlayer = () => {
    if (gs.players.length >= MAX_PLAYERS) { alert("Максимум 6 гравців!"); return; }
    const name = pname.trim() || `Гр.${gs.players.length+1}`;
    const idx = gs.players.length;
    gs.players.push({ name, x: 680*(window.innerWidth/860)+idx*58*(window.innerWidth/860), y: 584*(window.innerHeight/624), score:0, kills:0, status:"idle", rf:0, color: PLAYER_COLORS[idx%6] });
    gs.shootStates.push({ phase:null,aimAngle:-Math.PI*0.72,aimDir:1,power:0,powerDir:1,ball:null,lockedAngle:null,idealTraj:null,idealSpeed:10,runTarget:null,inDanger:false });
    setPname("");
    forceUpdate(n => n+1);
  };

  const handleStart = () => {
    if (gs.players.length < 1) return;
    gs.state = "playing";
    gs.flashes = [];
    gs.players.forEach((p:any) => { p.score=0; p.kills=0; p.status="idle"; p.rf=0; });
    gs.shootStates = gs.players.map(() => ({ phase:null,aimAngle:-Math.PI*0.72,aimDir:1,power:0,powerDir:1,ball:null,lockedAngle:null,idealTraj:null,idealSpeed:10,runTarget:null,inDanger:false }));
    gs.disputeP1=0; gs.disputeP2=-1; gs.selectedMoveIdx=-1;
    forceUpdate(n => n+1);
  };

  const handleRestart = () => {
    gs.state="waiting"; gs.players=[]; gs.shootStates=[]; gs.flashes=[];
    gs.disputeP1=0; gs.disputeP2=-1; gs.selectedMoveIdx=-1;
    setPname(userName); forceUpdate(n => n+1);
  };

  const handleDeleteLast = () => {
    if (gs.state === "playing") { alert("❌ Не можна видалити гравця під час гри!"); return; }
    if (gs.players.length <= 1) { alert("❌ Потрібно щонайменше 1 гравець для видалення!"); return; }
    gs.players.pop();
    gs.shootStates.pop();
    forceUpdate(n => n+1);
  };

  const handleExit = () => {
    if (!confirm("Вихід з гри? Усі гравці будуть видалені!")) return;
    gs.state = "waiting";
    gs.players = [];
    gs.shootStates = [];
    gs.flashes = [];
    gs.disputeP1 = 0;
    gs.disputeP2 = -1;
    gs.selectedMoveIdx = -1;
    setPname(userName);
    forceUpdate(n => n+1);
  };

  if (!mounted || !isVisible) return null;

  const btnStyle = (bg: string, disabled = false): React.CSSProperties => ({
    padding:"6px 13px", borderRadius:6, border:"none", color:"#fff",
    fontSize:13, cursor: disabled?"not-allowed":"pointer", fontWeight:600,
    background: bg, opacity: disabled ? 0.4 : 1,
  });

  return createPortal(
    <>
      <canvas
        ref={canvasRef}
        style={{ position:"absolute", top:0, left:0,
          zIndex:9999, pointerEvents:"none", background:"transparent", cursor:"crosshair" }}
      />
      <div
        style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%",
          zIndex:10000, pointerEvents: gs.state==="playing" ? "auto" : "none", cursor:"crosshair" }}
        onMouseDown={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const sc = canvas.width / rect.width;
          const mx = (e.clientX - rect.left) * sc;
          const my = (e.clientY - rect.top) * sc;
          const evt = new MouseEvent(e.button === 2 ? "contextmenu" : "click", {
            bubbles: true,
            cancelable: true,
            clientX: e.clientX,
            clientY: e.clientY,
          });
          canvas.dispatchEvent(evt);
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div style={{ position:"fixed", bottom:8, left:"50%", transform:"translateX(-50%)",
        zIndex:10001, display:"flex", gap:7, alignItems:"center",
        background:"rgba(0,0,0,0.6)", padding:"6px 12px", borderRadius:8,
        boxShadow:"0 2px 12px rgba(0,0,0,0.5)" }}>
        <button onClick={handleDeleteLast} style={btnStyle("#ff6644", gs.state==="playing")}>🗑 Видалити</button>
        <button onClick={handleAddPlayer} style={btnStyle("#e06030", gs.players.length>=6)}>+ Додати</button>
        {gs.state === "playing" && <button onClick={handleExit} style={btnStyle("#ff2222")}>🚪 Вийти</button>}
        <button ref={btnStartRef} onClick={handleStart} style={btnStyle("#27ae60", gs.players.length<1)} disabled={gs.players.length<1}>▶ Старт</button>
        <button onClick={handleRestart} style={btnStyle("#444")}>↺ Рестарт</button>
        <button onClick={() => setShowModal(true)} style={btnStyle("#1a4a8a")}>📖 Інструкція</button>
      </div>
      {showModal && (
        <div onClick={e => e.target===e.currentTarget && setShowModal(false)}
          style={{ position:"fixed", top:0, left:0, right:0, bottom:0,
            background:"rgba(0,0,0,0.9)", zIndex:10002,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#161c2e", border:"1px solid #334", borderRadius:14,
            padding:"22px 26px", maxWidth:560, width:"96%", color:"#fff",
            maxHeight:"92vh", overflowY:"auto" }}>
            <h2 style={{color:"#ffdd00",fontSize:17,marginBottom:14,textAlign:"center"}}>🏀 РУЧЕЁК — Правила та Інструкція</h2>
            <p style={{marginBottom:12}}><b style={{color:"#e05545"}}>🎯 Мета:</b> Вибий усіх суперників! Останній гравець — переможець.</p>
            <p style={{marginBottom:12}}><b style={{color:"#e05545"}}>👥 Учасники:</b> Від 1 до 6. Введи ім'я → «+ Додати» → «▶ Старт».</p>
            <p style={{marginBottom:8}}><b style={{color:"#e05545"}}>🖱️ Кидок — 3 кліки:</b></p>
            <ul style={{paddingLeft:16,fontSize:13,lineHeight:1.8,marginBottom:12}}>
              <li><b>Клік 1 по гравцю</b> — стрілка крутиться, червона траєкторія</li>
              <li><b>Клік 2 по гравцю</b> — кут зафіксовано, жовта ідеальна траєкторія + шкала сили</li>
              <li><b>Клік 3 НЕ на гравця</b> — кидок! Зелена лінія = жовта (≥92%) → 🎯 100% влучення</li>
            </ul>
            <p style={{marginBottom:8}}><b style={{color:"#e05545"}}>🎮 Управління:</b></p>
            <ul style={{paddingLeft:16,fontSize:13,lineHeight:1.8,marginBottom:12}}>
              <li><b>ЛКМ на гравця</b> — кидок</li>
              <li><b>ПКМ на гравця</b> — вибрати для переміщення</li>
              <li><b>ЛКМ на підлогу</b> — вибраний гравець побіжить туди</li>
              <li><b>ПКМ на пустому</b> — скинути вибір</li>
            </ul>
            <div style={{textAlign:"center",marginTop:16}}>
              <button onClick={() => setShowModal(false)}
                style={{...btnStyle("#e05545"), padding:"8px 28px", fontSize:14}}>
                Зрозуміло! Грати ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
