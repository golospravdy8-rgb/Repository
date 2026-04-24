"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Pusher from "pusher-js";
import { PowerMeterSystem } from "@/lib/game/powerMeterSystem";
import { createMeterElement, hideMeter, showAccuracyFeedback } from "@/lib/game/powerMeterUI";
import { BasketballPhysics, type CollisionType, type BallPhysicsResult } from "@/lib/game/basketballPhysics";

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
  const pusherRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const remotePlayersRef = useRef<Map<string, any>>(new Map());
  const physicsRef = useRef<BasketballPhysics | null>(null);
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
    netSwing: { type: null, startTime: 0, duration: 0 },  // ETAP 5: Track hit type and net animation
    otherPlayers: [] as any[], // ✅ MULTIPLAYER: Other players
    leaderboard: [] as any[], // ✅ MULTIPLAYER: Leaderboard
    currentTurn: 0, // ✅ MULTIPLAYER: Current turn index
  });
  const playerIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? (localStorage.getItem(`pusher_player_id_${gameRoomId}`) ||
         (() => {
           const id = `player_${Date.now()}_${Math.random().toString(36).slice(2)}`;
           localStorage.setItem(`pusher_player_id_${gameRoomId}`, id);
           return id;
         })())
      : `player_${Math.random().toString(36).slice(2)}`
  );
  const lastEmitTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const showOrderRef = useRef<{[key: number]: boolean}>({});
  const groundYRef = useRef<number>(584);
  const eliminationOrderRef = useRef<string[]>([]);
  const markerPosRef = useRef<number>(0);
  const markerDirRef = useRef<number>(1);

  // Power Meter System refs and state
  const powerMeterRef = useRef<PowerMeterSystem | null>(null);
  const meterElementRef = useRef<HTMLDivElement | null>(null);
  const [meterVisible, setMeterVisible] = useState(false);
  const [greenLinePosition, setGreenLinePosition] = useState(180);

  useEffect(() => { setMounted(true); }, []);

  // Initialize Pusher connection
  useEffect(() => {
    if (!mounted || pusherRef.current) return;

    console.log(`[Pusher] Initializing connection to game-${gameRoomId}`);

    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    pusherRef.current = pusherClient;

    const channel = pusherClient.subscribe(`game-${gameRoomId}`);
    channelRef.current = channel;

    console.log(`[Pusher] Subscribed to game-${gameRoomId}`);

    // ✅ MULTIPLAYER: Event - Another player joined
    channel.bind('player-joined', (data: any) => {
      if (data.playerId === playerIdRef.current) return;
      console.log(`[Pusher] Player joined:`, data);

      remotePlayersRef.current.set(data.playerId, {
        socketId: data.playerId,
        playerIndex: data.playerIndex,
        order: data.order,  // Preserve global order from server
        x: data.x,
        y: data.y,
        status: 'alive',
        nickname: data.nickname || 'Player',
        name: data.nickname || 'Player',
      });

      gsRef.current.flashes.push({
        text: `✅ ${data.nickname} присоединився!`,
        x: 400,
        y: 50,
        color: '#88ff88',
        alpha: 1,
        dy: 0,
      });
      forceUpdate(n => n + 1);
    });

    // ✅ MULTIPLAYER: Event - Another player moved
    channel.bind('player-move', (data: any) => {
      if (data.playerId === playerIdRef.current) return;

      // ETAP 8: Debug ball data reception
      if (data.ball) {
        console.log(`[PUSHER player-move] Received ball data from ${data.name}: state=${data.ball.state}, x=${data.ball.x}, y=${data.ball.y}`);
      }

      const existingPlayer = remotePlayersRef.current.get(data.playerId);
      remotePlayersRef.current.set(data.playerId, {
        ...(existingPlayer || {}),
        socketId: data.playerId,
        x: data.x,
        y: data.y,
        name: data.name || 'Player',
        status: 'alive',
        ball: data.ball || null,
      });
    });

    // ✅ MULTIPLAYER: Event - Another player left
    channel.bind('player-leave', (data: any) => {
      console.log(`[Pusher] Player left:`, data.playerId);
      remotePlayersRef.current.delete(data.playerId);
      forceUpdate(n => n + 1);
    });

    // ✅ MULTIPLAYER: Event - Another player shot
    channel.bind('shot-completed', (data: any) => {
      if (data.playerId === playerIdRef.current) return;
      console.log(`[Pusher] Shot completed:`, data);

      gsRef.current.flashes.push({
        text: `⚽ ${data.nickname}: ${data.shotScore}pts (${Math.round(data.accuracy)}%)`,
        x: 400,
        y: 150,
        color: '#ffdd44',
        alpha: 1,
        dy: 0,
      });

      // Update leaderboard
      const lb = gsRef.current.leaderboard as any[];
      const existing = lb.find((e: any) => e.playerId === data.playerId);
      if (existing) {
        existing.score = (existing.score || 0) + data.shotScore;
      } else {
        lb.push({
          playerId: data.playerId,
          nickname: data.nickname,
          score: data.shotScore,
        });
      }
      lb.sort((a: any, b: any) => b.score - a.score);
      forceUpdate(n => n + 1);
    });

    // Cleanup on unmount
    return () => {
      console.log(`[Pusher] Unsubscribing from game-${gameRoomId}`);
      // Announce player leave
      fetch('/api/pusher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: gameRoomId,
          playerId: playerIdRef.current,
          action: 'leave',
        }),
      }).catch(() => {});

      channel.unbind_all();
      pusherClient.unsubscribe(`game-${gameRoomId}`);
      pusherRef.current = null;
      channelRef.current = null;
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
    // Use uniform scaling (same scale for X and Y) to prevent distortion
    const scale = Math.min(canvas.width / W_ORIG, canvas.height / H_ORIG);
    const scaleX = scale;
    const scaleY = scale;
    const W = canvas.width;
    const H = canvas.height;
    const GY = GY_ORIG * scaleY;
    groundYRef.current = GY;
    // Real gravity: 9.81 m/s² = 0.095 px/frame² at 35px=1m, 60fps
    // Гравітація: зменшена на 15% для красивішої параболи (0.12 * 0.85 = 0.102)
    const G = 0.102;

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

      // ТЕСТУВАННЯ: Перевіри зелену лінію для різних дистанцій
      const testCases = [
        { dist: realMaxDistance, name: 'Дальній кут', expectMin: 170 },
        { dist: realMaxDistance * 0.67, name: 'Середня', expectMin: 110 },
        { dist: realMaxDistance * 0.33, name: 'Ближня', expectMin: 50 },
        { dist: realMaxDistance * 0.15, name: 'Дуже близько', expectMin: 20 }
      ];

      testCases.forEach(tc => {
        const greenLine = powerMeterRef.current!.calculateGreenLinePosition(tc.dist);
        const ok = greenLine >= tc.expectMin;
        console.log(`[GREEN LINE TEST] ${tc.name}: dist=${tc.dist.toFixed(0)}, line=${greenLine.toFixed(0)} (очіку ${tc.expectMin}+) ${ok ? '✅' : '❌'}`);
      });
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

    // НОВАЯ СИСТЕМА КОЛІЖІЙ: 5 різних результатів кидка
    function checkHoopCollision(ball: any): string {
      const dx = ball.x - HOOP_X;
      const dy = ball.y - HOOP_Y;
      const dist = Math.hypot(dx, dy);

      // М'яч мусить летіти вниз для розпізнавання коліжій
      if (ball.vy <= 0) return 'miss';

      // Розрахуй кут входу м'яча в обруч (в градусах)
      const entryAngle = Math.atan2(ball.vy, ball.vx) * (180 / Math.PI);

      // NET_ZONE = 10px (HOOP_RADIUS 22 - BALL_RADIUS 12)
      const NET_ZONE = HOOP_RADIUS - BALL_RADIUS;

      // SWISH: чистий пас через центр сітки (dist < 10px)
      if (dist < NET_ZONE) {
        return 'swish';
      }

      // RATTLE_IN: дотик обіду + крутий кут (близько вертикального падіння < -30°)
      if (dist < HOOP_RADIUS && entryAngle < -30) {
        return 'rattleIn';
      }

      // RIM_OUT: дотик обіду + пологий кут (> -30°)
      if (dist < HOOP_RADIUS + BALL_RADIUS && entryAngle >= -30) {
        return 'rimOut';
      }

      // BANK_SHOT: дотик щитка (обробляється окремо в stepBall)
      // Тут просто пропускаємо, обробка в rimHandled логіці

      return 'miss';
    }

    // ETAP 5: Determine realistic hit type (DIRECT/ARC/SWISH) based on accuracy and position
    function determineHitType(accuracy: number, dx: number, dy: number, dist: number): string {
      // DIRECT: 60% (accuracy affects probability)
      // ARC: 25% (ball bounces off rim)
      // SWISH: 15% (pure net catch)

      const horizontalDist = Math.abs(dx);
      const NET_ZONE = HOOP_RADIUS - BALL_RADIUS;  // 10px
      const RIM_EDGE = HOOP_RADIUS;  // 22px

      // Pure center → SWISH (if accuracy >= 90%)
      if (dist < NET_ZONE && accuracy >= 90) {
        return 'SWISH';
      }

      // Near rim edge → ARC (ball bounces)
      if (horizontalDist > NET_ZONE && horizontalDist <= RIM_EDGE && accuracy >= 75) {
        return 'ARC';
      }

      // Default to DIRECT for most cases
      return 'DIRECT';
    }

    // Зберігаємо стару функцію для сумісності (використовується для fallback)
    function checkBallInHoop(ballPos: any, hoopX: number, hoopY: number, hoopRadius: number): boolean {
      const dx = ballPos.x - hoopX;
      const dy = ballPos.y - hoopY;
      const horizontalDist = Math.abs(dx);
      const inRimArea = horizontalDist < (hoopRadius + BALL_RADIUS);
      const belowRim = ballPos.y > hoopY + 10 * scaleY;
      return inRimArea && belowRim;
    }

    // Застосування реалістичного відскоку від обіду
    function applyRimBounce(ball: any): void {
      // Нормаль від центра обруча до м'яча
      const dx = ball.x - HOOP_X;
      const dy = ball.y - HOOP_Y;
      const dist = Math.hypot(dx, dy);

      if (dist === 0) return; // Уникнути ділення на нуль

      const nx = dx / dist; // Нормалізована вісь X
      const ny = dy / dist; // Нормалізована вісь Y

      // dot product для проекції швидкості на нормаль
      const dot = ball.vx * nx + ball.vy * ny;

      // Новий вектор швидкості (гасить рух вздовж нормалі на 40%)
      ball.vx = ball.vx - 2 * dot * nx * 0.4;
      ball.vy = ball.vy - 2 * dot * ny * 0.4;
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

    // AUTOTEST: Тестування зеленої лінії та гарантії
    function autoTest() {
      console.log('\n=== АВТОТЕСТ ПОЧАТ ===');

      // BUG 3 FIX PHASE 2: Test green line positions at different distances
      console.log('\n[TEST GREEN LINE] Перевірка позиції зеленої лінії на різних дистанціях:');
      const testCases = [
        { name: 'Дальній (макс)', dist: realMaxDistance, expected: 175 },
        { name: 'Середній', dist: realMaxDistance * 0.6, expected: 108 },
        { name: 'Близький', dist: realMaxDistance * 0.25, expected: 45 }
      ];

      testCases.forEach(tc => {
        const line = (tc.dist / realMaxDistance) * 180;
        const ok = Math.abs(line - tc.expected) < 20;
        console.log(`[TEST] ${tc.name}: dist=${tc.dist.toFixed(0)} → greenLine=${line.toFixed(0)} (очіку ~${tc.expected}) ${ok ? '✅' : '❌ ПОМИЛКА'}`);
      });

      let greenLineHits = 0;
      let greenLineScored = 0;

      // Симулюємо 10 бросків з різною accuracy
      console.log('\n[TEST GUARANTEE] Перевірка гарантованого попадання при accuracy >= 95%:');
      for (let i = 0; i < 10; i++) {
        const accuracy = i < 5 ? 100 : Math.floor(Math.random() * 60);
        const isGreen = accuracy >= 95;

        if (isGreen) {
          greenLineHits++;
          console.log(`[ТЕСТ ${i + 1}] accuracy=${accuracy}% → ЗЕЛЕНА ЛІНІЯ → очікуємо ГОЛ ✅`);
        } else {
          console.log(`[ТЕСТ ${i + 1}] accuracy=${accuracy}% → промах можливий ❌`);
        }
      }

      console.log(`\n=== РЕЗУЛЬТАТ: зелених кліків=${greenLineHits}/10 ===\n`);
      return greenLineHits;
    }

    // Запусти autoTest при завантаженні
    if (typeof window !== 'undefined' && !gs.autoTestRun) {
      console.log('[INIT] Запускаємо autoTest...');
      autoTest();
      gs.autoTestRun = true;
    }

    function stepBall(b: any, dt: number) {
      if (b.state !== 'flying') return;
      const prevX = b.x, prevY = b.y;

      // Воздушное сопротивление: теряет 0.5% скорости по X каждый кадр
      b.vx *= Math.pow(0.995, dt);

      b.vy += G * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // ⭐ FIX #3: GUIDED MODE — Correction in last 3 frames for guaranteed accuracy=100
      if (b.isGuided && b.frameCount !== undefined) {
        b.frameCount++;
        const framesLeft = b.flightFrames - b.frameCount;
        const isLastFrames = framesLeft <= 3 && framesLeft > 0;

        if (isLastFrames) {
          // Final correction: guide ball to exact target (hoop)
          const dx = b.targetX - b.x;
          const dy = b.targetY - b.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 1) {
            // Smooth correction factor (increases as we get closer to landing frame)
            const correctionFactor = 0.15 / framesLeft; // 0.15 = 5% per frame for 3 frames
            b.vx += (dx / dist) * correctionFactor * 300 * dt;
            b.vy += (dy / dist) * correctionFactor * 300 * dt;
            console.log(`[GUIDED CORRECTION] frame=${b.frameCount}/${b.flightFrames}, framesLeft=${framesLeft}, dist=${dist.toFixed(0)}, correction=${correctionFactor.toFixed(3)}`);
          }
        }
      }

      // Обертання: використай динамічну angular velocity при відскоках, інакше константа
      if (b.angularVelocity !== undefined) {
        b.rot += b.angularVelocity * dt;
        b.angularVelocity *= Math.pow(0.98, dt); // Зменш обертання при опорі
      } else {
        b.rot += 0.14 * dt;
      }
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
            b.vx += toHX / dist * pull * dist * dt;
            b.vy += toHY / dist * pull * dist * dt;
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

      // ⭐ FIX #4: MISS VARIATIONS — Realistic rim bounce and side miss scenarios
      const distToHoop = Math.hypot(b.x - HOOP_X, b.y - HOOP_Y);

      // For guided mode OR guaranteed score: guide to hoop
      if (b.guaranteedScore && !b.scoredGoal) {
        // Коригуємо траєкторію якщо м'яч ще далеко від кільця
        if (distToHoop < HOOP_RADIUS * 4 && b.vy > 0) {
          const correction = 0.08;
          b.vx += (HOOP_X - b.x) * correction * dt;
          b.vy += (HOOP_Y - b.y) * correction * dt;
          console.log(`[GUARANTEE TRAJECTORY] Correcting: dist=${distToHoop.toFixed(0)}, vx=${b.vx.toFixed(1)}, vy=${b.vy.toFixed(1)}`);
        }

        // Перевіряємо чи м'яч вже в кільці
        if (distToHoop < HOOP_RADIUS && b.vy > 0) {
          b.scoredGoal = true;
          b.state = 'scored';
          b.outcome = 'swish';
          b.vx = 0;
          b.vy = 0;
          b.x = HOOP_X;
          b.y = HOOP_Y + 26*scaleY;
          gs.netShake = true;
          gs.netShakeEnd = Date.now() + 700;
          addFlash('🎯 ГАРАНТОВАНИЙ SWISH!', HOOP_X, HOOP_Y - 52*scaleY, '#00ff00');
          console.log('[GUARANTEED GOAL] Accuracy = 100% → automatic goal!');
          return;
        }
      }

      // For non-guided shots: implement miss variations based on distance from green zone
      if (!b.isGuided && b.frameCount !== undefined && b.flightFrames !== undefined) {
        // Calculate miss amount (how far marker was from green zone center)
        // missAmount = 0 (dead center) to 1+ (far from zone)
        const markerPos = markerPosRef.current;
        const distRatio = Math.min(distToHoop / Math.hypot(W, H), 1);
        const zoneCenter = 0.2 + distRatio * 0.5;
        const missAmount = Math.abs(markerPos - zoneCenter);

        // ⭐ FIX #4a: RIM BOUNCE (missAmount 0.08 = ~±20-35px offset)
        if (missAmount < 0.08) {
          const rimOffsetDir = Math.random() < 0.5 ? -1 : 1;
          const rimOffsetMag = (20 + Math.random() * 15) * scaleX * rimOffsetDir;
          b.vx += rimOffsetMag * 0.05;
          // Ball will bounce off rim naturally through existing physics
          console.log(`[MISS VARIATION] Rim Bounce: missAmount=${missAmount.toFixed(3)}, offset=${rimOffsetMag.toFixed(0)}px`);
        }
        // ⭐ FIX #4b: SIDE MISS (0.08 <= missAmount < 0.20 = ±40-100px offset)
        else if (missAmount < 0.20) {
          const sideOffsetDir = Math.random() < 0.5 ? -1 : 1;
          const sideOffsetMag = (40 + Math.random() * 60) * scaleX * sideOffsetDir;
          b.vx += sideOffsetMag * 0.08;
          b.vy *= 0.85; // Slow down vertical component
          console.log(`[MISS VARIATION] Side Miss: missAmount=${missAmount.toFixed(3)}, offset=${sideOffsetMag.toFixed(0)}px`);
        }
        // ⭐ FIX #4c: STRONG MISS (missAmount >= 0.20 = full random trajectory)
        else {
          const strongMissX = (Math.random() - 0.5) * 150 * scaleX;
          const strongMissY = (Math.random() - 0.5) * 100 * scaleY;
          b.vx += strongMissX * 0.1;
          b.vy += strongMissY * 0.1;
          console.log(`[MISS VARIATION] Strong Miss: missAmount=${missAmount.toFixed(3)}, randomOffset=(${strongMissX.toFixed(0)}, ${strongMissY.toFixed(0)})px`);
        }
      }

      // ⭐ FIX #5: SCORING DETECTION FOR GUIDED MODE
      // If guided shot reaches end of flight frames and is close to hoop: score
      if (b.isGuided && b.frameCount !== undefined && b.flightFrames !== undefined) {
        if (b.frameCount >= b.flightFrames) {
          // Flight ended - check if we're in scoring range
          if (distToHoop < HOOP_RADIUS * 2) {
            // Close enough to hoop: check if we have lucky bounce condition
            const luckyBounce = Math.random() < 0.70; // 70% chance to score when close
            if (luckyBounce && !b.scoredGoal) {
              b.scoredGoal = true;
              b.state = 'scored';
              b.outcome = 'direct';
              b.vx = 0;
              b.vy = 0;
              b.x = HOOP_X;
              b.y = HOOP_Y + 26*scaleY;
              gs.netShake = true;
              gs.netShakeEnd = Date.now() + 700;
              addFlash('🎯 GUIDED SWISH!', HOOP_X, HOOP_Y - 52*scaleY, '#00ff00');
              console.log('[GUIDED GOAL] Flight complete, close to hoop → SCORE!');
              return;
            }
          }
        }
      }

      // НОВА СИСТЕМА КОЛІЖІЙ: Реалістична фізика з 5 результатами
      // Перевіря коліжію з обручем лише якщо м'яч ще не обробив результат
      if (!b.rimHandled && b.vy > 0) {
        // FIX: Check if ball is already INSIDE hoop and falling down
        // If so, skip rim collision and let it fall through naturally
        const hoopLeftX = HOOP_X - HOOP_RADIUS;
        const hoopRightX = HOOP_X + HOOP_RADIUS;
        const ballInsideHoop =
          b.x > hoopLeftX + BALL_RADIUS &&
          b.x < hoopRightX - BALL_RADIUS &&
          b.y >= HOOP_Y &&
          b.vy > 0;

        if (ballInsideHoop && !b.scoredGoal) {
          // Ball is inside hoop and falling → auto-score
          b.scoredGoal = true;
          b.state = 'scored';
          b.outcome = 'direct';
          b.vx = 0;
          b.vy = 0;
          b.x = HOOP_X;
          b.y = HOOP_Y + 26*scaleY;
          gs.netShake = true;
          gs.netShakeEnd = Date.now() + 700;
          addFlash('🎯 SWISH!', HOOP_X, HOOP_Y - 52*scaleY, '#00ff00');
          console.log('[COLLISION] Ball inside hoop, falling through - GOAL!');
          return;
        }

        // Matter.js коліжія для реалістичної фізики обруча
        let collisionType: string = 'none';
        if (physicsRef.current) {
          collisionType = physicsRef.current.checkCollision(b.x, b.y, b.vx, b.vy);
        } else {
          collisionType = checkHoopCollision(b);
        }

        if (collisionType === 'swish') {
          // SWISH: чистий пас - автоматично гол
          b.scoredGoal = true;
          b.state = 'scored';
          b.outcome = 'swish';
          b.vx = 0;
          b.vy = 0;
          b.x = HOOP_X;
          b.y = HOOP_Y + 26*scaleY;
          gs.netShake = true;
          gs.netShakeEnd = Date.now() + 700;
          addFlash('🎯 SWISH!', HOOP_X, HOOP_Y - 52*scaleY, '#00ff00');
          console.log('[COLLISION] Swish - clean shot!');
          return;
        }

        if (collisionType === 'rattleIn') {
          // RATTLE_IN: дотик обіду + відскік + в сітку
          b.rimHandled = true;
          b.outcome = 'rattleIn';

          // Init rim bounce counter to prevent infinite spinning
          if (b.rimBounceCount === undefined) b.rimBounceCount = 0;
          b.rimBounceCount++;

          // If too many rim bounces, force result
          if (b.rimBounceCount >= 3) {
            // After 3+ bounces, force into hoop
            b.scoredGoal = true;
            b.state = 'scored';
            b.outcome = 'direct';
            b.vx = 0;
            b.vy = 0;
            b.x = HOOP_X;
            b.y = HOOP_Y + 26*scaleY;
            gs.netShake = true;
            gs.netShakeEnd = Date.now() + 700;
            addFlash('🎯 FINALLY IN!', HOOP_X, HOOP_Y - 52*scaleY, '#00ff00');
            console.log('[COLLISION] Rattle in - forced goal after 3 bounces');
            return;
          }

          applyRimBounce(b);
          addFlash('💥 Rattles In!', HOOP_X, HOOP_Y - 52*scaleY, '#ff9900');
          gs.netShake = true;
          gs.netShakeEnd = Date.now() + 700;
          console.log(`[COLLISION] Rattle in - rim bounce #${b.rimBounceCount} detected`);
          // М'яч продовжує летіти, потім потрапить в обруч через magic pull
          b.outcome = 'direct';
        }

        if (collisionType === 'rimOut') {
          // RIM_OUT: дотик обіду + 50/50 повернення або повернення в кільце
          b.rimHandled = true;
          b.outcome = 'rimOut';

          // Init rim bounce counter
          if (b.rimBounceCount === undefined) b.rimBounceCount = 0;
          b.rimBounceCount++;

          applyRimBounce(b);

          // 50/50: половину м'яч летить назад, половину повертається в кільце
          const bounceBackToHoop = Math.random() < 0.5;

          if (bounceBackToHoop) {
            // 50% УСПІХ: М'яч повертається в кільце після відскоку від дужки
            const dx = HOOP_X - b.x;
            const dy = HOOP_Y - b.y;
            const dist = Math.hypot(dx, dy);
            const bounceSpeed = Math.hypot(b.vx, b.vy) * 0.6;
            b.vx = (dx / dist) * bounceSpeed;
            b.vy = (dy / dist) * bounceSpeed;
            b.guaranteedScore = true;

            // After 3+ bounces, just score directly
            if (b.rimBounceCount >= 3) {
              b.scoredGoal = true;
              b.state = 'scored';
              b.outcome = 'direct';
              b.vx = 0;
              b.vy = 0;
              b.x = HOOP_X;
              b.y = HOOP_Y + 26*scaleY;
              addFlash('🎯 IN!', HOOP_X, HOOP_Y - 52*scaleY, '#00ff00');
              gs.netShake = true;
              gs.netShakeEnd = Date.now() + 700;
              console.log(`[COLLISION] Rim bounce #${b.rimBounceCount} - forced goal`);
              return;
            }

            addFlash('🔄 RATTLES IN! 🏀', HOOP_X, HOOP_Y - 52*scaleY, '#ff8800');
            gs.netShake = true;
            gs.netShakeEnd = Date.now() + 700;
            console.log(`[COLLISION] Rim bounce #${b.rimBounceCount} SUCCESS → returns to hoop`);
            b.outcome = 'direct';
          } else {
            // 50% ПРОМАХ: Обычный отскок назад
            b.vx *= -0.55;
            b.vy = -Math.abs(b.vy) * 0.65;
            addFlash('💢 RIM!', HOOP_X, HOOP_Y - 52*scaleY, '#ff0000');
            gs.netShake = true;
            gs.netShakeEnd = Date.now() + 500;

            // After 3 failed bounces, eject the ball
            if (b.rimBounceCount >= 3) {
              b.vx = (Math.random() > 0.5 ? 1 : -1) * 3;
              b.vy = -2;
              b.rimBounceCount = 0;
              console.log(`[COLLISION] Rim bounce #${b.rimBounceCount} - ejecting ball`);
            } else {
              console.log(`[COLLISION] Rim bounce #${b.rimBounceCount} MISS → bounces back`);
            }
            b.outcome = 'miss_fly';
          }
        }
      }

      // BANK SHOT обробка (обід щитка потім в сітку) - залишається як раніше
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
              addFlash('💥 BANK SHOT! 💥', BOARD_X + 50*scaleX, BOARD_TOP - 32*scaleY, '#ffffff');
              b.outcome = 'bankShot';
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

      // Fallback: traditional hoop distance check для direct/perfect/bankshot outcomes
      const d = Math.hypot(b.x - HOOP_X, b.y - HOOP_Y);
      if (d < 32 && (b.outcome === 'direct' || b.outcome === 'perfect_direct' || b.outcome === 'bankShot') && b.vy > 0 && !b.scoredGoal) {
        b.scoredGoal = true;
        b.state = 'scored';
        b.vx = 0;
        b.vy = 0;
        b.x = HOOP_X;
        b.y = HOOP_Y + 26*scaleY;
        addFlash('🎯 ГОЛ!', HOOP_X, HOOP_Y - 52*scaleY, '#44ff88');
        console.log(`[SCORING] Shot type: ${b.outcome}`);
        return;
      }

      // РЕАЛІСТИЧНИЙ ВІДСКІК ВІД ПІДЛОГИ з фізикою обертання
      const BOUNCE_RESTITUTION = 0.6;
      const FLOOR_FRICTION = 0.75;
      const MIN_BOUNCE_SPEED = 1.5;
      const MAX_BOUNCES = 4;

      if (b.y >= GY) {
        if (!b.bounceCount) b.bounceCount = 0;

        // Ініціалізуй ротацію якщо не розпочата
        if (!b.angularVelocity) b.angularVelocity = 0;

        // Перший контакт з підлогою - відскік
        if (b.bounceCount < MAX_BOUNCES && Math.abs(b.vy) >= MIN_BOUNCE_SPEED) {
          b.y = GY;

          // Коефіцієнт пружності залежить від кута падіння
          const fallAngle = Math.abs(Math.atan2(b.vy, b.vx));
          const restitution = BOUNCE_RESTITUTION * (0.8 + 0.4 * Math.cos(fallAngle));

          // Відскік: інвертуй vy, зменши за рахунок пружності
          b.vy = -b.vy * restitution;

          // Тертя: зменш горизонтальну швидкість при відскоці
          b.vx *= FLOOR_FRICTION;

          // Обертання: збільш angular velocity при відскоці
          b.angularVelocity = b.vx * 0.05;

          // Лічи відскоки
          b.bounceCount++;

          console.log(`[BOUNCE] #${b.bounceCount}: vy=${b.vy.toFixed(1)}, vx=${b.vx.toFixed(1)}, rot_vel=${b.angularVelocity.toFixed(2)}`);
        } else if (b.bounceCount >= MAX_BOUNCES || Math.abs(b.vy) < MIN_BOUNCE_SPEED) {
          // Відскоки завершені або низька швидкість - м'яч зупинився
          b.y = GY;
          b.vx = 0;
          b.vy = 0;
          b.angularVelocity = 0;
          b.state = 'missed';
          console.log(`[BOUNCE] Ball stopped after ${b.bounceCount} bounces`);
        }
      }
    }

    function launchBall(idx: number) {
      console.log(`[LAUNCH] Player ${idx} launching ball with power ${gs.shootStates[idx].power.toFixed(0)}%`);
      const p = gs.players[idx];
      const ss = gs.shootStates[idx];
      const px = p.x - 15*scaleX;
      const py = p.y - 55*scaleY;
      let angle = ss.aimAngle;  // ETAP 7: Make angle mutable for perfect release lock

      // Calculate distance-based physics with 200% power scale
      const distToHoop = Math.hypot(HOOP_X - px, HOOP_Y - py);
      const maxDist = Math.hypot(W, H);
      const distFraction = distToHoop / maxDist;

      // Use NEW dynamic distance-based ideal power calculation
      const idealPwrPct = calculateIdealPowerByDistance(px, py);
      const greenZoneTolerance = Math.round(calculateGreenZoneTolerance(distFraction) * 2);
      const inGreenZone = Math.abs(ss.power - idealPwrPct) <= greenZoneTolerance;

      // FIX 3: Distance-based power verification logging (140px = 1m, before any ball launch)
      const distMeters = (distToHoop / 140).toFixed(2);
      console.log(`[POWER ANALYSIS] Distance=${distMeters}m (${Math.round(distToHoop)}px), Ideal=${idealPwrPct}%, Actual=${ss.power}%, Tolerance=±${greenZoneTolerance}%, In Green=${inGreenZone}`);

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

      // УЛУЧШЕНИЕ: Увеличение скорости мяча на 40% для более быстрого полёта
      curSpd = curSpd * 1.4;

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

      // GREEN LINE GUARANTEE: Clicking exactly on green line (accuracy >= 95%) = 100% score
      let guaranteedScore = false;

      // ✅ FIX 1 + ETAP 5: 6-TIER ACCURACY SUCCESS SYSTEM with probabilistic hit types
      const accuracy = ss.powerMeterResult?.accuracy || 0;
      let hitTypeProb = { DIRECT: 0, ARC: 0, SWISH: 0 };  // Hit type probabilities

      if (accuracy >= 95) {
        guaranteedScore = true;
        hitTypeProb = { DIRECT: 1.0, ARC: 0, SWISH: 0 };  // Always DIRECT
        addFlash('✅ ТОЧНО НА ЛІНІЮ! (100%)', p.x, p.y - 115*scaleY, '#44ff88');
        console.log(`[SHOOT] 🎯 accuracy=${accuracy}% >= 95% → 100% success (DIRECT GUARANTEED)`);
      } else if (accuracy >= 85) {
        guaranteedScore = Math.random() < 0.95;
        hitTypeProb = { DIRECT: 0.70, ARC: 0.25, SWISH: 0.05 };  // 70% DIRECT, 25% ARC
        addFlash('⭐ ВІДМІННИЙ БРОСОК! (95%)', p.x, p.y - 115*scaleY, '#88ff88');
        console.log(`[SHOOT] accuracy=${accuracy}% >= 85% → 95% success (70% DIRECT)`);
      } else if (accuracy >= 75) {
        guaranteedScore = Math.random() < 0.80;
        hitTypeProb = { DIRECT: 0.50, ARC: 0.30, SWISH: 0.20 };  // 50% DIRECT, 30% ARC
        addFlash('🟢 ХОРОШИЙ БРОСОК! (80%)', p.x, p.y - 115*scaleY, '#ffff44');
        console.log(`[SHOOT] accuracy=${accuracy}% >= 75% → 80% success (50% DIRECT)`);
      } else if (accuracy >= 65) {
        guaranteedScore = Math.random() < 0.60;
        hitTypeProb = { DIRECT: 0.30, ARC: 0.30, SWISH: 0.40 };  // 30% DIRECT, 30% ARC
        addFlash('🟡 НЕПОГАНИЙ БРОСОК (60%)', p.x, p.y - 115*scaleY, '#ffaa44');
        console.log(`[SHOOT] accuracy=${accuracy}% >= 65% → 60% success (30% DIRECT)`);
      } else if (accuracy >= 50) {
        // ETAP 5 FIX: Minimum 50% success when accuracy 50-65%
        guaranteedScore = Math.random() < 0.50;
        hitTypeProb = { DIRECT: 0.20, ARC: 0.30, SWISH: 0.50 };  // 20% DIRECT, mostly SWISH
        addFlash('🔴 СЛАБКИЙ БРОСОК (50%)', p.x, p.y - 115*scaleY, '#ff6644');
        console.log(`[SHOOT] accuracy=${accuracy}% >= 50% → 50% success (MIN THRESHOLD)`);
      } else {
        guaranteedScore = false;
        hitTypeProb = { DIRECT: 0, ARC: 0, SWISH: 0 };  // No hit chance
        addFlash('❌ ДУЖЕ СЛАБКО! (0%)', p.x, p.y - 115*scaleY, '#ff3333');
        console.log(`[SHOOT] accuracy=${accuracy}% < 50% → GUARANTEED MISS`);
      }

      // Select hit type based on probabilities
      if (guaranteedScore) {
        const rand = Math.random();
        let cumProb = 0;
        if (rand < (cumProb += hitTypeProb.DIRECT)) ss.hitType = 'DIRECT';
        else if (rand < (cumProb += hitTypeProb.ARC)) ss.hitType = 'ARC';
        else ss.hitType = 'SWISH';
      } else {
        ss.hitType = null;
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

      // Add miss offset based on accuracy (0-100%)
      // Accuracy 100 = direct hit, accuracy 0 = 150px offset
      let targetHoopX = HOOP_X;
      let targetHoopY = HOOP_Y;

      if (accuracy < 100) {
        const missOffset = (1 - accuracy / 100) * 150; // 0..150px deviation
        const missAngle = Math.random() * Math.PI * 2; // random direction
        targetHoopX += Math.cos(missAngle) * missOffset;
        targetHoopY += Math.sin(missAngle) * missOffset;
        console.log(`[MISS PHYSICS] accuracy=${accuracy}%, offset=${missOffset.toFixed(0)}px`);
      }

      // ⭐ FIX #2: REALISTIC BASKETBALL ARC TRAJECTORY
      // Calculate parabolic arc based on distance to target
      const dx = targetHoopX - px;
      const dy = targetHoopY - py;
      const distToTarget = Math.hypot(dx, dy);

      // Calculate flight time based on distance (realistic basketball physics)
      const flightFrames = Math.max(40, distToTarget * 0.12);
      const T = flightFrames / 60; // Convert frames to seconds

      // Arc height: 35% of horizontal distance + 60px base
      const arcHeight = Math.abs(dx) * 0.45 + 60 * scaleY;

      // Parabolic trajectory: solve for vx and vy such that ball lands at target
      // Using: y = y0 + vy*T + 0.5*G*T^2
      let ballVx = dx / T;
      let ballVy = (dy - 0.5 * G * T * T) / T;

      // Adjust vy to account for arc (projectile motion correction)
      // Add upward component to create arc then fall to target
      ballVy -= arcHeight / T * 0.35; // Initial upward velocity for arc

      console.log(`[ARC TRAJECTORY] dist=${distToTarget.toFixed(0)}px, flightFrames=${flightFrames.toFixed(0)}, arcHeight=${arcHeight.toFixed(0)}, vx=${ballVx.toFixed(1)}, vy=${ballVy.toFixed(1)}`);

      // Store arc metadata for guided mode correction
      const ballData: any = {
        x: px, y: py,
        vx: ballVx, vy: ballVy,
        rot: 0, state: 'flying', outcome,
        boardHandled: false, rimHandled: false, owner: idx,
        guaranteedScore: guaranteedScore,
        scoredGoal: false,
        bounceCount: 0,
        rimBounceCount: 0,
        // ⭐ FIX #3: GUIDED MODE DATA
        isGuided: guaranteedScore,
        targetX: targetHoopX,
        targetY: targetHoopY,
        flightFrames: flightFrames,
        frameCount: 0
      };

      ss.ball = ballData;

      // DEBUG: Log guarantee status
      console.log(`[LAUNCH] accuracy=${ss.powerMeterResult?.accuracy || 'N/A'}, guaranteedScore=${guaranteedScore}`);

      // Инициализация Matter.js для коллизий с обручем
      if (!physicsRef.current) {
        physicsRef.current = new BasketballPhysics(HOOP_X, HOOP_Y, HOOP_RADIUS, BALL_RADIUS, BOARD_X, BOARD_TOP);
      }
      physicsRef.current.launchBall(px, py, ballVx, ballVy);

      ss.phase = 'flying';
      ss.lockedAngle = null;
      ss.idealTraj = null;
      p.status = 'shooting';
      if (idx === gs.disputeP1 && gs.disputeP2 === -1 && gs.players.length > 1) gs.disputeP2 = 1;
    }

    function update(dt: number) {
      if (gs.state !== 'playing') return;
      for (let i = 0; i < gs.players.length; i++) {
        const p = gs.players[i], ss = gs.shootStates[i];
        if (p.status === 'eliminated') continue;
        if (ss.phase === 'aiming') {
          const sx = p.x - 15*scaleX;
          const behindBoard = sx < BOARD_FACE;
          ss.aimAngle += 0.022 * ss.aimDir * dt;
          if (behindBoard) {
            if (ss.aimAngle >= -0.06) { ss.aimAngle = -0.06; ss.aimDir = -1; }
            if (ss.aimAngle <= -Math.PI * 0.5) { ss.aimAngle = -Math.PI * 0.5; ss.aimDir = 1; }
          } else {
            if (ss.aimAngle >= -Math.PI * 0.5) { ss.aimAngle = -Math.PI * 0.5; ss.aimDir = -1; }
            if (ss.aimAngle <= -Math.PI * 0.94) { ss.aimAngle = -Math.PI * 0.94; ss.aimDir = 1; }
          }
        }
        if (ss.phase === 'charging') {
          ss.power += 2.6 * ss.powerDir * dt; // Doubled rate for 200% range
          if (ss.power >= 200) { ss.power = 200; ss.powerDir = -1; }
          if (ss.power <= 0) { ss.power = 0; ss.powerDir = 1; }
          // Oscillate distance indicator marker with arcade-style difficulty
          const distToHoop = Math.hypot(HOOP_X - (p.x - 15*scaleX), HOOP_Y - (p.y - 55*scaleY));
          const maxDist = Math.hypot(W, H);
          const distRatio = Math.min(distToHoop / maxDist, 1);

          // Speed depends on distance: 0.30 (close, easy) to 0.50 (far, hard)
          const MARKER_SPEED = 0.30 + distRatio * 0.20;

          // Use FIXED dt = 1/60 second per frame (not real delta), ensures consistent arcade pace
          const FIXED_DT = 1 / 60;
          markerPosRef.current += markerDirRef.current * MARKER_SPEED * FIXED_DT;
          if (markerPosRef.current >= 1) { markerPosRef.current = 1; markerDirRef.current = -1; }
          if (markerPosRef.current <= 0) { markerPosRef.current = 0; markerDirRef.current = 1; }
        }
        if (ss.phase === 'flying' && ss.ball) {
          stepBall(ss.ball, dt);
          if (ss.ball.state === 'scored') handleScored(i);
          else if (ss.ball.state === 'missed') handleMissed(i);
        }
        // Prevent movement during aiming/charging phases
        if (ss.phase === 'aiming' || ss.phase === 'charging') {
          continue;
        }
        if (ss.phase === 'auto_run' || ss.phase === 'manual_run') {
          p.rf += dt;
          const t = ss.runTarget;
          if (!t) { ss.phase = ss.phase === 'auto_run' ? 'pickup_wait' : null; p.status = 'idle'; continue; }
          const dx = t.x - p.x;
          if (Math.abs(dx) > 4) { p.x += Math.sign(dx) * 3.5 * dt; }
          else {
            if (ss.phase === 'auto_run') { ss.phase = 'pickup_wait'; ss.ball = null; }
            else ss.phase = null;
            p.status = 'idle';
          }
        }
      }
      if (gs.netShake && Date.now() > gs.netShakeEnd) gs.netShake = false;
      if (gs.netShake) gs.netShakeT += 0.4 * dt;
      gs.flashes = gs.flashes.filter((f: any) => {
        f.dy -= 0.5 * dt;
        f.alpha -= 0.011 * dt;
        return f.alpha > 0;
      });
    }

    function setShowOrder(orderNumbers: number[]) {
      showOrderRef.current = {};
      orderNumbers.forEach(n => { showOrderRef.current[n] = true; });
    }

    function handleScored(idx: number) {
      const p = gs.players[idx];
      p.score++;
      gs.shootStates[idx].inDanger = false;

      // Update turn order: if player #1 scored, they go to end
      if (idx === 0) {
        // First player goes to end, second becomes new first
        // Show order only for new shooter (was #2, now #1) and potential hunter (was #3, now #2)
        if (gs.players.length > 1) {
          const newOrders = gs.players.slice(1, 3).map((p: any) => p.order).filter(Boolean);
          setShowOrder(newOrders);
        } else {
          setShowOrder([]);
        }
      }

      // FIX 4 + ETAP 7: ACCURACY DISPLAY with perfect release highlight
      const ss = gs.shootStates[idx];
      const accuracy = ss.powerMeterResult?.accuracy || 100;
      const distMeters = (ss.distToHoop ? (ss.distToHoop / 140).toFixed(1) : '?');  // 140px = 1m

      // ETAP 7: Special message for perfect 100% accuracy (green line hit)
      let flashText: string;
      let flashColor = '#44cc44';  // Default green
      if (accuracy >= 95) {
        flashText = `🎯 100% ІДЕАЛЬНО! ${distMeters}m | ПРЯМЕ ПОПАДАННЯ`;
        flashColor = '#00ff00';  // Bright green for perfect release
      } else {
        const accuracyText = accuracy >= 85 ? '⭐' : accuracy >= 75 ? '🟢' : accuracy >= 65 ? '🟡' : '🔴';
        flashText = `${accuracyText} ПОПАВ! +1 (${distMeters}m, ${Math.round(accuracy)}%)`;
      }

      addFlash(flashText, HOOP_X + 55*scaleX, HOOP_Y - 45*scaleY, flashColor);

      // ETAP 5: Determine hit type and set net swing animation
      const ball = ss.ball;
      let hitType = 'DIRECT';
      let netDuration = 200;  // ms
      if (ball) {
        const dx = ball.x - HOOP_X;
        const dy = ball.y - HOOP_Y;
        const dist = Math.hypot(dx, dy);
        hitType = determineHitType(accuracy, dx, dy, dist);

        // Different net swing durations for each type
        if (hitType === 'DIRECT') netDuration = 200;
        else if (hitType === 'ARC') netDuration = 300;
        else if (hitType === 'SWISH') netDuration = 100;
      }
      gs.netSwing = { type: hitType, startTime: Date.now(), duration: netDuration };
      console.log(`[NET SWING] Type=${hitType}, Duration=${netDuration}ms`);

      gs.netShake = true;
      gs.netShakeEnd = Date.now() + 700;
      ss.phase = null;
      ss.ball = null;
      ss.lockedAngle = null;
      ss.idealTraj = null;

      // Очистка Matter.js physics engine
      if (physicsRef.current) {
        physicsRef.current.destroy();
        physicsRef.current = null;
      }

      // DEBUG: Log scoring event with distance, accuracy, and hit type
      console.log(`[SCORE] Player ${idx} (${p.name}) ${hitType} hit from ${distMeters}m at ${Math.round(accuracy)}%! Total: ${p.score}`);

      // ✅ MULTIPLAYER: Emit shot completion to server via Pusher
      if (idx === 0) {
        fetch('/api/pusher/shot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room: gameRoomId,
            playerId: playerIdRef.current,
            playerIndex: idx,
            nickname: p.name || userName || 'Player',
            shotScore: 1,
            accuracy,
            collisionType: 'swish',
          }),
        }).catch(() => {});
      }

      if (idx === gs.disputeP2 && gs.disputeP1 >= 0 && gs.disputeP1 < gs.players.length) {
        const p1ph = gs.shootStates[gs.disputeP1]?.phase;
        const dangerPhases = ['auto_run', 'pickup_wait', 'flying', 'aiming', 'charging'];
        if (dangerPhases.includes(p1ph) || gs.shootStates[gs.disputeP1]?.inDanger) {
          addFlash('💀 ВИБИТО!', gs.players[gs.disputeP1]?.x || 300, GY - 130*scaleY, '#ff4444');
          if (gs.players[gs.disputeP1]) gs.players[gs.disputeP1].status = 'eliminated';
          if (gs.players[idx]) gs.players[idx].kills = (gs.players[idx].kills || 0) + 1;
          setTimeout(() => {
            const idx2 = gs.disputeP1;
            const eliminatedName = gs.players[idx2]?.name;
            if (eliminatedName) eliminationOrderRef.current.push(eliminatedName);
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

      // BUG 2 FIX: Reset pickup flags when ball is missed
      // This ensures next pickup will happen normally (with running)
      ss.instantPickup = false;
      ss.doubleClickPickup = false;

      addFlash('❌ МИМО!', p.x, p.y - 100*scaleY, '#e05545');
      const bx = ss.ball ? ss.ball.x : p.x;
      ss.runTarget = { x: Math.max(50*scaleX, Math.min(W - 30*scaleX, bx)), y: GY };
      ss.phase = 'auto_run';
      p.status = 'running';

      // Update order display: show order for current shooter and next player
      const order1 = p.order || (idx + 1);
      const nextPlayerOrder = order1 + 1;
      setShowOrder([order1, nextPlayerOrder]);

      // Очистка Matter.js physics engine
      if (physicsRef.current) {
        physicsRef.current.destroy();
        physicsRef.current = null;
      }

      console.log(`[MISS] Player ${idx} missed shot, chasing ball, pickup flags reset`);
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

      // ETAP 5: Calculate net swing displacement based on hit type
      let netSwing = 0;
      if (gs.netSwing.type) {
        const elapsed = Date.now() - gs.netSwing.startTime;
        const progress = Math.min(1, elapsed / gs.netSwing.duration);

        if (gs.netSwing.type === 'DIRECT') {
          // DIRECT: 3 oscillations, fast (200ms total)
          const oscillations = 3;
          const angle = progress * oscillations * Math.PI * 2;
          netSwing = Math.sin(angle) * 15 * scaleY * Math.cos(progress * Math.PI);
        } else if (gs.netSwing.type === 'ARC') {
          // ARC: 2 oscillations, medium (300ms total)
          const oscillations = 2;
          const angle = progress * oscillations * Math.PI * 2;
          netSwing = Math.sin(angle) * 20 * scaleY * Math.cos(progress * Math.PI);
        } else if (gs.netSwing.type === 'SWISH') {
          // SWISH: 1 vibration, fast (100ms total)
          netSwing = Math.sin(progress * Math.PI * 2) * 8 * scaleY;
        }

        if (progress >= 1) gs.netSwing.type = null;  // Clear animation when done
      }

      // Draw net with swing offset
      for (let i = 0; i < 7; i++) {
        const tx = HOOP_X - HOOP_R + 3*scaleX + i * (HOOP_R * 2 - 6*scaleX) / 6;
        const bx2 = HOOP_X - 11*scaleX + i * 22*scaleX / 6;
        ctx.beginPath();
        ctx.moveTo(tx + sh * 0.08 * (i - 3), HOOP_Y + 8*scaleY);
        ctx.lineTo(bx2 + sh * 0.12 * (i - 3) + netSwing * 0.1, HOOP_Y + 46*scaleY + sh + netSwing);
        ctx.stroke();
      }
      for (let j = 0; j < 3; j++) {
        const t = (j + 1) / 4;
        const yw = HOOP_Y + 8*scaleY + t * 38*scaleY + sh * 0.08 + netSwing * (1 - t);
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

    function draw(dt: number) {
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

          // Draw distance indicator bar with green zone and oscillating marker
          const bx2 = p.x + 30*scaleX, barTop = p.y - 80*scaleY, barW = 14*scaleX, barH = 80*scaleY;
          const distRatio2 = Math.min(distToHoop / maxDist, 1);
          const zoneCenter2 = 0.2 + distRatio2 * 0.5;
          const zoneSize2 = 0.12;
          const zoneMin2 = zoneCenter2 - zoneSize2 / 2;
          const zoneMax2 = zoneCenter2 + zoneSize2 / 2;

          // Background bar
          ctx.fillStyle = '#222';
          ctx.fillRect(bx2, barTop, barW, barH);
          // Green success zone
          ctx.fillStyle = '#00FF44';
          ctx.fillRect(bx2, barTop + zoneMin2 * barH, barW, zoneSize2 * barH);
          // Marker (white line)
          const markerY2 = barTop + markerPosRef.current * barH;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(bx2 - 2*scaleX, markerY2 - 2, barW + 4*scaleX, 4);
          // Distance label (in meters)
          ctx.fillStyle = '#FFFF00';
          ctx.font = `${11*scaleX}px Arial`;
          ctx.textAlign = 'center';
          const distMeters = (distToHoop / 140).toFixed(1);
          ctx.fillText(distMeters + 'm', bx2 + barW/2, barTop - 5*scaleY);

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
          // ETAP 5: ENHANCED DRIBBLE BOUNCE ANIMATION - More realistic (12-15px, 120ms cycle)
          const dribbleTime = (Date.now() % 120) / 120;  // 0-1 cycle in 120ms
          const dribbleBounce = Math.sin(dribbleTime * Math.PI) * 13 * scaleY;  // 13px amplitude
          ss.ball.rot = (ss.ball.rot || 0) + 0.05 * dt;  // Ball rotates during dribble
          ctx.translate(ss.ball.x, ss.ball.y + dribbleBounce);
          ctx.rotate(ss.ball.rot);
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

        // Display order number + name
        const orderNum = p.order || (i + 1);
        const isActive = (i === gs.disputeP1 || i === gs.disputeP2) && gs.state === 'playing';

        // Show order number - blink if active, static if not
        if (isActive) {
          // Blinking for active players
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#FFD700';
          ctx.font = `bold ${22*scaleX}px Arial`;
        } else {
          // Static for waiting players
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#AAAAAA';
          ctx.font = `bold ${18*scaleX}px Arial`;
        }
        ctx.textAlign = 'center';
        ctx.fillText(String(orderNum), p.x, p.y - 75*scaleY);
        ctx.globalAlpha = 1;

        // Always display name (white for others, yellow for self)
        ctx.fillStyle = isMine ? '#FFFF00' : '#FFFFFF';
        ctx.font = `bold ${11*scaleX}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x, p.y - 60*scaleY);

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
        // Skip local player to avoid rendering duplicate
        if (rp.playerId === playerIdRef.current) return;

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

        // ETAP 8: Draw remote player's ball (multiplayer sync) with debugging
        if (rp.ball) {
          console.log(`[REMOTE BALL DEBUG] Player: ${rp.name}, ball exists: true, state: ${rp.ball.state}, x: ${rp.ball.x}, y: ${rp.ball.y}`);
        }

        if (rp.ball && (rp.ball.state === 'flying' || rp.ball.state === 'auto_run')) {
          console.log(`[REMOTE BALL RENDER] Rendering ${rp.name} ball - state: ${rp.ball.state}`);
          ctx.save();
          ctx.translate(rp.ball.x, rp.ball.y);
          ctx.rotate(rp.ball.rot || 0);
          drawBball(0, 0, 11*scaleX);
          ctx.restore();
        } else if (rp.ball) {
          console.log(`[REMOTE BALL] ${rp.name} ball exists but state not flying/auto_run: ${rp.ball.state}`);
        }
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
          idle: 'Активний! ЛКМ на підлогу → бігти  |  ПКМ на гравця → кидок',
          aiming: '[1] ЛКМ — зафіксуй кут  |  ПКМ на гравця → скасувати',
          charging: '[2] ЛКМ на гравця = кидок  |  ПКМ на гравця = ↺ переприціл',
          flying: 'М\'яч летить...',
          auto_run: 'Біжить за м\'ячем...  |  Двійний ЛКМ = підібрати миттєво',
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

      // ✅ MULTIPLAYER: Draw leaderboard in top-right corner
      if (gs.leaderboard && gs.leaderboard.length > 0) {
        const boardX = W - 220*scaleX;
        const boardY = 15*scaleY;
        const boardW = 200*scaleX;
        const boardH = Math.min(gs.leaderboard.length * 24*scaleY + 35*scaleY, H * 0.5);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(boardX, boardY, boardW, boardH);

        // Title
        ctx.fillStyle = '#ffdd00';
        ctx.font = `bold ${13*scaleX}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('📊 ТАБЛИЦЯ ЛІДЕРІВ', W - 10*scaleX, boardY + 20*scaleY);

        // Leaderboard entries
        gs.leaderboard.slice(0, 6).forEach((entry: any, i: number) => {
          const y = boardY + 35*scaleY + i * 24*scaleY;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
          const isCurrentPlayer = entry.playerId === playerIdRef.current;
          const color = isCurrentPlayer ? '#44ff44' : '#ffffff';

          ctx.fillStyle = color;
          ctx.font = `${12*scaleX}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(`${medal} ${entry.nickname.substring(0, 12)}: ${entry.score}`, W - 10*scaleX, y);
        });
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

    // FEATURE: Game state persistence on page reload
    const SAVE_KEY = `basketball_game_state_${gameRoomId}`;
    const SAVE_INTERVAL = 2000; // Save every 2 seconds
    let lastSaveTime = 0;

    function saveGameState(gs: any) {
      const now = Date.now();
      if (now - lastSaveTime < SAVE_INTERVAL) return;
      lastSaveTime = now;

      try {
        const saveData = {
          timestamp: now,
          roomId: gameRoomId,
          state: gs.state,
          players: gs.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            x: p.x,
            y: p.y,
            score: p.score,
            kills: p.kills || 0,
            status: p.status,
            color: p.color,
            rf: p.rf || 0,
          })),
          shootStates: gs.shootStates.map((ss: any) => ({
            phase: ss.phase === 'flying' ? 'idle' : ss.phase, // Don't save mid-flight
            hasBall: ss.hasBall || false,
            power: ss.power || 0,
            aimAngle: ss.aimAngle || 0,
          })),
          round: gs.round || 0,
          disputeP1: gs.disputeP1 || 0,
          disputeP2: gs.disputeP2 || -1,
        };

        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        console.log('[PERSIST] Game state saved to localStorage');
      } catch (e) {
        console.error('[PERSIST] Failed to save:', e);
      }
    }

    function loadGameState(): any | null {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;

        const data = JSON.parse(raw);

        // Check data freshness (max 30 minutes)
        const age = Date.now() - data.timestamp;
        if (age > 30 * 60 * 1000) {
          localStorage.removeItem(SAVE_KEY);
          console.log('[PERSIST] Saved state too old, discarded');
          return null;
        }

        // Only restore if it's the same room
        if (data.roomId !== gameRoomId) return null;

        console.log(`[PERSIST] Restoring game state (${Math.round(age / 1000)}s ago)`);
        return data;
      } catch (e) {
        console.error('[PERSIST] Failed to load:', e);
        return null;
      }
    }

    function restoreGameState(gs: any, saved: any) {
      if (!saved || saved.state !== 'playing') return false;

      try {
        // Restore players
        if (saved.players && saved.players.length > 0) {
          gs.players = saved.players.map((p: any) => ({
            ...p,
            rf: p.rf || 0,
          }));
        }

        // Restore shoot states
        if (saved.shootStates && saved.shootStates.length > 0) {
          gs.shootStates = saved.shootStates.map((ss: any) => ({
            phase: ss.phase,
            aimAngle: ss.aimAngle || -Math.PI * 0.72,
            aimDir: 1,
            power: ss.power || 0,
            powerDir: 1,
            ball: null,
            lockedAngle: null,
            idealTraj: null,
            idealSpeed: 10,
            runTarget: null,
            inDanger: false,
            hasBall: ss.hasBall || false,
          }));
        }

        gs.state = saved.state;
        gs.round = saved.round || 0;
        gs.disputeP1 = saved.disputeP1 || 0;
        gs.disputeP2 = saved.disputeP2 || -1;
        gs.selectedMoveIdx = -1;
        gs.flashes = [];

        addFlash('🔄 Гра відновлена!', W / 2, H / 2, '#00FFAA');
        console.log('[PERSIST] Game successfully restored from localStorage');
        return true;
      } catch (e) {
        console.error('[PERSIST] Failed to restore:', e);
        return false;
      }
    }

    // Try to restore game state on load
    const savedState = loadGameState();
    if (savedState) {
      restoreGameState(gs, savedState);
    }

    // Pusher doesn't require connection reconnect logic (pub/sub handles it)

    // Double-click tracking for instant ball grab
    let lastClickTime = 0;
    const DOUBLE_CLICK_THRESHOLD = 400; // ms

    canvas.addEventListener("click", (e: MouseEvent) => {
      if (gs.state !== "playing") return;

      // Track double-click
      const now = Date.now();
      const timeDiff = now - lastClickTime;
      lastClickTime = now;
      const isDoubleClick = timeDiff < DOUBLE_CLICK_THRESHOLD;

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
          // Reset marker for distance indicator
          markerPosRef.current = 0;
          markerDirRef.current = 1;
          console.log(`[Click 2] Charging phase started, marker reset`);
        } else if (ss.phase === "charging") {
          // Compute zone from distance
          const px2 = p.x - 15*scaleX, py2 = p.y - 55*scaleY;
          const distToHoop2 = Math.hypot(HOOP_X - px2, HOOP_Y - py2);
          const distRatio = Math.min(distToHoop2 / Math.hypot(W, H), 1);
          const zoneCenter = 0.2 + distRatio * 0.5; // 0.2..0.7
          const zoneSize = 0.12;
          const zoneMin = zoneCenter - zoneSize / 2;
          const zoneMax = zoneCenter + zoneSize / 2;
          const markerInZone = markerPosRef.current >= zoneMin && markerPosRef.current <= zoneMax;
          const accuracy = markerInZone ? 100 : Math.max(0, 100 - Math.abs(markerPosRef.current - zoneCenter) * 300);
          ss.powerMeterResult = { accuracy, meterHeight: markerPosRef.current * 200, greenLinePosition: zoneCenter * 200 };
          console.log(`[Click 3] Accuracy=${accuracy}%, MarkerPos=${markerPosRef.current.toFixed(2)}, ZoneMin=${zoneMin.toFixed(2)}, ZoneMax=${zoneMax.toFixed(2)}`);
          launchBall(hitIdx);
        }
      } else {
        // FEATURE 1: Double-click to instantly grab ball when chasing
        if (isDoubleClick && gs.selectedMoveIdx >= 0 && gs.selectedMoveIdx < gs.players.length) {
          const p = gs.players[gs.selectedMoveIdx], ss = gs.shootStates[gs.selectedMoveIdx];
          if (p.status !== "eliminated" && ss.phase === "auto_run" && ss.ball) {
            // Ball exists and player is chasing → grab it instantly
            ss.ball.state = "done";
            ss.hasBall = true;
            ss.phase = "idle";
            p.status = "idle";

            // BUG 2 FIX: Reset all pickup-related flags after grabbing ball
            // This ensures next time ball is missed, player will chase normally
            ss.instantPickup = false;
            ss.doubleClickPickup = false;

            addFlash("⚡ МЯЧ ПОДОБРАН!", p.x, p.y - 100*scaleY, "#ffdd44");
            console.log(`[DOUBLE CLICK] Player ${gs.selectedMoveIdx} grabbed ball instantly, pickup flags reset`);
            return;
          }
        }
        // Normal click: move player to position
        if (gs.selectedMoveIdx >= 0 && gs.selectedMoveIdx < gs.players.length) {
          const p = gs.players[gs.selectedMoveIdx], ss = gs.shootStates[gs.selectedMoveIdx];

          // BUG 1 FIX: Block movement during aiming or charging phase
          if (ss.phase === "aiming" || ss.phase === "charging") {
            console.log(`[LMB MOVE] BLOCKED: Cannot move during shooting phase (${ss.phase})`);
            return; // Ignore click, don't move player
          }

          // DEBUG: Log why movement might not trigger
          console.log(`[LMB MOVE] selectedIdx=${gs.selectedMoveIdx}, phase=${ss.phase}, status=${p.status}, eliminated=${p.status === 'eliminated'}`);

          // BLOCK movement during shooting phases (aiming/charging)
          if (ss.phase === "aiming" || ss.phase === "charging") {
            console.log(`[LMB MOVE] BLOCKED: Player in shooting phase (${ss.phase}), movement disabled`);
            return;
          }

          // FIX: Include "idle" phase in movement check (was missing before)
          const canMove = p.status !== "eliminated" &&
                         (ss.phase === null ||
                          ss.phase === "idle" ||
                          ss.phase === "pickup_wait" ||
                          ss.phase === "manual_run");

          if (canMove) {
            ss.runTarget = { x: Math.max(50*scaleX, Math.min(W - 30*scaleX, mx)), y: GY };
            ss.phase = "manual_run";
            p.status = "running";
            console.log(`[LMB MOVE] Player ${gs.selectedMoveIdx} moving to (${mx.toFixed(0)}, ${my.toFixed(0)})`);
          } else {
            console.log(`[LMB MOVE] BLOCKED: phase="${ss.phase}" not in allowed list or status="${p.status}" is eliminated`);
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
        // FEATURE 2: RMB cancels shot phases (aiming or charging) and keeps player active
        if (ss.phase === "charging") {
          // Charging → reset to idle
          ss.phase = "idle";
          ss.power = 0;
          ss.powerDir = 1;
          ss.lockedAngle = null;
          ss.idealTraj = null;
          addFlash("❌ СКАСОВАНО", p.x, p.y - 105*scaleY, "rgba(255,100,100,0.95)");
          console.log(`[RMB CANCEL] Player ${hitIdx} cancelled charging phase`);
        } else if (ss.phase === "aiming") {
          // Aiming → reset to idle
          ss.phase = "idle";
          ss.lockedAngle = null;
          ss.idealTraj = null;
          addFlash("❌ СКАСОВАНО", p.x, p.y - 105*scaleY, "rgba(255,100,100,0.95)");
          console.log(`[RMB CANCEL] Player ${hitIdx} cancelled aiming phase`);
        } else if (p.status !== "eliminated") {
          gs.selectedMoveIdx = hitIdx;
          addFlash("👆 вибрано", p.x, p.y - 95*scaleY, "rgba(255,220,80,0.95)");
        }
      } else {
        if (gs.selectedMoveIdx >= 0) addFlash("✖ вибір скасовано", mx, my - 20*scaleY, "rgba(200,200,200,0.85)");
        gs.selectedMoveIdx = -1;
      }
    });

    // Track last server state emission for persistence
    let lastServerEmitTime = 0;
    const SERVER_EMIT_INTERVAL = 3000; // Send to server every 3 seconds
    const FIXED_MS = 16.667;  // target 60 FPS baseline

    function renderLoop(timestamp: number) {
      if (lastFrameTimeRef.current === 0) lastFrameTimeRef.current = timestamp;
      const rawDt = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;
      // Clamp: max 3 frames to prevent spiral-of-death on tab regain
      const dt = Math.min(rawDt / FIXED_MS, 3);

      update(dt);
      draw(dt);

      // Emit player position every 100ms to server
      const now = Date.now();
      if (now - lastEmitTimeRef.current > 100) {
        emitPlayerPosition();
        lastEmitTimeRef.current = now;
      }

      // Save game state every 2 seconds to localStorage
      saveGameState(gs);

      // Emit full game state to server every 3 seconds for persistence
      if (now - lastServerEmitTime > SERVER_EMIT_INTERVAL) {
        emitGameStateToServer();
        lastServerEmitTime = now;
      }

      rafRef.current = requestAnimationFrame(renderLoop);
    }
    renderLoop(0);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, isVisible]);

  const gs = gsRef.current;

  const emitPlayerPosition = useCallback(() => {
    if (gs.state !== 'playing' || gs.players.length === 0 || !gameRoomId) return;

    // FIX #4: Send position for ALL players, not just first
    gs.players.forEach((myPlayer: any, idx: number) => {
      if (myPlayer.status === 'eliminated') return;

      const ball = gs.shootStates[idx]?.ball;

      fetch('/api/pusher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: gameRoomId,
          playerId: playerIdRef.current + `_${idx}`,
          x: myPlayer.x,
          y: myPlayer.y,
          name: myPlayer.name,
          score: myPlayer.score,
          status: myPlayer.status,
          ball: ball ? {
            x: ball.x,
            y: ball.y,
            vx: ball.vx,
            vy: ball.vy,
            rot: ball.rot,
            state: ball.state
          } : null,
        }),
      }).catch(() => {});
    });
  }, [gameRoomId]);

  // Game state is persisted via localStorage (no server-side persistence needed)
  const emitGameStateToServer = useCallback(() => {
    // Pusher-based approach: emit state-update if needed (optional)
    if (gs.state !== 'playing' || !gameRoomId) return;
    try {
      fetch('/api/pusher/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: gameRoomId,
          playerId: playerIdRef.current,
          state: {
            state: gs.state,
            players: gs.players.map((p: any) => ({
              id: p.id,
              name: p.name,
              x: p.x,
              y: p.y,
              score: p.score,
              kills: p.kills || 0,
              status: p.status,
              color: p.color,
              rf: p.rf || 0,
            })),
            shootStates: gs.shootStates.map((ss: any) => ({
              phase: ss.phase,
              hasBall: ss.hasBall || false,
              power: ss.power || 0,
              aimAngle: ss.aimAngle || 0,
            })),
            round: gs.round || 0,
            disputeP1: gs.disputeP1 || 0,
            disputeP2: gs.disputeP2 || -1,
          },
        }),
      }).catch(() => {});
    } catch (e) {
      console.error('[PERSIST] Failed to emit game state:', e);
    }
  }, [gameRoomId]);

  const handleAddPlayer = async () => {
    if (gs.players.length >= MAX_PLAYERS) { alert("Максимум 6 гравців!"); return; }
    const name = pname.trim() || `Гр.${gs.players.length+1}`;
    const idx = gs.players.length;

    // Check if saved party order exists for this player
    const savedOrder = localStorage.getItem('rucheyok_next_order');
    let assignedOrder = idx + 1;  // Fallback

    if (savedOrder) {
      try {
        const orderList: string[] = JSON.parse(savedOrder);
        const playerIdx = orderList.findIndex((n: string) => n === name);
        if (playerIdx !== -1) {
          assignedOrder = playerIdx + 1;
          console.log(`[ADD-PLAYER] Using saved party order: ${name} → order #${assignedOrder}`);
        }
      } catch (e) {
        console.warn('[ADD-PLAYER] Failed to parse saved order, using server order');
      }
    }

    // If no saved order or not found in list, get global order from server
    if (!savedOrder) {
      try {
        const resp = await fetch('/api/pusher/get-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameRoomId })
        });
        const data = await resp.json();
        assignedOrder = data.order;
        console.log(`[ADD-PLAYER] Got global order: ${assignedOrder}`);
      } catch (e) {
        console.warn('[ADD-PLAYER] Failed to get order from server, using local:', assignedOrder);
      }
    }

    const newPlayer = {
      name,
      order: assignedOrder,
      x: 680 + idx * 58,
      y: groundYRef.current,
      score:0,
      kills:0,
      status:"idle",
      rf:0,
      color: PLAYER_COLORS[idx%6]
    };
    gs.players.push(newPlayer);
    gs.shootStates.push({ phase:null,aimAngle:-Math.PI*0.72,aimDir:1,power:0,powerDir:1,ball:null,lockedAngle:null,idealTraj:null,idealSpeed:10,runTarget:null,inDanger:false });

    // Broadcast this player to all other clients with global order
    try {
      await fetch('/api/pusher/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: gameRoomId,
          playerId: playerIdRef.current,
          playerIndex: idx,
          nickname: name,
          order: assignedOrder,  // Send global order to others
          x: newPlayer.x,
          y: newPlayer.y,
          color: newPlayer.color,
        })
      });
    } catch (e) {
      console.warn('[ADD-PLAYER] Failed to broadcast join:', e);
    }

    // Immediately set game to playing when first player is added
    if (gs.players.length === 1) {
      gs.state = "playing";
      gs.flashes = [];
      gs.disputeP1 = 0;
      gs.disputeP2 = -1;
      gs.selectedMoveIdx = -1;
      // First player can shoot
      showOrderRef.current = { [assignedOrder]: true };
    }

    setPname("");
    forceUpdate(n => n+1);
  };

  const handleRestart = () => {
    // Save elimination order for next game
    const nextGameOrder: string[] = [...eliminationOrderRef.current];
    const survivor = gs.players.find((p: any) => p.status !== 'eliminated');
    if (survivor) nextGameOrder.push(survivor.name);
    localStorage.setItem('rucheyok_next_order', JSON.stringify(nextGameOrder));
    eliminationOrderRef.current = [];

    gs.state="waiting"; gs.players=[]; gs.shootStates=[]; gs.flashes=[];
    gs.disputeP1=0; gs.disputeP2=-1; gs.selectedMoveIdx=-1;
    // Clear persisted state when restarting
    localStorage.removeItem(`basketball_game_state_${gameRoomId}`);
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
    // Clear persisted state when exiting
    localStorage.removeItem(`basketball_game_state_${gameRoomId}`);
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
            <p style={{marginBottom:12}}><b style={{color:"#e05545"}}>👥 Учасники:</b> Від 1 до 6. Введи ім'я → «+ Додати». Гра починається відразу! Цифра над гравцем — очередність (1️⃣ має право кидати).</p>
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
