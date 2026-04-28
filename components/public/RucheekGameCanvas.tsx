"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Client } from "colyseus.js";
import { GameStateSchema } from "@/lib/colyseus/schemas.shared";
import { PowerMeterSystem } from "@/lib/game/powerMeterSystem";
import { createMeterElement, hideMeter, showAccuracyFeedback } from "@/lib/game/powerMeterUI";
import {
  computeLaunchVelocity,
  stepPhysics,
  computeRimCollision,
  computeBackboardCollision,
  computeFloorBounce,
  simulateTrajectory,
  PHYSICS_CONSTANTS,
  calculateGreenZonePosition,
  updateOscillator,
  calculateAccuracy,
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
  const colysusClientRef = useRef<any>(null);
  const roomRef = useRef<any>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

  // Power Meter System refs and state
  const powerMeterRef = useRef<PowerMeterSystem | null>(null);
  const meterElementRef = useRef<HTMLDivElement | null>(null);
  const [meterVisible, setMeterVisible] = useState(false);
  const [greenLinePosition, setGreenLinePosition] = useState(180);

  useEffect(() => { setMounted(true); }, []);

  // Initialize Colyseus connection
  useEffect(() => {
    if (!mounted || roomRef.current) {
      console.log('[🔴 DEBUG] Skipping Colyseus init:', { mounted, alreadyInit: !!roomRef.current });
      return;
    }

    console.log('[🔴 DEBUG] Initializing Colyseus with gameRoomId:', gameRoomId);

    let client: any;
    let room: any;
    try {
      // Для production используем NEXT_PUBLIC_COLYSEUS_URL (Railway), иначе текущий хост
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const colysuesUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL || `${protocol}//${host}`;
      const isProduction = process.env.NEXT_PUBLIC_COLYSEUS_URL !== undefined;
      console.log(`[🔴 DEBUG] Connecting to Colyseus (${isProduction ? 'PRODUCTION' : 'LOCAL'}):`, colysuesUrl);
      client = new Client(colysuesUrl);
      colysusClientRef.current = client;

      client.joinOrCreate('basketball', {
        nickname: userName || 'Player',
        playerId: playerIdRef.current,
        x: 480,
        y: 584,
        color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
      }).then((joinedRoom: any) => {
        console.log('[🔴 DEBUG] Colyseus room joined:', joinedRoom.sessionId);
        room = joinedRoom;
        roomRef.current = room;
        // 🔥 КРИТИЧНО: обновить playerIdRef на настоящий Colyseus sessionId
        playerIdRef.current = room.sessionId;
        console.log('[🔴 DEBUG] Updated playerIdRef to:', playerIdRef.current);

        // 🟢 ОЧИСТИТЬ СТАРЫХ ПРИЗРАКОВ ИЗ ПРЕДЫДУЩЕЙ СЕССИИ
        remotePlayersRef.current.clear();
        console.log('[🟢 COLYSEUS] Cleared old ghost players on join');

        // 🟢 ОЧИСТИТЬ СТАРОЕ СОСТОЯНИЕ ИЗ localStorage (статусы могут быть 'eliminated')
        localStorage.removeItem(`basketball_game_state_${gameRoomId}`);
        console.log('[🟢 COLYSEUS] Cleared old game state from localStorage');

        // ✅ FIX #2: Заменить polling на встроенные Colyseus listeners
        // Это дает мгновенную синхронизацию вместо задержки 16-48ms

        // Слушать новых игроков
        room.state.players.onAdd((player: any, key: string) => {
          console.log('[🟢 COLYSEUS] Player joined:', { key, nickname: player.nickname });
          if (key === room.sessionId) return; // Skip self
          updateRemotePlayerFromState(player, key);
        });

        // Слушать изменения существующих игроков
        room.state.players.onChange((player: any, key: string) => {
          if (key === room.sessionId) return; // Skip self
          updateRemotePlayerFromState(player, key);
        });

        // Слушать удаление игроков
        room.state.players.onRemove((player: any, key: string) => {
          console.log('[🟢 COLYSEUS] Player left:', { key, nickname: player.nickname });
          remotePlayersRef.current.delete(key);
        });

        // Вспомогательная функция для обновления игрока
        const updateRemotePlayerFromState = (player: any, key: string) => {
          // ФИЛЬТР ПРИЗРАКОВ: пропускать если нет nickname
          if (!player.nickname || player.nickname === '' || player.nickname === 'undefined') {
            console.log('[🟡] Ignoring player without nickname:', key);
            remotePlayersRef.current.delete(key);
            return;
          }

          // ФИЛЬТР: пропускать eliminated игроков
          if (player.status === 'eliminated' || player.status === 'dead') {
            console.log('[🟡] Removing eliminated player:', { key, nickname: player.nickname });
            remotePlayersRef.current.delete(key);
            return;
          }

          // ФИЛЬТР: пропускать неактивных игроков (стоявших более 30 сек)
          const lastSeen = player.lastSeen || 0;
          const now = Date.now();
          const INACTIVITY_THRESHOLD = 30000; // 30 seconds
          if (now - lastSeen > INACTIVITY_THRESHOLD) {
            console.log('[🟡] Removing inactive player:', { key, nickname: player.nickname, lastSeen, now });
            remotePlayersRef.current.delete(key);
            return;
          }

          // 🏀 RUCHEEK: Use queue position OR real position depending on status
          let posX: number, posY: number;

          // When shooting or running, use REAL coordinates from server
          if (player.status === 'shooting' || player.status === 'running') {
            posX = player.x || 480;
            posY = player.y || groundYRef.current;
          } else {
            // Otherwise use fixed queue position for waiting players
            const positionIndex = Math.min(player.playerIndex || 0, QUEUE_POSITIONS.length - 1);
            const queuePos = QUEUE_POSITIONS[positionIndex];
            posX = queuePos.x;
            posY = groundYRef.current;
          }

          const newPlayer = {
            socketId: key,
            basePlayerId: key,
            playerIndex: player.playerIndex || 0,
            order: player.playerIndex || 0,
            x: posX,
            y: posY,
            status: player.status || 'alive',
            nickname: player.nickname || 'Player',
            name: player.nickname || 'Player',
          };

          const existingPlayer = remotePlayersRef.current.get(key);

          // Check if player is new or changed (compare calculated positions not raw)
          if (!existingPlayer ||
              existingPlayer.x !== posX ||
              existingPlayer.y !== posY ||
              existingPlayer.status !== player.status) {
            if (!existingPlayer) {
              console.log('[🟢 COLYSEUS] New player:', { key, nickname: player.nickname });
              gsRef.current.flashes.push({
                text: `✅ ${player.nickname} присоединився!`,
                x: 400,
                y: 50,
                color: '#88ff88',
                alpha: 1,
                dy: 0,
              });
            } else if (existingPlayer.x !== posX || existingPlayer.y !== posY) {
              console.log('[🔵 COLYSEUS] Player moved:', { key, nickname: player.nickname, x: posX, y: posY });
            }
            remotePlayersRef.current.set(key, newPlayer);
            forceUpdate(x => x + 1);
          }
        };

        // ✅ MULTIPLAYER: Event - Another player joined
        room.onMessage('playerJoined', (data: any) => {
          if (data.playerId === playerIdRef.current) return;
          console.log('[🟢 COLYSEUS] playerJoined event:', data.nickname);
        });

        // ✅ MULTIPLAYER: Event - Another player shot
        room.onMessage('shotResult', (data: any) => {
          if (data.playerId === playerIdRef.current) return;

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

        // ✅ MULTIPLAYER: Listen to ball state changes (FIX #3: Ball visibility)
        const setupBallSync = () => {
          if (room && room.state && room.state.ball) {
            room.state.ball.onChange(() => {
              if (gsRef.current && room.state && room.state.ball) {
                gsRef.current.remoteBall = {
                  x: room.state.ball.x,
                  y: room.state.ball.y,
                  vx: room.state.ball.vx,
                  vy: room.state.ball.vy,
                  state: room.state.ball.state,
                  rotation: room.state.ball.rotation,
                };
                // Trigger re-render when remote ball changes
                forceUpdate(n => n + 1);
              }
            });
          } else {
            setTimeout(setupBallSync, 200);
          }
        };
        setupBallSync();
      }).catch((err: any) => {
        console.error('[🔴 ERROR] Colyseus join failed:', err);
      });
    } catch (e) {
      console.error('[🔴 ERROR] Colyseus initialization failed:', e);
      return;
    }

    // Cleanup on unmount
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      if (roomRef.current) {
        roomRef.current.leave().catch(() => {});
      }
      colysusClientRef.current = null;
      roomRef.current = null;
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
      const contacts = ball.rimContacts || 0;

      if (ball.vy <= 0) return 'miss';

      if (ball.guaranteedScore && dist < 80 * scaleX) return 'swish';

      const entryAngle = Math.atan2(ball.vy, ball.vx) * 180 / Math.PI;
      const NET_ZONE = 35 * scaleX;

      if (dist < NET_ZONE && contacts === 0) return 'swish';

      if (contacts >= 1 && dist < HOOP_RADIUS + BALL_RADIUS && entryAngle < -25) return 'rattleIn';

      if (dist < HOOP_RADIUS && entryAngle < -35) return 'rattleIn';

      if (dist < HOOP_RADIUS + BALL_RADIUS) return 'rimOut';

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
      if (ball.rimContacts === undefined) ball.rimContacts = 0;

      const frontRim = { x: HOOP_X + HOOP_R, y: HOOP_Y };
      const backRim  = { x: HOOP_X - HOOP_R, y: HOOP_Y };
      const tubeR = HOOP_R * 0.22;

      const dFront = Math.hypot(ball.x - frontRim.x, ball.y - frontRim.y);
      const dBack  = Math.hypot(ball.x - backRim.x,  ball.y - backRim.y);
      const rim    = dFront < dBack ? frontRim : backRim;
      const isFront = dFront < dBack;

      const dx = ball.x - rim.x;
      const dy = ball.y - rim.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      ball.x = rim.x + nx * (BALL_RADIUS + tubeR + 1);
      ball.y = rim.y + ny * (BALL_RADIUS + tubeR + 1);

      const dot = ball.vx * nx + ball.vy * ny;
      const tx = ball.vx - dot * nx;
      const ty = ball.vy - dot * ny;
      ball.vx = -dot * 0.25 * nx + tx * 0.82;
      ball.vy = -dot * 0.25 * ny + ty * 0.82;

      const speed = Math.hypot(ball.vx, ball.vy);
      const entryAngle = Math.atan2(Math.abs(ball.vy), Math.abs(ball.vx)) * 180 / Math.PI;

      ball.rimContacts++;

      if (isFront) {
        if (entryAngle >= 40 && entryAngle <= 70 && speed >= 2 && speed <= 7) {
          ball.vx = -Math.abs(ball.vx) * 0.35;
          ball.vy =  Math.abs(ball.vy) * 0.45;
        } else if (entryAngle > 70) {
          ball.vy = -speed * 0.4;
          ball.vx *= 0.3;
        } else {
          ball.vx = (ball.vx > 0 ? 1 : -1) * speed * 0.5;
          ball.vy = -Math.abs(ball.vy) * 0.3;
        }
      } else {
        if (entryAngle > 55) {
          ball.vx = (HOOP_X - ball.x) * 0.12;
          ball.vy =  Math.abs(ball.vy) * 0.55;
        } else {
          ball.vx = Math.abs(ball.vx) * 0.55;
          ball.vy = -Math.abs(ball.vy) * 0.25;
        }
      }

      if (ball.rimContacts >= 2) {
        const s2 = Math.hypot(ball.vx, ball.vy);
        if (s2 < 3.5 && Math.abs(ball.x - HOOP_X) < HOOP_R * 0.8) {
          ball.vx = (HOOP_X - ball.x) * 0.18;
          ball.vy = Math.abs(ball.vy) + 2.8;
        }
      }

      if (ball.spin && ball.spin < -0.03) {
        ball.vy += Math.abs(ball.spin) * 0.6;
        ball.vx *= 0.65;
      }
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
        console.log(`${pos.name}: idealPos=${idealPos.toFixed(3)} (power=${(idealPos*200).toFixed(0)}%) closest=${closestDist.toFixed(1)}px ${status}`);
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

    function findIdealSpeedForAngle(sx: number, sy: number, angle: number) {
      let bestSpd = 10, bestD = 1e9;
      for (let spd = 4; spd <= 16; spd += 0.12) {
        const launchParams = {
          angle,
          power: Math.min(200, spd * 20),
          accuracy: 85,
          distToHoop: Math.hypot(HOOP_X - sx, HOOP_Y - sy),
          playerX: sx,
          playerY: sy,
          hoopX: HOOP_X,
          hoopY: HOOP_Y,
          scaleX: 1,
        };
        const pts = simulateTrajectory(launchParams);
        for (const pt of pts) {
          const d = Math.hypot(pt.x - HOOP_X, pt.y - HOOP_Y);
          if (d < bestD && pt.y < GY) { bestD = d; bestSpd = spd; }
        }
      }
      return bestSpd;
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

    function stepBall(b: any, dt: number) {
      if (b.state !== 'flying') return;

      const prevX = b.x, prevY = b.y;

      // Pure parabolic physics: gravity + velocity + drag
      b.vy += G * dt;
      const spd = Math.hypot(b.vx, b.vy);
      b.vx -= b.vx * 0.0018 * spd;  // Drag effect
      b.vy -= b.vy * 0.0018 * spd;  // Drag effect
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += 0.08;

      // Magnet removed — ball flies pure parabola, no artificial attraction to hoop

      // Guided-mode correction ONLY in last 5 frames
      if (b.isGuided) {
        b.frameCount = (b.frameCount || 0) + 1;
        const framesLeft = b.T - b.frameCount;
        if (framesLeft > 0 && framesLeft <= 5) {
          // Smooth correction toward target
          b.x += (b.targetX - b.x) * (0.15 * (6 - framesLeft));
          b.y += (b.targetY - b.y) * (0.15 * (6 - framesLeft));
        }
      }

      // ═══════════════════════════════════════
      // РЕАЛІСТИЧНА ФІЗИКА КІЛЬЦЯ
      // Кожен кадр перевіряємо зіткнення з дужками
      // ═══════════════════════════════════════
      {
        const FRONT_RIM = { x: HOOP_X + HOOP_R, y: HOOP_Y };
        const BACK_RIM  = { x: HOOP_X - HOOP_R, y: HOOP_Y };
        const TUBE_R = HOOP_R * 0.22;

        for (const rim of [FRONT_RIM, BACK_RIM]) {
          const isFront = rim === FRONT_RIM;
          const rdx = b.x - rim.x;
          const rdy = b.y - rim.y;
          const rdist = Math.hypot(rdx, rdy);
          if (rdist >= BALL_RADIUS + TUBE_R || rdist === 0) continue;

          if (b.rimContacts === undefined) b.rimContacts = 0;
          b.rimContacts++;

          // Виштовхнути м'яч від дужки
          const nx = rdx / rdist;
          const ny = rdy / rdist;
          b.x = rim.x + nx * (BALL_RADIUS + TUBE_R + 1);
          b.y = rim.y + ny * (BALL_RADIUS + TUBE_R + 1);

          // Базовий відскок
          const dot = b.vx * nx + b.vy * ny;
          const tx = b.vx - dot * nx;
          const ty = b.vy - dot * ny;
          b.vx = -dot * 0.25 * nx + tx * 0.82;
          b.vy = -dot * 0.25 * ny + ty * 0.82;

          const speed = Math.hypot(b.vx, b.vy);
          const entryAngle = Math.atan2(Math.abs(b.vy), Math.abs(b.vx)) * 180 / Math.PI;
          const spin = b.spin || 0;
          const hasBackspin = spin < -0.03;
          const rnd = Math.random();

          let outcome = 'unknown';
          const rimHitLog = `RIM HIT: front=${isFront}, angle=${entryAngle.toFixed(1)}°, speed=${speed.toFixed(2)}, spin=${spin.toFixed(3)}, contacts=${b.rimContacts}`;

          if (isFront) {
            if (entryAngle >= 40 && entryAngle <= 65 && speed >= 2 && speed <= 6) {
              // СЦЕНАРІЙ 6: Передня→задня→всередину (18% реальний)
              outcome = 'front_mid_in';
              b.vx = -Math.abs(b.vx) * 0.35;
              b.vy =  Math.abs(b.vy) * 0.42;
              addFlash('💥', HOOP_X, HOOP_Y - 30*scaleY, '#ff9900');
            } else if (entryAngle > 70) {
              // СЦЕНАРІЙ 3/4: Крутий кут — підскок вгору
              if (hasBackspin && rnd < 0.65) {
                // Бекспін повертає м'яч в кільце (65% при бекспін)
                outcome = 'front_steep_backspin';
                b.vy = -speed * 0.35;
                b.vx = (HOOP_X - b.x) * 0.08;
              } else {
                outcome = 'front_steep_bounce';
                b.vy = -speed * 0.45;
                b.vx *= 0.25;
              }
              addFlash('💥', HOOP_X, HOOP_Y - 30*scaleY, '#ff9900');
            } else {
              // СЦЕНАРІЙ 8: Пологий → відскок назад (недоліт)
              outcome = 'front_shallow_out';
              b.vx = (b.vx > 0 ? 1 : -1) * speed * 0.55;
              b.vy = -Math.abs(b.vy) * 0.28;
              addFlash('💢', HOOP_X, HOOP_Y - 30*scaleY, '#ff4444');
            }
          } else {
            if (entryAngle > 55) {
              // СЦЕНАРІЙ 9: Задня крутий → притягується до центру (перекид)
              outcome = 'back_steep_in';
              b.vx = (HOOP_X - b.x) * 0.14;
              b.vy =  Math.abs(b.vy) * 0.52;
              addFlash('💥', HOOP_X, HOOP_Y - 30*scaleY, '#ff9900');
            } else if (entryAngle > 30) {
              // Середній кут задньої — може зайти або вилетіти
              if (rnd < 0.45) {
                outcome = 'back_mid_in_50';
                b.vx = (HOOP_X - b.x) * 0.10;
                b.vy =  Math.abs(b.vy) * 0.45;
              } else {
                outcome = 'back_mid_out_50';
                b.vx = Math.abs(b.vx) * 0.5;
                b.vy = -Math.abs(b.vy) * 0.2;
              }
              addFlash('💥', HOOP_X, HOOP_Y - 30*scaleY, '#ffaa00');
            } else {
              // СЦЕНАРІЙ 10: Задня пологий → перелет вперед
              outcome = 'back_shallow_out';
              b.vx = Math.abs(b.vx) * 0.55;
              b.vy = -Math.abs(b.vy) * 0.22;
              addFlash('💢', HOOP_X, HOOP_Y - 30*scaleY, '#ff4444');
            }
          }

          // СЦЕНАРІЙ 4/11: Rim roll — повільний м'яч біля центру скочується
          if (b.rimContacts >= 2) {
            const s2 = Math.hypot(b.vx, b.vy);
            const centerDist = Math.abs(b.x - HOOP_X);
            if (s2 < 3.5 && centerDist < HOOP_R * 0.8) {
              if (rnd < 0.6) {
                // 60% — залетає (rim roll in)
                outcome = 'rimroll_in_60';
                b.vx = (HOOP_X - b.x) * 0.18;
                b.vy = Math.abs(b.vy) + 2.8;
                addFlash('🔄', HOOP_X, HOOP_Y - 30*scaleY, '#00ff88');
              } else {
                // 40% — вилітає (rim roll out)
                outcome = 'rimroll_out_40';
                b.vx = (b.x > HOOP_X ? 1 : -1) * 2.5;
                b.vy = -1.5;
                addFlash('😬', HOOP_X, HOOP_Y - 30*scaleY, '#ff4444');
              }
            }
          }

          // СЦЕНАРІЙ 17: Бекспін — засмоктує в кільце після будь-якого торкання
          if (hasBackspin) {
            outcome += '_with_backspin';
            b.vy += Math.abs(spin) * 0.6;
            b.vx *= 0.65;
          }

          console.log(`${rimHitLog}, outcome=${outcome}`);

          break; // одне торкання за кадр
        }

        // ── ПЕРЕВІРКА ГОЛУ — м'яч пройшов крізь кільце зверху вниз ──
        if (b.vy > 0 && !b.scoredGoal) {
          const distC = Math.hypot(b.x - HOOP_X, b.y - HOOP_Y);
          const inNetZone =
            distC < HOOP_RADIUS - BALL_RADIUS * 0.3 &&
            b.y >= HOOP_Y - 4 * scaleY &&
            b.y <= HOOP_Y + 20 * scaleY;

          if (inNetZone) {
            const rimC = b.rimContacts || 0;
            b.outcome = rimC === 0 ? 'swish' : rimC <= 2 ? 'rattleIn' : 'direct';
            console.log(`GOAL: contacts=${rimC}, outcome=${b.outcome}`);
            b.scoredGoal = true;
            b.state = 'scored';
            b.vx = 0;
            b.vy = 0;
            b.x = HOOP_X;
            b.y = HOOP_Y + 26 * scaleY;
            gs.netShake = true;
            gs.netShakeEnd = Date.now() + 700;
            gs.netSwing = {
              type: rimC === 0 ? 'SWISH' : 'DIRECT',
              startTime: Date.now(),
              duration: rimC === 0 ? 100 : 200
            };
            const msg = rimC === 0 ? '🎯 SWISH!' : rimC <= 2 ? '💥 Rattles In!' : '🎯 IN!';
            const clr = rimC === 0 ? '#00ff00' : '#ff9900';
            addFlash(msg, HOOP_X, HOOP_Y - 52 * scaleY, clr);
            return;
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
            b.hitBackboard = true;
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

        } else if (b.bounceCount >= MAX_BOUNCES || Math.abs(b.vy) < MIN_BOUNCE_SPEED) {
          // Відскоки завершені або низька швидкість - м'яч зупинився
          b.y = GY;
          b.vx = 0;
          b.vy = 0;
          b.angularVelocity = 0;
          b.state = 'missed';
        }
      }

    }

    function launchBall(idx: number, shotCursorPos: number = 0.5) {
      const p = gs.players[idx];
      const ss = gs.shootStates[idx];
      const px = p.x;
      const py = p.y - 40 * scaleY;

      // Calculate distance to hoop for physics calculation
      const distToHoop = Math.hypot(HOOP_X - px, HOOP_Y - py);

      // Use physics engine for realistic launch velocity
      // Power is determined by cursor position (shotCursorPos is 0-1 normalized)
      const shotPower = shotCursorPos * 200; // Convert to 0-200% scale

      const launchParams = {
        angle: ss.lockedAngle,
        power: shotPower,
        accuracy: ss.accuracy || 0,
        distToHoop,
        playerX: px,
        playerY: py,
        hoopX: HOOP_X,
        hoopY: HOOP_Y,
        scaleX: scaleX,
      };

      // Get realistic launch velocity from physics engine
      const { vx, vy, spin } = computeLaunchVelocity(launchParams);

      // ── OUTCOME DETERMINATION based on Sweet Spot accuracy
      // Use accuracy from cursor position relative to Sweet Spot to determine shot success
      const accuracy = ss.accuracy || 0;

      // Outcome probabilities based on accuracy to Sweet Spot:
      // accuracy >= 85% → guaranteed score
      // accuracy >= 70% → likely score with rim bounce
      // accuracy >= 50% → possible score
      // accuracy < 50% → likely miss
      let outcome = 'miss';
      let matchPct = accuracy;

      if (accuracy >= 85) {
        // Perfect or near-perfect accuracy → direct swish/score
        outcome = 'perfect_direct';
        matchPct = 95 + Math.random() * 5;
      } else if (accuracy >= 70) {
        // Good accuracy → likely direct score
        const scoreChance = 0.75 + (accuracy - 70) / 30 * 0.15;
        if (Math.random() < scoreChance) {
          outcome = 'direct';
          matchPct = 75 + Math.random() * 15;
        } else {
          outcome = 'miss';
          matchPct = accuracy;
        }
      } else if (accuracy >= 50) {
        // Moderate accuracy → possible score
        const scoreChance = 0.40 + (accuracy - 50) / 20 * 0.35;
        if (Math.random() < scoreChance) {
          outcome = 'direct';
          matchPct = 50 + Math.random() * 20;
        } else {
          outcome = 'miss';
          matchPct = accuracy;
        }
      } else {
        // Low accuracy → mostly miss
        outcome = 'miss';
        matchPct = accuracy;
      }

      ss.ball = {
        x: px,
        y: py,
        vx,
        vy,
        rot: 0,
        spin,
        drag: PHYSICS_CONSTANTS.DRAG_COEFFICIENT,
        state: 'flying',
        outcome,
        matchPct,
        accuracy: ss.accuracy || 0,
        scoredGoal: false,
        boardHandled: false,
        rimHandled: false,
        owner: idx,
        bounceCount: 0,
        rimBounceCount: 0,
        frameCount: 0,
        isGuided: false,
      };



      ss.phase = 'flying';

      ss.lockedAngle = null;
      ss.idealTraj = null;
      p.status = 'shooting';

      // 🏀 RUCHEEK: Текущий игрок выпустил мяч → передать право СЛЕДУЮЩЕМУ
      p.hasThrown = true;
      p.hasActiveRight = false; // Текущий теряет право

      // Найти следующего живого игрока
      let nextIdx = (idx + 1) % gs.players.length;
      while (gs.players[nextIdx].isEliminated && nextIdx !== idx) {
        nextIdx = (nextIdx + 1) % gs.players.length;
      }

      // Если найден живой игрок → дать ему право
      if (nextIdx !== idx && !gs.players[nextIdx].isEliminated) {
        gs.players[nextIdx].hasActiveRight = true;
      }

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

          // Oscillate distance indicator marker with arcade-style difficulty (old logic)
          const MARKER_SPEED = 0.65 + distRatio * 0.45;
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

      // ✅ MULTIPLAYER: Emit shot completion to server via Colyseus
      if (idx === 0 && roomRef.current) {
        const ss = gs.shootStates[0];
        roomRef.current.send('shoot', {
          playerId: playerIdRef.current,
          playerIndex: idx,
          nickname: p.name || userName || 'Player',
          shotScore: 1,
          accuracy,
          collisionType: 'swish',
          startX: ss?.ball?.x || p.x,
          startY: ss?.ball?.y || p.y,
          vx: ss?.ball?.vx || 0,
          vy: ss?.ball?.vy || 0,
          spin: ss?.ball?.spin || 0,
        });
      }

      if (idx === gs.disputeP2 && gs.disputeP1 >= 0 && gs.disputeP1 < gs.players.length) {
        const p1ph = gs.shootStates[gs.disputeP1]?.phase;
        const dangerPhases = ['auto_run', 'pickup_wait', 'flying', 'aiming', 'charging'];
        if (dangerPhases.includes(p1ph) || gs.shootStates[gs.disputeP1]?.inDanger) {
          addFlash('💀 ВИБИТО!', gs.players[gs.disputeP1]?.x || 300, GY - 130*scaleY, '#ff4444');
          if (gs.players[gs.disputeP1]) gs.players[gs.disputeP1].status = 'eliminated';
          if (gs.players[idx]) gs.players[idx].kills = (gs.players[idx].kills || 0) + 1;

          // 🟢 ОТПРАВИТЬ СТАТУС НА СЕРВЕР
          const eliminatedPlayerId = gs.players[gs.disputeP1]?.playerId;
          if (roomRef.current && eliminatedPlayerId) {
            roomRef.current.send('playerStatus', {
              playerId: eliminatedPlayerId,
              status: 'eliminated'
            });
            console.log('[🟢 COLYSEUS] Sent eliminated status for player:', eliminatedPlayerId);
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
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';

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
          const launchParams = {
            angle: ss.aimAngle,
            power: Math.min(200, 10 * 20),
            accuracy: 85,
            distToHoop: Math.hypot(HOOP_X - sx, HOOP_Y - sy),
            playerX: sx,
            playerY: sy,
            hoopX: HOOP_X,
            hoopY: HOOP_Y,
            scaleX: scaleX,
          };
          const pts = simulateTrajectory(launchParams);
          drawTrajPts(pts, 'rgba(220,80,60,0.45)', [5, 5]);
          drawAimArrow(p.x, p.y, ss.aimAngle);
        }

        if (ss.phase === 'charging') {
          if (ss.idealTraj) drawTrajPts(ss.idealTraj, 'rgba(255,230,0,0.75)', [6, 5], 1.9);
          const curSpd = 5 + (ss.power / 100) * 11;
          const launchParams = {
            angle: ss.aimAngle,
            power: Math.min(200, curSpd * 20),
            accuracy: 85,
            distToHoop: Math.hypot(HOOP_X - sx, HOOP_Y - sy),
            playerX: sx,
            playerY: sy,
            hoopX: HOOP_X,
            hoopY: HOOP_Y,
            scaleX: scaleX,
          };
          const pts = simulateTrajectory(launchParams);
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

          // Draw distance indicator bar with green zone and oscillating marker (using physics engine)
          const bx2 = p.x + 30*scaleX, barTop = p.y - 80*scaleY, barW = 14*scaleX, barH = 80*scaleY;
          const zoneCenter2 = ss.greenZonePos || 0.5;
          const zoneSize2 = 0.12;
          const zoneMin2 = zoneCenter2 - zoneSize2 / 2;
          const zoneMax2 = zoneCenter2 + zoneSize2 / 2;

          // Background bar
          ctx.fillStyle = '#222';
          ctx.fillRect(bx2, barTop, barW, barH);
          // Green success zone
          // FIXED: Invert Y position so close shots have low zone (bottom), far shots have high zone (top)
          ctx.fillStyle = '#00FF44';
          ctx.fillRect(bx2, barTop + (1 - zoneMax2) * barH, barW, zoneSize2 * barH);
          // Marker (white line) - updated by updateOscillator
          // FIXED: Invert Y position so bottom = min power (0), top = max power (1)
          const markerY2 = barTop + (1 - markerPosRef.current) * barH;
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

      // Draw remote players from Colyseus
      remotePlayersRef.current.forEach((rp: any, rpKey: string) => {
        // 🔥 Для Colyseus: прямое сравнение sessionId
        if (rpKey === playerIdRef.current) {
          console.log('[🔴 DEBUG] Skipping self in render:', { key: rpKey, status: rp.status });
          return;
        }

        // ✅ МУЛЬТИПЛЕЕР: Показывать игрока если он не выбыт (может быть в статусе shooting/running/idle)
        if (rp.status === 'eliminated') {
          console.log('[🔴 DEBUG] Skipping eliminated player:', { key: rpKey, name: rp.name });
          return;
        }

        console.log('[🎨 DRAWING] Remote player:', { key: rpKey, name: rp.name, status: rp.status, x: rp.x, y: rp.y });
        const isLocalPlayer = gs.players.some((p: any) => p.name === rp.name || p.name === rp.nickname);
        if (isLocalPlayer) return;

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
      if (gsRef.current.remoteBall && (gsRef.current.remoteBall.state === 'flying' || gsRef.current.remoteBall.state === 'bouncing')) {
        const rb = gsRef.current.remoteBall;
        ctx.save();
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
          const launchParams = {
            angle: ss.lockedAngle,
            power: Math.min(200, idealSpd * 20),
            accuracy: 85,
            distToHoop,
            playerX: px,
            playerY: py,
            hoopX: HOOP_X,
            hoopY: HOOP_Y,
            scaleX: scaleX,
          };
          ss.idealTraj = simulateTrajectory(launchParams);
          ss.phase = "charging";
          ss.power = 0;
          ss.powerDir = 1;
          // Calculate green zone position using physics-based kinematic equations
          const angleDeg = Math.abs((ss.lockedAngle || -Math.PI * 0.72) * 180 / Math.PI);
          ss.greenZonePos = calculateIdealMarkerPos(px, py, HOOP_X, HOOP_Y, angleDeg);
          // Reset marker for distance indicator
          markerPosRef.current = 0;
          markerDirRef.current = 1;
        } else if (ss.phase === "charging") {
          // Calculate accuracy using physics engine function
          ss.greenZonePos = ss.greenZonePos || 0.5;
          ss.accuracy = calculateAccuracy(markerPosRef.current, ss.greenZonePos, 0.12);
          ss.powerMeterResult = { accuracy: ss.accuracy, meterHeight: markerPosRef.current * 200, greenLinePosition: ss.greenZonePos * 200 };

          launchBall(hitIdx, markerPosRef.current);

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

          // BUG 1 FIX: Block movement during aiming or charging phase
          if (ss.phase === "aiming" || ss.phase === "charging") {
            return; // Ignore click, don't move player
          }

          // DEBUG: Log why movement might not trigger

          // BLOCK movement during shooting phases (aiming/charging)
          if (ss.phase === "aiming" || ss.phase === "charging") {
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
          } else {
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

      if (roomRef.current) {
        roomRef.current.send('move', {
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
        });
      }
    });
  }, [gameRoomId]);

  // Game state is persisted via localStorage (no server-side persistence needed)
  const emitGameStateToServer = useCallback(() => {
    // Colyseus: game state is synced via room.send('move')
    if (gs.state !== 'playing' || !gameRoomId || !roomRef.current) return;
  }, [gameRoomId]);

  const handleAddPlayer = async () => {
    if (gs.players.length >= MAX_PLAYERS) { alert("Максимум 6 гравців!"); return; }
    const name = pname.trim() || `Гр.${gs.players.length+1}`;

    // 🏀 RUCHEEK: Get global order from server (ensures correct position across browsers)
    let assignedOrder = gs.players.length + 1;  // Fallback
    // Colyseus: server maintains order via room state
    if (roomRef.current && roomRef.current.state && roomRef.current.state.players) {
      assignedOrder = roomRef.current.state.players.size + 1;
    } else {
      assignedOrder = gs.players.length + 1;
    }

    // 🏀 RUCHEEK: 6 PERMANENT POSITIONS
    // positionIndex based on server order (0-5), clamp to max 5
    const positionIndex = Math.min(assignedOrder - 1, QUEUE_POSITIONS.length - 1);
    const playerNumber = positionIndex + 1;  // 1-6
    const queuePos = QUEUE_POSITIONS[positionIndex];

    const newPlayer = {
      name,
      order: assignedOrder,  // Global order from server
      x: queuePos.x,
      y: groundYRef.current,  // ✅ USE REAL GROUND Y (scales with canvas)
      score:0,
      kills:0,
      status:"idle",
      rf:0,
      color: PLAYER_COLORS[positionIndex % 6],
      // 🏀 RUCHEEK GAME FIELDS
      playerNumber: playerNumber,         // 1-6: постоянное место игрока
      hasActiveRight: positionIndex === 0,  // TRUE только для первого игрока (место №1)
      hasThrown: false,                   // TRUE когда игрок выпустил мяч
      isEliminated: false,                // TRUE когда игрок выбит
      goalCount: 0,                       // Количество голов в этой игре
    };
    gs.players.push(newPlayer);
    gs.shootStates.push({ phase:null,aimAngle:-Math.PI*0.72,aimDir:1,power:0,powerDir:1,ball:null,lockedAngle:null,idealTraj:null,idealSpeed:10,runTarget:null,inDanger:false,greenZonePos:0.5,powerMeterResult:null,accuracy:0 });

    // Broadcast to other clients via Colyseus
    if (roomRef.current) {
      roomRef.current.send('ready', {
        playerIndex: positionIndex,
        nickname: name,
        order: playerNumber,
        x: newPlayer.x,
        y: newPlayer.y,
        color: newPlayer.color,
      });
    }

    // Immediately set game to playing when first player is added
    if (gs.players.length === 1) {
      gs.state = "playing";
      gs.flashes = [];
      gs.disputeP1 = 0;
      gs.disputeP2 = -1;
      gs.selectedMoveIdx = -1;
      // First player can shoot
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
    gs.players.pop();
    gs.shootStates.pop();

    // 🏀 RUCHEEK: Server resets order automatically on Colyseus
    // No client-side reset needed

    forceUpdate(n => n+1);
  };

  const handleExit = async () => {
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
