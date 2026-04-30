"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { PowerMeterSystem } from "@/lib/game/powerMeterSystem";
import { createMeterElement, hideMeter, showAccuracyFeedback } from "@/lib/game/powerMeterUI";
import {
  initializeFirebase,
  initializeRoom,
  joinGame,
  updatePlayerPosition,
  updateBall,
  updateScore,
  leaveGame,
  listenToPlayers,
  listenToBall,
  computeTrajectoryHash,
} from "@/lib/firebase-game";
import { ref, get, remove, set } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import {
  stepPhysics,
  computeRimCollision,
  computeBackboardCollision,
  computeFloorBounce,
  simulateTrajectory,
  PHYSICS_CONSTANTS,
  integratePhysics,
  checkAllCollisions,
  checkGoalEntry,
  checkGateScoring,
  computeIdealVelocity,
  sweepSphereVsSphere,
  type PhysicsConstantsM,
} from "./basketball-physics-engine";

interface RucheekGameCanvasProps {
  isVisible: boolean;
  userName?: string;
  userPhone?: string;
  gameRoomId?: string;
}

const PLAYER_COLORS = ["#4fc3f7","#81c784","#ffb74d","#f06292","#ce93d8","#80cbc4"];
const MAX_PLAYERS = 6;

// 🏀 RUCHEEK: 6 permanent fixed positions (X in original 860x624 coordinates)
// Y is always groundYRef.current (scales with canvas size)
// Each position is always at the same spot. Players occupy positions based on server order.
const QUEUE_POSITIONS = [
  { x: 480 },  // POSITION #1 — always this X
  { x: 560 },  // POSITION #2 — always this X
  { x: 640 },  // POSITION #3 — always this X
  { x: 720 },  // POSITION #4 — always this X
  { x: 800 },  // POSITION #5 — always this X
  { x: 860 },  // POSITION #6 — always this X
];

// ✅ GHOST FIX (4-та линия защиты): Нормализация playerId
// Удаляет Pusher суфиксы (_sub_X, _session_Y, _idx) для корректного сравнения
function normalizePlayerId(id: string): string {
  // Сначала удаляем известные Pusher суфиксы
  const withoutSub = id.split('_sub_')[0];
  const withoutSession = withoutSub.split('_session_')[0];

  // Удаляем суффикс _${idx} (добавляется в emitPlayerPosition, строка 2655)
  // Паттерн: "baseid_0", "baseid_1" и т.д.
  const withoutIdx = withoutSession.replace(/_(\d+)$/, '');

  // Если в ID 4+ части и 3-я часть НЕ число (timestamp) → это суффикс
  const parts = withoutIdx.split('_');
  if (parts.length >= 4 && parts[2] && !parts[2].match(/^\d+$/)) {
    // Формат: player_timestamp_randomString_suffix → берем первые 3 части
    return parts.slice(0, 3).join('_');
  }

  return withoutIdx;
}

export default function RucheekGameCanvas({ isVisible, userName = "", userPhone = "", gameRoomId = "general" }: RucheekGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pnameRef = useRef<HTMLInputElement>(null);
  const firebaseUnsubscribeRef = useRef<Array<() => void>>([]);
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
  const pStartRef = useRef<number>(0);  // 🏀 RUCHEEK: Starting X position for queue
  const pStepRef = useRef<number>(0);   // 🏀 RUCHEEK: Gap between players in queue
  const eliminationOrderRef = useRef<string[]>([]);
  const markerPosRef = useRef<number>(0);
  const markerDirRef = useRef<number>(1);
  const lastPositionSendRef = useRef<number>(0);  // 🔥 БАГ 1: Throttle for player position updates (50ms)
  const lastBallSendRef = useRef<number>(0);      // 🔥 БАГ 2: Throttle for ball updates (50ms)
  const lastSentPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 }); // ⏱️ Для проверки расстояния
  const MOVE_THRESHOLD = 5; // Отправлять только если движение > 5 пиксели

  // Power Meter System refs and state
  const powerMeterRef = useRef<PowerMeterSystem | null>(null);
  const meterElementRef = useRef<HTMLDivElement | null>(null);
  const [meterVisible, setMeterVisible] = useState(false);
  const [greenLinePosition, setGreenLinePosition] = useState(180);

  useEffect(() => { setMounted(true); }, []);

  // Initialize Firebase connection
  useEffect(() => {
    if (!mounted) return;


    let isActive = true;

    const initializeFirebaseGame = async () => {
      try {
        // Initialize Firebase
        initializeFirebase();

        // Initialize room
        await initializeRoom(gameRoomId);

        if (!isActive) return;

        // 🔥 ВИПРАВЛЕННЯ: Очистити застарілих гравців з Firebase перед входом
        // 🔥 ЯДЕРНА ОЧИСТКА: Видалити ВСІХ гравців + переініціалізувати кімнату
        const cleanupOldPlayers = async () => {
          try {
            const db = getFirebaseDatabase();
            const playersRef = ref(db, `games/${gameRoomId}/players`);
            // Видаляємо ВСІХ гравців назавжди (очистка DB)
            await remove(playersRef);
          } catch (err) {
            console.warn('[⚠️ CLEANUP] Помилка при ядерній очистці:', err);
          }
        };

        await cleanupOldPlayers();

        // Очистити локальний стан
        remotePlayersRef.current.clear();

        // Clear old game state from localStorage
        localStorage.removeItem(`basketball_game_state_${gameRoomId}`);

        // Переініціалізувати кімнату (скинути球, game state)
        await initializeRoom(gameRoomId);

        // Join the game
        await joinGame(gameRoomId, playerIdRef.current, userName || 'Player', Math.floor(Math.random() * MAX_PLAYERS));

        if (!isActive) return;

        // Listen to players
        const unsubscribePlayers = listenToPlayers(gameRoomId, (players: any[]) => {
          if (!isActive) return;

          // 🔥 ВИПРАВЛЕННЯ: ПОВНА ПЕРЕСБОРКА MAP — видаляємо ВСІх кого немає в Firebase
          const newMap = new Map<string, any>();

          players.forEach((player: any) => {
            const playerId = player.id;
            if (!playerId) return;
            if (playerId === playerIdRef.current) return; // Skip self

            // Skip eliminated players
            if (player.status === 'eliminated' || player.status === 'dead') return;

            // Skip inactive players
            const lastUpdate = player.lastUpdate || 0;
            const now = Date.now();
            const INACTIVITY_THRESHOLD = 10000;
            if (lastUpdate > 0 && now - lastUpdate > INACTIVITY_THRESHOLD) return;

            // Determine position — use QUEUE_POSITIONS for fixed layout
            const playerIdx = player.playerIndex || 0;
            const safeIdx = Math.min(playerIdx, QUEUE_POSITIONS.length - 1);
            const queuePos = QUEUE_POSITIONS[safeIdx];
            const posX: number = queuePos.x;
            const posY: number = groundYRef.current;

            const newPlayer = {
              sessionId: playerId,
              socketId: playerId,
              basePlayerId: playerId,
              playerIndex: player.playerIndex || 0,
              order: player.playerIndex || 0,
              x: posX,
              y: posY,
              status: player.status || 'alive',
              nickname: player.nickname || 'Player',
              name: player.nickname || 'Player',
              score: player.score || 0,
            };

            // Check if this is a new player
            const existingPlayer = remotePlayersRef.current.get(playerId);
            if (!existingPlayer) {
              gsRef.current.flashes.push({
                text: `✅ ${player.nickname} присоединився!`,
                x: 400,
                y: 50,
                color: '#88ff88',
                alpha: 1,
                dy: 0,
              });
            }

            newMap.set(playerId, newPlayer);
          });

          // 🔥 ЗАМІНЮЄМО весь Map одразу — старі гравці (привиди) зникають автоматично
          remotePlayersRef.current = newMap;
          forceUpdate(x => x + 1);
        });

        // Listen to ball
        const unsubscribeBall = listenToBall(gameRoomId, (ball: any) => {
          if (!isActive) return;

          if (gsRef.current && ball) {
            // 🔴 КРИТИЧНО: НЕ оновлювати remoteBall якщо це власний м'яч
            if (ball.ownerId === playerIdRef.current) {
              return; // ігнорувати власний кидок
            }

            // 🔴 КРИТИЧНО: НЕ оновлювати remoteBall якщо локальний гравець (індекс 0) кидає
            const localPlayer = gsRef.current.players[0];
            const localShootState = gsRef.current.shootStates[0];
            const isLocalBallFlying = localShootState?.ball?.state === 'flying' ||
                                     localShootState?.ball?.state === 1 ||
                                     localShootState?.phase === 'flying';

            if (isLocalBallFlying) {
              return; // ігнорувати Firebase під час локального кидку
            }

            // Перевірити hash траєкторії для детектування десинхрону
            const receivedHash = ball.trajectoryHash;
            if (receivedHash && gsRef.current.shootStates[0]?.ball) {
              const localHash = computeTrajectoryHash(
                gsRef.current.shootStates[0].ball.x,
                gsRef.current.shootStates[0].ball.y,
                gsRef.current.shootStates[0].ball.vx || 0,
                gsRef.current.shootStates[0].ball.vy || 0
              );
              if (receivedHash !== localHash && ball.state === 'flying') {
                console.warn('[⚠️ DESYNC] Trajectory mismatch!', { received: receivedHash, local: localHash });
                // Прийняти стан від сервера (Firebase = source of truth)
              }
            }

            gsRef.current.remoteBall = {
              x: ball.x,
              y: ball.y,
              vx: ball.vx,
              vy: ball.vy,
              rotation: ball.rotation || 0,
              state: ball.state || 'waiting',
              isRemote: true,
              trajectoryHash: receivedHash,
            };
            forceUpdate(n => n + 1);
          }
        });

        firebaseUnsubscribeRef.current.push(unsubscribePlayers, unsubscribeBall);
      } catch (err) {
        console.error('[🔴 ERROR] Firebase initialization failed:', err);
      }
    };

    initializeFirebaseGame();

    return () => {
      isActive = false;
      firebaseUnsubscribeRef.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (e) {
          console.error('Error unsubscribing:', e);
        }
      });
      firebaseUnsubscribeRef.current = [];

      // Leave game
      leaveGame(gameRoomId, playerIdRef.current).catch(() => {});
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
    const SCALE = Math.min(W, H) / 15.0;
    // Real gravity: 9.81 m/s² = 0.095 px/frame² at 35px=1m, 60fps
    // Гравітація: зменшена на 15% для красивішої параболи (0.12 * 0.85 = 0.102)
    const G = 0.102;
    // Restitution coefficients for realistic bouncing
    const RESTITUTION_RIM = 0.55;      // дужка — средний отскок
    const RESTITUTION_BACKBOARD = 0.45; // щит — мягкий отскок
    const RESTITUTION_FLOOR = 0.35;     // пол — гасит движение

    const POLE_X = 12*scaleX, ARM_X = 52*scaleX;
    const BOARD_X = 57*scaleX, BOARD_W = 10*scaleX;
    const BOARD_TOP = 189*scaleY, BOARD_BOT = 292*scaleY;
    const BOARD_FACE = BOARD_X + BOARD_W;
    const HOOP_X = 110*scaleX, HOOP_Y = 307*scaleY;
    const HOOP_R = 27*scaleX;
    const HOOP_RADIUS = 22*scaleX;
    const P_START = W * 0.65, P_STEP = W * 0.07;
    // 🏀 RUCHEEK: Save position params to refs for use in handleAddPlayer
    pStartRef.current = P_START;
    pStepRef.current = P_STEP;
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
      });
    }

    // Ball physics constants
    const BALL_RADIUS = 12 * scaleX;
    // 🚨 ВИДАЛЕНО: const HOOP_RADIUS = 22 * scaleX; — це дублює HOOP_R на рядку 383
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
      // ВИПРАВЛЕННЯ: Розширений радіус з 12px до 30px для кращої гібелості
      if (Math.hypot(mx - px, my - (py - 54*scaleY)) <= 30*scaleX) return true;
      if (mx >= px - 15*scaleX && mx <= px + 15*scaleX && my >= py - 50*scaleY && my <= py - 10*scaleY) return true;
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
    function calculateIdealPowerByDistance(playerX: number, playerY: number, maxDist: number = realMaxDistance): number {
      const distToHoop = Math.hypot(HOOP_X - playerX, HOOP_Y - playerY);
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

    function calculateIdealMarkerPos(
      px: number, py: number,
      hx: number, hy: number,
      angleDeg: number
    ): number {
      const angleRad = Math.abs(angleDeg) * Math.PI / 180;
      const dx = hx - px;
      const dy = hy - py;
      const distToHoop = Math.hypot(dx, dy);
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const hoopAbove = hy < py;
      const denom = hoopAbove
        ? (absDy + absDx * (sinA / cosA))
        : (absDx * (sinA / cosA) - absDy);
      if (denom <= 0) return 0.5;
      const v0sq = (G * absDx * absDx) / (2 * cosA * cosA * denom);
      if (v0sq <= 0) return 0.5;
      const v0 = Math.sqrt(v0sq);
      const baseSpeed = 10 + (distToHoop / 500) * 8;
      const powerMultiplier = v0 / baseSpeed;
      const markerPos = (powerMultiplier - 0.3) / 1.7;
      return Math.max(0.05, Math.min(0.95, markerPos));
    }

    // Self-test: verify ideal marker reaches hoop for various player positions
    if (!(window as any).__sweetSpotTested) {
      (window as any).__sweetSpotTested = true;
      const testAngleDeg = 72; // Default aim angle in degrees
      const testPositions = [
        { px: P_START, py: P_START_Y, name: 'Default' },
        { px: P_START - P_STEP, py: P_START_Y, name: 'Player 2' },
        { px: P_START - 2 * P_STEP, py: P_START_Y, name: 'Player 3' }
      ];
      testPositions.forEach(pos => {
        const idealPos = calculateIdealMarkerPos(pos.px, pos.py, HOOP_X, HOOP_Y, testAngleDeg);
        const shotPower = idealPos * 200;
        const dist = Math.hypot(HOOP_X - pos.px, HOOP_Y - pos.py);
        const baseSpeed = 10 + (dist / 500) * 8;
        const pm = 0.3 + (shotPower / 200) * 1.7;
        const launchSpeed = baseSpeed * pm;
        const ar = testAngleDeg * Math.PI / 180;
        const vx0 = -Math.cos(ar) * launchSpeed;
        const vy0 = -Math.sin(ar) * launchSpeed;
        let bx = pos.px, by = pos.py, vx = vx0, vy = vy0;
        let closestDist = Infinity;
        for (let f = 0; f < 500; f++) {
          vy += G;
          bx += vx; by += vy;
          const d = Math.hypot(bx - HOOP_X, by - HOOP_Y);
          if (d < closestDist) closestDist = d;
          if (bx < HOOP_X - 50) break;
        }
        const status = closestDist < 30 ? '✅' : '❌';
      });
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

    // AUTOTEST: Тестування зеленої лінії та гарантії
    function autoTest() {

      // BUG 3 FIX PHASE 2: Test green line positions at different distances
      const testCases = [
        { name: 'Дальній (макс)', dist: realMaxDistance, expected: 175 },
        { name: 'Середній', dist: realMaxDistance * 0.6, expected: 108 },
        { name: 'Близький', dist: realMaxDistance * 0.25, expected: 45 }
      ];

      testCases.forEach(tc => {
        const line = (tc.dist / realMaxDistance) * 180;
        const ok = Math.abs(line - tc.expected) < 20;
      });

      let greenLineHits = 0;
      let greenLineScored = 0;

      // Симулюємо 10 бросків з різною accuracy
      for (let i = 0; i < 10; i++) {
        const accuracy = i < 5 ? 100 : Math.floor(Math.random() * 60);
        const isGreen = accuracy >= 95;

        if (isGreen) {
          greenLineHits++;
        } else {
        }
      }

      return greenLineHits;
    }

    // Запусти autoTest при завантаженні
    if (typeof window !== 'undefined' && !gs.autoTestRun) {
      autoTest();
      gs.autoTestRun = true;
    }

    function stepBall(b: any, dt_normalized: number) {
      if (b.state !== 'flying') return;
      const FIXED_DT = 1/120;

      if (b._accumulator === undefined) { b._accumulator = 0; b._physTick = 0; }

      const frameMs = dt_normalized * (1000/60);
      b._accumulator = Math.min(b._accumulator + frameMs/1000, 3 * FIXED_DT);

      const C: PhysicsConstantsM = {
        GRAVITY: 9.81, BALL_MASS: 0.623, BALL_RADIUS_M: 0.12,
        RIM_RADIUS_M: 0.6,  // Збільшено щоб відповідати HOOP_R=27px (вся 10px)
        RIM_TUBE_R_M: 0.023, NET_ZONE_DEPTH_M: 0.8,
        E_RIM: 0.82, MU_RIM: 0.25, Cd: 0.004, Cm: 0.000045, OMEGA_DECAY: 0.985,
        HOOP_X_M: HOOP_X / SCALE, HOOP_Y_M: HOOP_Y / SCALE,
        BOARD_X_M: BOARD_FACE / SCALE, BOARD_TOP_M: BOARD_TOP / SCALE,
        BOARD_BOT_M: BOARD_BOT / SCALE, GROUND_Y_M: GY / SCALE,
        POLE_X_M: POLE_X / SCALE, // Стійка для колізії
      };

      // 🔴 КРИТИЧНО: Обмеження на кількість фізичних ітерацій за кадр
      // При лагу (dt > 50ms) accumulator може накопичити 5+ FIXED_DT
      // Без обмеження м'яч телепортується на 5+ кроків одночасно!
      const MAX_PHYSICS_STEPS = 5;
      let physicsSteps = 0;

      while (b._accumulator >= FIXED_DT && b.state === 'flying' && physicsSteps < MAX_PHYSICS_STEPS) {
        physicsSteps++;
        integratePhysics(b, FIXED_DT, C);
        checkAllCollisions(b, FIXED_DT, C);
        checkGateScoring(b, C);
        b._physTick++;
        b._accumulator -= FIXED_DT;
      }

      if (b.rimHitTimer > 0) b.rimHitTimer--;
      b.x = b._x_m * SCALE;
      b.y = b._y_m * SCALE;

      if (b.state === 'missed' && !b.outcome) {
        if (b.rimContacts === 0) {
          b.outcome = 'airball';
        } else {
          b.outcome = (b.rimContactMask & 0b001) ? 'front_rim_out' : 'back_rim_out';
        }
      }
    }


    function update(dt: number) {
      if (gs.state !== 'playing') return;
      for (let i = 0; i < gs.players.length; i++) {
        const p = gs.players[i], ss = gs.shootStates[i];
        if (p.status === 'eliminated') continue;
        if (ss.phase === 'aiming') {
          ss.aimAngle += ss.aimDir * 0.022;
          if (ss.aimAngle > -0.08) { ss.aimAngle = -0.08; ss.aimDir = -1; }
          if (ss.aimAngle < -Math.PI * 0.75) { ss.aimAngle = -Math.PI * 0.75; ss.aimDir = 1; }
        }
        if (ss.phase === 'charging') {
          // Oscillate distance indicator marker with arcade-style difficulty
          const distToHoop = Math.hypot(HOOP_X - (p.x - 15*scaleX), HOOP_Y - (p.y - 55*scaleY));
          const maxDist = Math.hypot(W, H);
          const distRatio = Math.min(distToHoop / maxDist, 1);

          const MARKER_SPEED = 0.65 + distRatio * 0.45;
          const FIXED_DT = 1 / 60;
          markerPosRef.current += markerDirRef.current * MARKER_SPEED * FIXED_DT;
          if (markerPosRef.current >= 1) { markerPosRef.current = 1; markerDirRef.current = -1; }
          if (markerPosRef.current <= 0) { markerPosRef.current = 0; markerDirRef.current = 1; }
        }
        if (ss.phase === 'flying' && ss.ball) {
          stepBall(ss.ball, dt);
          // 🔥 БАГ 2 ВИПРАВЛЕННЯ: Одразу відправити стан м'яча в Firebase (throttle 50ms)
          if (i === 0) {
            const now = Date.now();
            if (now - lastBallSendRef.current > 50 && ss.ball.state === 'flying') {
              lastBallSendRef.current = now;
              // Обчислити hash траєкторії для детектування десинхрону
              const tHash = computeTrajectoryHash(ss.ball.x, ss.ball.y, ss.ball.vx || 0, ss.ball.vy || 0);
              // 🔴 КРИТИЧНО: Передати ownerId щоб listenToBall ігнорував власний кидок
              updateBall(gameRoomId, ss.ball.x, ss.ball.y, ss.ball.vx || 0, ss.ball.vy || 0, ss.ball.state || 1, tHash, playerIdRef.current)
                .catch(err => console.error('[🔴] Firebase ball update failed:', err));
            }
          }
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
          if (Math.abs(dx) > 4) {
            p.x += Math.sign(dx) * 3.5 * dt;
            // 🔥 БАГ 1 ВИПРАВЛЕННЯ: Одразу відправити оновлену позицію в Firebase (throttle 50ms)
            // ВАЖЛИВО: Тільки ЛОКАЛЬНИЙ гравець (i === 0) відправляє свою позицію!
            // Remote гравці отримуються від Firebase listener (лінія 168)
            if (i === 0) {
              const now = Date.now();
              if (now - lastPositionSendRef.current > 50) {
                lastPositionSendRef.current = now;
                updatePlayerPosition(gameRoomId, playerIdRef.current, p.x, p.y).catch(err =>
                  console.error('[🔴] Firebase position update failed:', err)
                );
              }
            }
          }
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

      // Bank shot indicator
      if (ss.ball?.hitBackboard) {
        flashText += ' 🏦 BANK!';
        if (ss.ball.outcome === 'bank') {
          flashColor = '#ff8800';  // Orange for bank shot
        }
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

      gs.netShake = true;
      gs.netShakeEnd = Date.now() + 700;
      ss.phase = null;
      ss.ball = null;
      ss.lockedAngle = null;
      ss.idealTraj = null;

      // 🏀 RUCHEEK GAME: ПОЛНАЯ ЛОГИКА ГОЛА И ВЫБИВАНИЯ
      // Правила:
      // 1. Забил → проверить есть ли выбиваемый (предыдущий с hasThrown=true)
      // 2. Если есть → выбить (splice), передать право, проверить победу
      // 3. Если нет → просто идёт в хвост, право к следующему

      if (p.hasActiveRight === true) {
        // Найти предыдущего игрока (у кого был мяч)
        let prevIdx = -1;
        for (let i = 1; i < gs.players.length; i++) {
          const checkIdx = (idx - i + gs.players.length) % gs.players.length;
          prevIdx = checkIdx;
          break;
        }

        const prevPlayer = prevIdx !== -1 ? gs.players[prevIdx] : null;

        // ПРОВЕРКА: выбивать только если предыдущий выпустил мяч
        if (prevPlayer && prevPlayer.hasThrown === true) {
          // 💥 ВЫБИВАНИЕ: предыдущий бросил но не попал → ИСЧЕЗАЕТ
          p.goalCount = (p.goalCount || 0) + 1;

          addFlash(`💥 ${prevPlayer.name} ВИБУВ!`, prevPlayer.x, prevPlayer.y - 80*scaleY, '#ff4444');
          eliminationOrderRef.current.push(prevPlayer.name);

          // Удалить из массива
          gs.players.splice(prevIdx, 1);
          gs.shootStates.splice(prevIdx, 1);

          // Пересчитать idx текущего игрока после splice
          const newShooterIdx = gs.players.findIndex((pl: any) => pl === p);

          // Проверить победу ДО перемещения в хвост
          if (gs.players.length === 1) {
            // ТОЛЬКО ОДИН ОСТАЛСЯ - ПОБЕДА
            gs.state = 'finished';
            addFlash(`🏆 ${p.name} ПЕРЕМОЖЕЦЬ!`, p.x, p.y - 150*scaleY, '#ffff00');
            fetch('/api/players/add-hp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerId: p.id || p.name,
                hp: 10,
                reason: 'Rucheek game win',
              }),
            }).catch(() => {});
            return;
          }

          // Игра продолжается - забивший идёт в хвост
          const w = gs.players.splice(newShooterIdx, 1)[0];
          const sw = gs.shootStates.splice(newShooterIdx, 1)[0];
          if (w && sw) {
            w.hasThrown = false;
            w.hasActiveRight = false;
            sw.phase = null;
            gs.players.push(w);
            gs.shootStates.push(sw);
          }

          // Право к первому в очереди
          if (gs.players.length > 0) {
            gs.players[0].hasActiveRight = true;
            gs.players[0].hasThrown = false;
          }

        } else {
          // ✅ НИКОГО НЕ ВЫБИВАЕМ - забивший просто идёт в хвост
          p.goalCount = (p.goalCount || 0) + 1;

          p.hasThrown = false;
          p.hasActiveRight = false;

          // Переместить в хвост (если не первый)
          if (idx !== 0) {
            const w = gs.players.splice(idx, 1)[0];
            const sw = gs.shootStates.splice(idx, 1)[0];
            if (w && sw) {
              sw.phase = null;
              gs.players.push(w);
              gs.shootStates.push(sw);
            }
          } else {
            // Первый уже обрабатывается ниже в shift/push
          }

          // Право к первому в очереди
          if (gs.players.length > 0) {
            gs.players[0].hasActiveRight = true;
            gs.players[0].hasThrown = false;
          }
        }
      }

      // DEBUG: Log scoring event with distance, accuracy, and hit type

      // ✅ MULTIPLAYER: Emit shot completion to server via Firebase
      if (idx === 0) {
        const ss = gs.shootStates[0];
        updateScore(gameRoomId, playerIdRef.current, (p.score || 0) + 1).catch(err =>
          console.error('[🔴] Firebase shot score failed:', err)
        );
      }

      if (idx === gs.disputeP2 && gs.disputeP1 >= 0 && gs.disputeP1 < gs.players.length) {
        const p1ph = gs.shootStates[gs.disputeP1]?.phase;
        const dangerPhases = ['auto_run', 'pickup_wait', 'flying', 'aiming', 'charging'];
        if (dangerPhases.includes(p1ph) || gs.shootStates[gs.disputeP1]?.inDanger) {
          addFlash('💀 ВИБИТО!', gs.players[gs.disputeP1]?.x || 300, GY - 130*scaleY, '#ff4444');
          if (gs.players[gs.disputeP1]) gs.players[gs.disputeP1].status = 'eliminated';
          if (gs.players[idx]) gs.players[idx].kills = (gs.players[idx].kills || 0) + 1;

          // 🟢 ОТПРАВИТЬ СТАТУС НА СЕРВЕР VIA FIREBASE
          const eliminatedPlayerId = gs.players[gs.disputeP1]?.playerId;
          if (eliminatedPlayerId) {
            updatePlayerPosition(gameRoomId, eliminatedPlayerId, gs.players[gs.disputeP1]?.x || 0, gs.players[gs.disputeP1]?.y || 0).catch(() => {});
          }
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
          w.status = 'running';
          w.hasThrown = false;  // 🏀 RUCHEEK: Reset hasThrown when player goes to tail
          w.hasActiveRight = false;  // Clear active right (will be set by next player)
          sw.phase = 'manual_run';
          sw.inDanger = false;
          gs.players.push(w);
          gs.shootStates.push(sw);
          gs.disputeP1 = 0;
          gs.disputeP2 = -1;

          // 🏀 RUCHEEK: NEW FIRST PLAYER (idx=0) GETS ACTIVE RIGHT
          if (gs.players.length > 0 && !gs.players[0].isEliminated) {
            gs.players[0].hasActiveRight = true;
          }

          // 🏀 RUCHEEK: Update ONLY positions, NOT playerNumber (playerNumber is permanent!)
          gs.players.forEach((p2: any, i: number) => {
            const pos = QUEUE_POSITIONS[i];
            p2.x = pos.x;
            p2.y = GY;  // ✅ USE REAL GROUND Y
            // 🏀 ВАЖНО: playerNumber НИКОГДА не меняется! Это постоянный номер игрока
          });
          // Update run target to new last player position
          const lastPos = QUEUE_POSITIONS[Math.min(gs.players.length - 1, QUEUE_POSITIONS.length - 1)];
          sw.runTarget = { x: lastPos.x, y: GY };
        }
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
        // Add walk cycle leg animation
        const walkCycle = Math.sin(Date.now() / 150) * 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x - 11*scaleX + walkCycle * 5*scaleX, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x + 11*scaleX - walkCycle * 5*scaleX, y);
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
        // Add walk cycle leg animation
        const walkCycleIdle = Math.sin(Date.now() / 150) * 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x - 10*scaleX + walkCycleIdle * 4*scaleX, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - 18*scaleY);
        ctx.lineTo(x + 10*scaleX - walkCycleIdle * 4*scaleX, y);
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
      // 🚨 РОЗШИРЕННЯ: Стрілка вдвічі довша (400px для кращої видимості)
      const ex = hx + Math.cos(angle) * 400*scaleX, ey = hy + Math.sin(angle) * 400*scaleY;
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
      const distFraction = distToHoop / realMaxDistance;
      const idealPower = calculateIdealPowerByDistance(px, py, realMaxDistance);
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
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // ── POLE (RED VERTICAL STANCHION) ───
      ctx.strokeStyle = '#cc2200';
      ctx.lineWidth = 6*scaleX;
      ctx.beginPath();
      ctx.moveTo(POLE_X, GY);
      ctx.lineTo(POLE_X, 209*scaleY);
      ctx.stroke();

      // ── ARM (RED HORIZONTAL SUPPORT) ───
      ctx.strokeStyle = '#cc2200';
      ctx.lineWidth = 5*scaleX;
      ctx.beginPath();
      ctx.moveTo(POLE_X, 209*scaleY);
      ctx.lineTo(ARM_X, 209*scaleY);
      ctx.stroke();

      // ── BACKBOARD (WITH 3D PERSPECTIVE) ───
      // Щит слегка повёрнут — правый край чуть смещён вниз (перспектива)
      // Деревянная рамка (тёмно-коричневая)
      ctx.beginPath();
      ctx.moveTo(BOARD_X - 2*scaleX, BOARD_TOP - 2*scaleY);
      ctx.lineTo(BOARD_X + BOARD_W + 2*scaleX, BOARD_TOP);
      ctx.lineTo(BOARD_X + BOARD_W + 2*scaleX, BOARD_BOT + 4*scaleY);
      ctx.lineTo(BOARD_X - 2*scaleX, BOARD_BOT + 2*scaleY);
      ctx.closePath();
      ctx.fillStyle = '#7B5010';
      ctx.fill();

      // Лицевая панель щита (фиолетово-прозрачная)
      ctx.beginPath();
      ctx.moveTo(BOARD_X + 1*scaleX, BOARD_TOP + 3*scaleY);
      ctx.lineTo(BOARD_X + BOARD_W, BOARD_TOP + 2*scaleY);
      ctx.lineTo(BOARD_X + BOARD_W, BOARD_BOT + 1*scaleY);
      ctx.lineTo(BOARD_X + 1*scaleX, BOARD_BOT);
      ctx.closePath();
      ctx.fillStyle = 'rgba(100,80,140,0.75)';
      ctx.fill();
      ctx.strokeStyle = '#5a3a08';
      ctx.lineWidth = 1.5 * scaleX;
      ctx.stroke();

      // Блик на щите (левая светлая полоса)
      ctx.beginPath();
      ctx.moveTo(BOARD_X + 1*scaleX, BOARD_TOP + 3*scaleY);
      ctx.lineTo(BOARD_X + BOARD_W*0.35, BOARD_TOP + 2*scaleY);
      ctx.lineTo(BOARD_X + BOARD_W*0.35, BOARD_BOT + 1*scaleY);
      ctx.lineTo(BOARD_X + 1*scaleX, BOARD_BOT);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();

      // Прицельный прямоугольник внутри щита (золотой)
      const aimL = BOARD_X + BOARD_W*0.15;
      const aimR = BOARD_X + BOARD_W*0.90;
      const aimT = BOARD_TOP + (BOARD_BOT - BOARD_TOP) * 0.30;
      const aimB = BOARD_TOP + (BOARD_BOT - BOARD_TOP) * 0.65;
      ctx.beginPath();
      ctx.moveTo(aimL, aimT);
      ctx.lineTo(aimR, aimT + 1*scaleY);
      ctx.lineTo(aimR, aimB + 2*scaleY);
      ctx.lineTo(aimL, aimB + 1*scaleY);
      ctx.closePath();
      ctx.strokeStyle = '#C8A84B';
      ctx.lineWidth = 2 * scaleX;
      ctx.stroke();

      // ── ПЕРЕМЕННЫЕ ПЕРСПЕКТИВЫ ───────────────────
      const RIM_RX = HOOP_R;
      const RIM_RY = HOOP_R * 0.28;
      const SHX = sh * 0.3;
      const SHY = sh * 0.15;
      const cx = HOOP_X + SHX;
      const cy = HOOP_Y + SHY;

      // ── КРЕПЛЕНИЕ — ГОРИЗОНТАЛЬНАЯ ПОЛКА ───────
      const rimRightX = cx + RIM_RX + SHX;
      const bracketY = cy + SHY;

      // Нижняя горизонтальная труба (основное крепление)
      ctx.beginPath();
      ctx.moveTo(BOARD_FACE, bracketY);
      ctx.lineTo(rimRightX, bracketY);
      ctx.strokeStyle = '#6B4010';
      ctx.lineWidth = 5 * scaleX;
      ctx.stroke();

      // Верхняя труба параллельно (создаёт объём полки)
      ctx.beginPath();
      ctx.moveTo(BOARD_FACE, bracketY - 6*scaleY);
      ctx.lineTo(rimRightX, bracketY - 6*scaleY);
      ctx.strokeStyle = '#8B5518';
      ctx.lineWidth = 3 * scaleX;
      ctx.stroke();

      // Заливка между трубами — объёмная полка
      ctx.beginPath();
      ctx.moveTo(BOARD_FACE, bracketY - 6*scaleY);
      ctx.lineTo(rimRightX, bracketY - 6*scaleY);
      ctx.lineTo(rimRightX, bracketY);
      ctx.lineTo(BOARD_FACE, bracketY);
      ctx.closePath();
      ctx.fillStyle = '#7B4A14';
      ctx.fill();

      // Вертикальная пластина у щита
      ctx.beginPath();
      ctx.rect(BOARD_FACE, bracketY - 10*scaleY,
               5*scaleX, 14*scaleY);
      ctx.fillStyle = '#9B5A1A';
      ctx.fill();
      ctx.strokeStyle = '#6B3A0A';
      ctx.lineWidth = 1 * scaleX;
      ctx.stroke();

      // ── 1. ЗАДНЯЯ ДУГА (верхняя, рисуется ДО сетки) ──────────
      const RIM_TUBE = 5 * scaleX;

      // Тень
      ctx.beginPath();
      ctx.ellipse(cx, cy + 1.5*scaleY, RIM_RX, RIM_RY, 0, Math.PI, 0);
      ctx.strokeStyle = 'rgba(60,0,0,0.6)';
      ctx.lineWidth = RIM_TUBE * 2.0;
      ctx.stroke();
      // Тёмный слой
      ctx.beginPath();
      ctx.ellipse(cx, cy, RIM_RX, RIM_RY, 0, Math.PI, 0);
      ctx.strokeStyle = '#8B1500';
      ctx.lineWidth = RIM_TUBE * 1.3;
      ctx.stroke();
      // Основной цвет
      ctx.beginPath();
      ctx.ellipse(cx, cy, RIM_RX, RIM_RY, 0, Math.PI, 0);
      ctx.strokeStyle = '#B82010';
      ctx.lineWidth = RIM_TUBE * 0.9;
      ctx.stroke();

      // ── 2. СЕТКА — трапеция, 3 цвета ─────────────────────────
      // Calculate net swing displacement
      let netSwing = 0;
      if (gs.netSwing.type) {
        const elapsed = Date.now() - gs.netSwing.startTime;
        const progress = Math.min(1, elapsed / gs.netSwing.duration);

        if (gs.netSwing.type === 'DIRECT') {
          const oscillations = 3;
          const angle = progress * oscillations * Math.PI * 2;
          netSwing = Math.sin(angle) * 15 * scaleY * Math.cos(progress * Math.PI);
        } else if (gs.netSwing.type === 'ARC') {
          const oscillations = 2;
          const angle = progress * oscillations * Math.PI * 2;
          netSwing = Math.sin(angle) * 20 * scaleY * Math.cos(progress * Math.PI);
        } else if (gs.netSwing.type === 'SWISH') {
          netSwing = Math.sin(progress * Math.PI * 2) * 8 * scaleY;
        }
        if (progress >= 1) gs.netSwing.type = null;
      }

      const netBottom = cy + HOOP_R * 1.5 + (netSwing || 0) * scaleY;
      const NET_TOP_HALF = RIM_RX * 0.95;   // верх широкий
      const NET_BOT_HALF = RIM_RX * 0.30;   // низ узкий (трапеция)

      // Вертикальные нити — 11 штук по эллипсу
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const topX = cx + (t - 0.5) * 2 * NET_TOP_HALF;
        const topY = cy + RIM_RY * Math.cos(Math.PI * t) * 0.3;
        const botX = cx + (t - 0.5) * 2 * NET_BOT_HALF;
        const botY = netBottom;

        // Цвет нити — белый→синий→красный снизу
        const relPos = i / 10;
        let netColor;
        if (relPos < 0.15 || relPos > 0.85) {
          netColor = 'rgba(200,200,255,0.82)'; // края светлее
        } else {
          netColor = 'rgba(225,215,255,0.88)'; // центр ярче
        }

        ctx.beginPath();
        ctx.strokeStyle = netColor;
        ctx.lineWidth = 1.1 * scaleX;
        ctx.moveTo(topX, topY);
        // Контрольная точка — нити слегка провисают
        const cpx = topX * 0.6 + botX * 0.4;
        const cpy = topY + (botY - topY) * 0.5;
        ctx.quadraticCurveTo(cpx, cpy, botX, botY);
        ctx.stroke();
      }

      // Горизонтальные кольца сетки — 5 рядов
      const netColors = [
        'rgba(225,215,255,0.72)',  // ряд 1 белый
        'rgba(210,200,255,0.68)',  // ряд 2 белый
        'rgba(180,180,255,0.72)',  // ряд 3 белый-синий
        'rgba(80,80,220,0.78)',    // ряд 4 синий
        'rgba(200,50,50,0.82)',    // ряд 5 красный
      ];
      for (let j = 0; j < 5; j++) {
        const t = (j + 1) / 5;
        const rowY = cy + RIM_RY + (netBottom - cy - RIM_RY) * t;
        const rowHalfW = NET_TOP_HALF * (1 - t) + NET_BOT_HALF * t;
        const rowRY = RIM_RY * (1 - t * 0.75) * 0.25;
        ctx.beginPath();
        ctx.ellipse(cx, rowY, rowHalfW, Math.max(rowRY, 1*scaleY),
                    0, 0, Math.PI * 2);
        ctx.strokeStyle = netColors[j];
        ctx.lineWidth = (j >= 3 ? 1.2 : 0.9) * scaleX;
        ctx.stroke();
      }

      // ── 3. ПЕРЕДНЯЯ ДУГА (рисуется ПОСЛЕ сетки — поверх) ─────
      // Тень под передней дугой
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2.5*scaleY, RIM_RX, RIM_RY, 0, 0, Math.PI);
      ctx.strokeStyle = 'rgba(40,0,0,0.65)';
      ctx.lineWidth = RIM_TUBE * 2.2;
      ctx.stroke();
      // Тёмный слой
      ctx.beginPath();
      ctx.ellipse(cx, cy, RIM_RX, RIM_RY, 0, 0, Math.PI);
      ctx.strokeStyle = '#8B1500';
      ctx.lineWidth = RIM_TUBE * 1.6;
      ctx.stroke();
      // Средний тон
      ctx.beginPath();
      ctx.ellipse(cx, cy, RIM_RX, RIM_RY, 0, 0, Math.PI);
      ctx.strokeStyle = '#CC2200';
      ctx.lineWidth = RIM_TUBE * 1.2;
      ctx.stroke();
      // Яркий верхний слой
      ctx.beginPath();
      ctx.ellipse(cx, cy, RIM_RX, RIM_RY, 0, 0, Math.PI);
      ctx.strokeStyle = '#FF3311';
      ctx.lineWidth = RIM_TUBE * 0.7;
      ctx.stroke();
      // Блик на передней дуге
      ctx.beginPath();
      ctx.ellipse(cx, cy - 0.5*scaleY,
                  RIM_RX * 0.65, RIM_RY * 0.55,
                  0, Math.PI * 0.18, Math.PI * 0.82);
      ctx.strokeStyle = 'rgba(255,180,140,0.50)';
      ctx.lineWidth = 2.5 * scaleX;
      ctx.stroke();

      // Кружки дужек (передних) — ближние к нам
      // Левая дужка
      ctx.beginPath();
      ctx.arc(cx - RIM_RX + SHX, cy + SHY, 5.5*scaleX, 0, Math.PI*2);
      ctx.fillStyle = '#8B1500';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - RIM_RX + SHX, cy + SHY, 4*scaleX, 0, Math.PI*2);
      ctx.fillStyle = '#DD2200';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - RIM_RX + SHX - 1.5*scaleX,
              cy + SHY - 2*scaleY, 2*scaleX, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,190,150,0.55)';
      ctx.fill();

      // Правая дужка
      ctx.beginPath();
      ctx.arc(cx + RIM_RX + SHX, cy + SHY, 5.5*scaleX, 0, Math.PI*2);
      ctx.fillStyle = '#8B1500';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + RIM_RX + SHX, cy + SHY, 4*scaleX, 0, Math.PI*2);
      ctx.fillStyle = '#DD2200';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + RIM_RX + SHX - 1.5*scaleX,
              cy + SHY - 2*scaleY, 2*scaleX, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,190,150,0.55)';
      ctx.fill();

      // ── GOAL FLASH (GREEN GLOW ON SCORING) ───
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
          // 🎯 МАЯТНИК: Жёлтая пунктирная стрелка
          const hx = p.x, hy = p.y - 52*scaleY;
          const len = 400*scaleX;
          const ex = hx + Math.cos(ss.aimAngle)*len;
          const ey = hy + Math.sin(ss.aimAngle)*len;
          ctx.save();
          ctx.strokeStyle = '#FFDD00';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 5]);
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        if (ss.phase === 'charging') {
          // 🎯 CHARGING: ЧЕРВОНА ДУГА (ідеальна) + СИНЯ (динамічна)

          // ЧЕРВОНА ДУГА (ідеальна)
          const arc = ss.idealTraj;
          if (arc && arc.length > 2) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,50,50,0.95)';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 5]);
            ctx.beginPath();
            ctx.moveTo(arc[0].x, arc[0].y);
            for (let k = 1; k < arc.length; k++) ctx.lineTo(arc[k].x, arc[k].y);
            ctx.stroke();
            ctx.setLineDash([]);
            // Крапка в кільці
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(HOOP_X, HOOP_Y, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // СИНЯ ДИНАМІЧНА ДУГА (поточна сила)
          const curPower = markerPosRef.current;  // 0-1
          const v_cur = (ss.idealVelocity || 10) * (0.5 + curPower * 1.0);
          const theta2 = -ss.lockedAngle;
          const hx_m2 = sx / SCALE;
          const hy_m2 = (p.y - 52*scaleY) / SCALE;
          const dynArc = simulateTrajectory({
            vx_m: Math.cos(theta2) * v_cur,
            vy_m: -Math.sin(theta2) * v_cur,
            x0_m: hx_m2, y0_m: hy_m2,
            scale: SCALE, groundY_m: GY / SCALE
          });
          if (dynArc.length > 2) {
            ctx.save();
            ctx.strokeStyle = 'rgba(100,150,255,0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(dynArc[0].x, dynArc[0].y);
            for (let k = 1; k < dynArc.length; k++) ctx.lineTo(dynArc[k].x, dynArc[k].y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }

          // ШКАЛА СИЛИ
          const bx = p.x + 30*scaleX, bTop = p.y - 90*scaleY;
          const bW = 14*scaleX, bH = 90*scaleY;
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.fillRect(bx, bTop, bW, bH);
          const ip = ss.idealPower || 0.5, tol = 0.08;
          const zTop = bTop + (1 - Math.min(1, ip + tol)) * bH;
          const zH = tol * 2 * bH;
          ctx.fillStyle = '#00FF44';
          ctx.fillRect(bx, zTop, bW, Math.max(4, zH));
          const mY = bTop + (1 - markerPosRef.current) * bH;
          ctx.fillStyle = '#FFF';
          ctx.fillRect(bx - 2*scaleX, mY - 2, bW + 4*scaleX, 4);
          ctx.strokeStyle = '#888';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, bTop, bW, bH);

        }

        if (ss.ball && ss.phase === 'flying') {

          ctx.save();
          ctx.translate(ss.ball.x, ss.ball.y);
          ctx.rotate(ss.ball.rot);
          drawBball(0, 0, 11*scaleX);
          ctx.restore();
        } else if (ss.ball) {

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
        const orderNum = p.playerNumber || p.order || (i + 1);
        // 🏀 RUCHEEK: Мигает номер только если игрок имеет право бросать (hasActiveRight=true)
        const isActive = (p.hasActiveRight === true) && gs.state === 'playing';

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
        // Guard against ghost duplicate rendering
        if (p.name && p.name.trim()) {
          ctx.fillStyle = isMine ? '#FFFF00' : '#FFFFFF';
          ctx.font = `bold ${11*scaleX}px Arial`;
          ctx.textAlign = 'center';
          ctx.fillText(p.name, p.x, p.y - 60*scaleY);
        }

        if (i === gs.disputeP2 && ss.phase === null && gs.state === 'playing' && gs.players.length > 1) {
          const al = 0.7 + 0.3 * Math.sin(Date.now() / 200);
          ctx.fillStyle = `rgba(255,200,0,${al})`;
          ctx.font = `bold ${10*scaleX}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('▶ ВИБИЙ!', p.x, p.y - 90*scaleY);
        }
      }

      // Draw remote players from Firebase
      remotePlayersRef.current.forEach((rp: any, rpKey: string) => {
        // 🔥 Пропустити себе
        if (rpKey === playerIdRef.current) return;

        // ✅ МУЛЬТИПЛЕЕР: Показывать игрока если он не выбыт
        if (rp.status === 'eliminated') return;

        // 🔥 Захист от неправильних координат (привиды в куту)
        if (!rp.x || !rp.y || rp.x < 0 || rp.x > 2000 || rp.y < 0 || rp.y > 2000) return;

        // 🔥 ВИПРАВЛЕННЯ: НЕ подвійне множення! Координати вже масштабовані
        // rp.x це вже абсолютна координата в пікселях canvas
        // groundYRef.current = GY = GY_ORIG * scaleY (вже масштабовано)
        // Але ноги гравця заканчиваютсь на rpy, тому nужно сместить вверх на 20 px
        const rpx = rp.x;  // БЕЗ множення на scaleX!
        const rpy = groundYRef.current;  // Ноги мають бути на одній лінії з локальним гравцем
        const rpColor = '#80cbc4'; // Cyan for remote players

        // Draw remote player ІДЕНТИЧНО до локального (idle pose)
        // Голова
        ctx.fillStyle = rpColor;
        ctx.beginPath();
        ctx.arc(rpx, rpy - 54*scaleY, 10*scaleX, 0, Math.PI * 2);
        ctx.fill();

        // Тулуб
        ctx.strokeStyle = rpColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(rpx, rpy - 43*scaleY);
        ctx.lineTo(rpx, rpy - 18*scaleY);
        ctx.stroke();

        // Ліва рука
        ctx.beginPath();
        ctx.moveTo(rpx, rpy - 37*scaleY);
        ctx.lineTo(rpx - 12*scaleX, rpy - 26*scaleY);
        ctx.stroke();

        // Права рука
        ctx.beginPath();
        ctx.moveTo(rpx, rpy - 37*scaleY);
        ctx.lineTo(rpx + 17*scaleX, rpy - 22*scaleY);
        ctx.stroke();

        // Ліва нога
        ctx.beginPath();
        ctx.moveTo(rpx, rpy - 18*scaleY);
        ctx.lineTo(rpx - 8*scaleX, rpy);
        ctx.stroke();

        // Права нога
        ctx.beginPath();
        ctx.moveTo(rpx, rpy - 18*scaleY);
        ctx.lineTo(rpx + 8*scaleX, rpy);
        ctx.stroke();

        // Ім'я гравця
        ctx.fillStyle = rpColor;
        ctx.font = `bold ${11*scaleX}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🌐 ' + (rp.name || `Remote ${rp.playerIndex}`), rpx, rpy - 62*scaleY);

        // Статус
        ctx.fillStyle = '#80cbc4';
        ctx.font = `${10*scaleX}px sans-serif`;
        ctx.fillText(rp.status === 'alive' ? '✓ alive' : '✗ eliminated', rpx, rpy - 50*scaleY);

        // ETAP 8: Draw remote player's ball (multiplayer sync) with debugging
        if (rp.ball) {
        }

        if (rp.ball && (rp.ball.state === 'flying' || rp.ball.state === 'auto_run')) {
          ctx.save();
          ctx.translate(rp.ball.x, rp.ball.y);
          ctx.rotate(rp.ball.rot || 0);
          drawBball(0, 0, 11*scaleX);
          ctx.restore();
        } else if (rp.ball) {
        }
      });

      // Draw remote ball from server (when other player is shooting)
      // 🚨 ВИПРАВЛЕННЯ: НЕ показувати remoteBall якщо локальний м'яч літає (ghost ball fix)
      const myShootState = gsRef.current.shootStates[0];
      const myBallFlying = myShootState && myShootState.ball &&
                          (myShootState.ball.state === 1 || myShootState.ball.state === 'flying');

      const rb = gsRef.current.remoteBall;
      const rbFlying = rb && rb.state !== undefined &&
                       rb.state !== 0 && rb.state !== 'idle' &&
                       rb.state !== 'waiting' && rb.state !== 'scored' && rb.state !== 'missed' &&
                       !myBallFlying; // Don't show remote ball when local ball is flying
      if (rbFlying) {
        ctx.save();
        // 🔥 ВИПРАВЛЕННЯ: НЕ множимо координати на scale (як rb.x/rb.y вже абсолютні)
        ctx.translate(rb.x, rb.y);
        ctx.rotate(rb.rotation || 0);
        drawBball(0, 0, 11*scaleX);
        ctx.restore();
      }

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

      // 🔥 ДИАГНОСТИКА: Показать статус Firebase на canvas
      ctx.fillStyle = '#00ffaa';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`🔥 Firebase: ${firebaseUnsubscribeRef.current.length > 0 ? 'ON' : 'OFF'}`, 10, 25);
      ctx.fillText(`👤 My ID: ${playerIdRef.current?.slice(-8) || 'N/A'}`, 10, 45);
      ctx.fillText(`🌐 Remote: ${remotePlayersRef.current.size}`, 10, 65);
      ctx.fillText(`👥 Local: ${gs.players.length}`, 10, 85);
      ctx.fillText(`💾 Game: ${gs.state}`, 10, 105);
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
          return null;
        }

        // Only restore if it's the same room
        if (data.roomId !== gameRoomId) return null;

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
          // 🚨 ВИПРАВЛЕННЯ: Обидва кути повинні бути вверх (від'ємні в canvas coords)
          // behindBoard: -0.6 rad ≈ -34° (більш мілкий дугу)
          // normal: -Math.PI*0.72 ≈ -129° (висока дуга)
          ss.aimAngle = behindBoard ? -0.6 : -Math.PI*0.72;
          ss.aimDir = behindBoard ? -1 : 1;
          ss.lockedAngle = null;
          ss.idealTraj = null;
          p.status = "shooting";
          if (hitIdx === 0) gs.disputeP1 = 0;
        } else if (ss.phase === "aiming") {
          // 🎯 КЛИК 1: ФИКСАЦИЯ УГЛА И ВЫЧИСЛЕНИЕ ИДЕАЛЬНОЙ ТРАЕКТОРИИ (ПОЛНАЯ МЕТРИКА)
          ss.lockedAngle = ss.aimAngle;

          const SCALE = Math.min(W, H) / 15.0;
          const headX_m = (p.x - 15*scaleX) / SCALE;
          const headY_m = (p.y - 55*scaleY) / SCALE;
          const hoopX_m = HOOP_X / SCALE;
          const hoopY_m = HOOP_Y / SCALE;
          const groundY_m = GY / SCALE;

          const dx_m = hoopX_m - headX_m;
          const dy_m = hoopY_m - headY_m;

          const g = 9.81;
          const theta = -ss.lockedAngle;  // canvas угол (от'ємне = вгору) → математический
          const cosT = Math.cos(theta);
          const tanT = Math.tan(theta);
          const denom = 2 * cosT * cosT * (dx_m * tanT - dy_m);

          let v_ideal: number;
          if (denom > 0.01) {
            v_ideal = Math.sqrt(g * dx_m * dx_m / denom);
            v_ideal = Math.max(4.0, Math.min(18.0, v_ideal));
          } else {
            v_ideal = 10.0;
          }

          ss.idealVelocity = v_ideal;  // в м/с
          ss.idealPower = Math.max(0.05, Math.min(0.95, (v_ideal - 4.0) / 14.0));  // нормализовано 0-1

          const vx_ideal = Math.cos(theta) * v_ideal;
          const vy_ideal = -Math.sin(theta) * v_ideal;  // от'ємне = вгору

          // Генерировать дугу через simulateTrajectory (все в метрах входе, пикселях выходе)
          ss.idealTraj = simulateTrajectory({
            vx_m: vx_ideal,
            vy_m: vy_ideal,
            x0_m: headX_m,
            y0_m: headY_m,
            scale: SCALE,
            groundY_m: groundY_m,
          });

          console.log('[IDEAL ARC GENERATED]', {
            v_ideal_ms: v_ideal.toFixed(2),
            idealPower_0_1: ss.idealPower.toFixed(2),
            points: ss.idealTraj.length,
            start_px: ss.idealTraj[0] ? {x: ss.idealTraj[0].x.toFixed(0), y: ss.idealTraj[0].y.toFixed(0)} : null,
            end_px: ss.idealTraj.length > 0 ? {x: ss.idealTraj[ss.idealTraj.length-1].x.toFixed(0), y: ss.idealTraj[ss.idealTraj.length-1].y.toFixed(0)} : null,
            hoop_px: {x: HOOP_X.toFixed(0), y: HOOP_Y.toFixed(0)},
            dx_m: dx_m.toFixed(2), dy_m: dy_m.toFixed(2),
            theta_deg: (theta * 180/Math.PI).toFixed(1),
          });

          ss.phase = "charging";
          ss.power = 0;
          ss.powerDir = 1;

          const tolerance = 0.08;  // ±8% от идеальной силы (в 0-1 scale)
          const pMin = Math.max(0, ss.idealPower - tolerance);
          const pMax = Math.min(1, ss.idealPower + tolerance);
          ss.greenZoneMin = pMin;
          ss.greenZoneMax = pMax;
          ss.greenZonePos = ss.idealPower;

          markerPosRef.current = ss.idealPower;
          markerDirRef.current = 1;
        } else if (ss.phase === "charging") {
          // 🎯 КЛІК 3: КИДОК З ЧИСТОЇ МЕТРИКИ

          const theta3 = -ss.lockedAngle;
          const hx_m3 = (p.x - 15*scaleX) / SCALE;
          const hy_m3 = (p.y - 52*scaleY) / SCALE;
          const dx_m3 = HOOP_X / SCALE - hx_m3;
          const dy_m3 = HOOP_Y / SCALE - hy_m3;
          const v_ideal3 = computeIdealVelocity(dx_m3, dy_m3, theta3);
          const power_factor = 0.5 + markerPosRef.current * 1.0;
          const v_real = v_ideal3 * power_factor;

          const vx_m = Math.cos(theta3) * v_real;
          const vy_m = -Math.sin(theta3) * v_real;

          ss.ball = {
            _x_m: hx_m3, _y_m: hy_m3,
            vx: vx_m, vy: vy_m,
            omega: 0,
            x: p.x - 15*scaleX, y: p.y - 55*scaleY,
            rot: 0, spin: 0,
            _accumulator: 0, _physTick: 0, _checkpoints: [],
            _scale: SCALE,
            state: 'flying', outcome: 'in_progress',
            scoredGoal: false, boardHandled: false, hitBackboard: false,
            owner: hitIdx, bounceCount: 0,
            rimContacts: 0, rimContactMask: 0, rimHitTimer: 0, rimBounceCount: 0,
            frameCount: 0, isGuided: false, guaranteedScore: false,
            _inRimZone: false,
          };

          ss.phase = "flying";
          p.status = "shooting";
          ss.idealTraj = null;
          ss.lockedAngle = null;

          console.log('[SHOT 3 LAUNCH]', {
            cursor_pos: markerPosRef.current.toFixed(2),
            v_ideal: v_ideal3.toFixed(2),
            v_real: v_real.toFixed(2),
            power_factor: power_factor.toFixed(2),
            vx_m: vx_m.toFixed(2),
            vy_m: vy_m.toFixed(2),
            theta_deg: (theta3 * 180/Math.PI).toFixed(1),
          });

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
            return;
          }
        }
        // Normal click: move player to position
        if (gs.selectedMoveIdx >= 0 && gs.selectedMoveIdx < gs.players.length) {
          const p = gs.players[gs.selectedMoveIdx], ss = gs.shootStates[gs.selectedMoveIdx];

          // ВИПРАВЛЕННЯ: Видалено дублювання перевірки aiming/charging (було 2 рази)
          // Рух дозволено у всіх станах крім aiming/charging (вони скасовуються ПКМ)
          const canMove = p.status !== "eliminated" &&
                         (ss.phase === null ||
                          ss.phase === "idle" ||
                          ss.phase === "pickup_wait" ||
                          ss.phase === "manual_run" ||
                          ss.phase === "flying" ||
                          ss.phase === "auto_run");

          if (canMove) {
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
        // FEATURE 2: RMB cancels shot phases (aiming or charging) and keeps player active
        if (ss.phase === "charging") {
          // Charging → reset to idle
          ss.phase = "idle";
          ss.power = 0;
          ss.powerDir = 1;
          ss.lockedAngle = null;
          ss.idealTraj = null;
          addFlash("❌ СКАСОВАНО", p.x, p.y - 105*scaleY, "rgba(255,100,100,0.95)");
        } else if (ss.phase === "aiming") {
          // Aiming → reset to idle
          ss.phase = "idle";
          ss.lockedAngle = null;
          ss.idealTraj = null;
          addFlash("❌ СКАСОВАНО", p.x, p.y - 105*scaleY, "rgba(255,100,100,0.95)");
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

      // 🔥 ВИПРАВЛЕННЯ #3: Отправлять позицию КАЖДЫЙ КАДР (60 FPS) для плавной синхронизации
      // emitPlayerPosition() использует Firebase, который асинхронный, поэтому можно вызывать часто
      emitPlayerPosition();

      // Save game state every 2 seconds to localStorage
      const now = Date.now();
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

    // 🔥 ВИПРАВЛЕННЯ #1: Отправлять позицию ТОЛЬКО для своего игрока (индекс 0)
    // ⏱️ С THROTTLING: только если движение > 5px или 50ms прошло
    const myPlayer = gs.players[0];
    if (myPlayer && myPlayer.status !== 'eliminated') {
      const now = Date.now();
      const timeSinceLastSend = now - lastPositionSendRef.current;

      // Проверить расстояние и время
      const lastPos = lastSentPosRef.current;
      const distance = Math.sqrt(
        (myPlayer.x - lastPos.x) ** 2 + (myPlayer.y - lastPos.y) ** 2
      );

      // Отправить если: движение > 5px ИЛИ прошло > 50ms
      if (distance > MOVE_THRESHOLD || timeSinceLastSend > 50) {
        lastSentPosRef.current = { x: myPlayer.x, y: myPlayer.y };
        lastPositionSendRef.current = now;

        updatePlayerPosition(
          gameRoomId,
          playerIdRef.current,
          myPlayer.x,
          myPlayer.y
        ).catch((err) =>
          console.error("[🔴] Firebase update position failed:", err)
        );
      }

      // 🔥 ВИПРАВЛЕННЯ #2: Отправлять мяч во время полета
      const ss = gs.shootStates[0];
      if (ss && ss.ball && (ss.ball.state === 1 || ss.ball.state === "flying")) {
        const ballTimeSinceLastSend = now - lastBallSendRef.current;
        if (ballTimeSinceLastSend > 50) {
          lastBallSendRef.current = now;
          updateBall(
            gameRoomId,
            ss.ball.x,
            ss.ball.y,
            ss.ball.vx,
            ss.ball.vy,
            ss.ball.state || 1
          ).catch((err) =>
            console.error("[🔴] Firebase update ball failed:", err)
          );
        }
      }
    }
  }, [gameRoomId]);

  // Game state is persisted via localStorage (no server-side persistence needed)
  const emitGameStateToServer = useCallback(() => {
    // Firebase: game state is synced via updatePlayerPosition
    if (gs.state !== 'playing' || !gameRoomId) return;
  }, [gameRoomId]);

  const handleAddPlayer = async () => {
    if (gs.players.length >= MAX_PLAYERS) { alert("Максимум 6 гравців!"); return; }
    const name = pname.trim() || `Гр.${gs.players.length+1}`;

    // 🔥 FIX: Перевірити що цей гравець (за playerId) ще не доданий локально
    // Якщо вже доданий → тихо ігнорувати (без діалогу)
    if (gs.players.some((p: any) => p.playerId === playerIdRef.current)) {
      console.warn('🚨 Ви вже в грі:', playerIdRef.current);
      return;  // Тихо ігнорувати, без alert()
    }

    // 🏀 RUCHEEK: Get global order (Firebase maintains it)
    let assignedOrder = gs.players.length + 1;
    const players = remotePlayersRef.current.size + 1;
    assignedOrder = Math.max(assignedOrder, players);

    // 🏀 RUCHEEK: 6 PERMANENT POSITIONS
    const positionIndex = Math.min(assignedOrder - 1, QUEUE_POSITIONS.length - 1);
    const playerNumber = positionIndex + 1;  // 1-6
    const queuePos = QUEUE_POSITIONS[positionIndex];

    const newPlayer = {
      playerId: playerIdRef.current,  // 🔥 CRITICAL: Store playerId for deduplication
      name,
      order: assignedOrder,
      x: queuePos.x,
      y: groundYRef.current,
      score:0,
      kills:0,
      status:"idle",
      rf:0,
      color: PLAYER_COLORS[positionIndex % 6],
      // 🏀 RUCHEEK GAME FIELDS
      playerNumber: playerNumber,
      hasActiveRight: positionIndex === 0,
      hasThrown: false,
      isEliminated: false,
      goalCount: 0,
    };
    gs.players.push(newPlayer);
    gs.shootStates.push({ phase:null,aimAngle:-Math.PI*0.72,aimDir:1,power:0,powerDir:1,ball:null,lockedAngle:null,idealTraj:null,idealSpeed:10,runTarget:null,inDanger:false,greenZonePos:0.5,powerMeterResult:null,accuracy:0 });

    // 🔥 КРИТИЧНО: Регистрируем гравца на Firebase (joinGame) с реальными координатами
    joinGame(gameRoomId, playerIdRef.current, name, positionIndex, newPlayer.x, newPlayer.y)
      .then(() => {
      })
      .catch(err => console.error('[🔴] Firebase add player failed:', err));

    // Immediately set game to playing when first player is added
    if (gs.players.length === 1) {
      gs.state = "playing";
      gs.flashes = [];
      gs.disputeP1 = 0;
      gs.disputeP2 = -1;
      gs.selectedMoveIdx = -1;
      showOrderRef.current = { [playerNumber]: true };
    }

    setPname("");
    forceUpdate(n => n+1);
  };

  const handleRestart = async () => {
    // 🏀 RUCHEEK: Server resets order automatically on Colyseus
    // No client-side reset needed

    // 🏀 RUCHEEK: Переформирование номеров по порядку выбывания
    const nextGameOrder: string[] = [...eliminationOrderRef.current];
    const survivor = gs.players.find((p: any) => !p.isEliminated && p.status !== 'eliminated');

    if (survivor) {
      nextGameOrder.push(survivor.name);

      // Создать сокращенный список: кто выбыл в каком порядке → новый номер
      // eliminationOrderRef.current = [name1, name2, name3, ...]
      // Следующая игра: name1 → номер 1, name2 → номер 2, ..., survivor → последний номер

      // СОХРАНИТЬ ПОРЯДОК для следующей игры
      localStorage.setItem('rucheyok_next_order', JSON.stringify(nextGameOrder));

      // Дополнительно: сохранить что game finished successfully
      localStorage.setItem('rucheyok_game_finished', 'true');
      localStorage.setItem('rucheyok_elimination_order', JSON.stringify(eliminationOrderRef.current));
    }

    eliminationOrderRef.current = [];

    gs.state="waiting"; gs.players=[]; gs.shootStates=[]; gs.flashes=[];
    gs.disputeP1=0; gs.disputeP2=-1; gs.selectedMoveIdx=-1;
    // Clear persisted state when restarting
    localStorage.removeItem(`basketball_game_state_${gameRoomId}`);
    setPname(userName); forceUpdate(n => n+1);
  };

  const handleDeleteLast = async () => {
    if (gs.state === "playing") { alert("❌ Не можна видалити гравця під час гри!"); return; }
    if (gs.players.length <= 1) { alert("❌ Потрібно щонайменше 1 гравець для видалення!"); return; }

    // 🔥 КРИТИЧНО: Видалити гравця з Firebase
    const removedPlayer = gs.players[gs.players.length - 1];
    try {
      const db = getFirebaseDatabase();
      const playerRef = ref(db, `games/${gameRoomId}/players/${removedPlayer.name}`);
      await remove(playerRef);
    } catch (err) {
      console.error('[🔴] Error removing player from Firebase:', err);
    }

    gs.players.pop();
    gs.shootStates.pop();

    // 🏀 RUCHEEK: Server resets order automatically on Colyseus
    // No client-side reset needed

    forceUpdate(n => n+1);
  };

  const handleExit = async () => {
    if (!confirm("Вихід з гри? Усі гравці будуть видалені!")) return;

    // 🔥 КРИТИЧНО: Видалити ВСІХ гравців з кімнати (очистити Firebase повністю)
    try {
      const db = getFirebaseDatabase();
      const playersRef = ref(db, `games/${gameRoomId}/players`);
      await remove(playersRef);

      // Також очистити м'яч
      const ballRef = ref(db, `games/${gameRoomId}/ball`);
      await set(ballRef, { x: 300, y: 100, vx: 0, vy: 0, state: 0 });
    } catch (err) {
      console.error('[🔴] Error clearing room:', err);
    }

    gs.state = "waiting";
    gs.players = [];
    gs.shootStates = [];
    gs.flashes = [];
    gs.disputeP1 = 0;
    gs.disputeP2 = -1;
    gs.selectedMoveIdx = -1;
    remotePlayersRef.current.clear();
    // Clear persisted state when exiting
    localStorage.removeItem(`basketball_game_state_${gameRoomId}`);
    // 🏀 RUCHEEK: Server resets order automatically on Colyseus
    // No client-side reset needed

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
