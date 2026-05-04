"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { PowerMeterSystem } from "@/lib/game/powerMeterSystem";
import { createMeterElement, hideMeter, showAccuracyFeedback } from "@/lib/game/powerMeterUI";
import { validateRimMetrics, logRimMetrics } from "@/lib/game/metricsConversion";
import { RIM, PIXELS_PER_METER, setPixelsPerMeter, getRimGeometryPx } from "@/lib/game/rimConstants";
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
  simulateTrajectory,
  PHYSICS_CONSTANTS,
  integratePhysics,
  checkAllCollisions,
  checkGoalEntry,
  checkGateScoring,
  checkScoring,
  checkRimCollision,
  sweepSphereVsSphere,
  auditPhysicsSystem,
  validateRimAlignment,
  type PhysicsConstantsM,
  type BallStateM,
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
  console.log('🔧 RucheekGameCanvas component rendered, isVisible:', isVisible);
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
    debugPhysicsCircle: false, // DEBUG: Show true physics rim circle
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

  useEffect(() => {
    // SYSTEM STARTUP: Verify physics is pure
    const audit = auditPhysicsSystem();
    if (!audit.clean) {
      console.error('[PHYSICS LOCK] System audit failed:', audit.errors);
      audit.errors.forEach(e => console.error(e));
    } else {
      console.log('✅ [PHYSICS LOCK] Physics system is clean and pure');
    }

    // STAGE 5: Validate FIBA rim metrics
    validateRimMetrics();
    logRimMetrics();

    // ═════════════════════════════════════════════════════════════
    // 🔴 КОНФЛИКТ #2 + #3: SYNC TEST + HOOP TEST (RUN AT STARTUP)
    // ═════════════════════════════════════════════════════════════
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║          COORDINATE SYNC & PHYSICS TEST                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Estimate what SCALE will be (use typical canvas size)
    const typicalW = typeof window !== 'undefined' ? window.innerWidth : 400;
    const typicalH = typeof window !== 'undefined' ? window.innerHeight : 600;
    const SCALE = Math.min(typicalW, typicalH) / 15.0;
    const H = typicalH;

    // Rim geometry — ✅ УВЕЛИЧЕНО В 3 РАЗА
    const RIM_R_M = 0.255 * 3;  // 0.765m (0.255 × 3)
    const STAND_X = typicalW * 0.08;
    const STAND_Y = H * 0.44;
    const rimVisX = STAND_X;
    const rimVisY = STAND_Y;
    const rimPhysX = (STAND_X / SCALE) * SCALE;  // physics → pixels
    const rimPhysY = (STAND_Y / SCALE) * SCALE;
    const ballPhysPx = 0.12 * SCALE;

    console.log('═══ SYNC TEST (КОНФЛИКТ #2) ═══');
    console.log(`RIM X: visual=${rimVisX.toFixed(1)} physics=${rimPhysX.toFixed(1)} diff=${Math.abs(rimVisX-rimPhysX).toFixed(3)}px`);
    console.log(`RIM Y: visual=${rimVisY.toFixed(1)} physics=${rimPhysY.toFixed(1)} diff=${Math.abs(rimVisY-rimPhysY).toFixed(3)}px`);
    console.log(`BALL R: physics=${ballPhysPx.toFixed(1)}px (0.12m * SCALE)`);
    console.log(`SCALE=${SCALE.toFixed(2)} (prev H/7=${(H/7).toFixed(2)})`);

    if (Math.abs(rimVisX - rimPhysX) < 0.1 && Math.abs(rimVisY - rimPhysY) < 0.1) {
      console.log('✅ RIM X synced\n✅ RIM Y synced');
    } else {
      if (Math.abs(rimVisX - rimPhysX) >= 0.1) console.error('❌ RIM X NOT SYNCED!');
      if (Math.abs(rimVisY - rimPhysY) >= 0.1) console.error('❌ RIM Y NOT SYNCED!');
    }
    console.log('═════════════════════════════════');

    // КОНФЛИКТ #3: HOOP TEST
    console.log('\n🎯 HOOP TEST (КОНФЛИКТ #3)...');
    let passed = 0;
    const C = {
      GRAVITY: 9.81,
      BALL_RADIUS_M: 0.12,
      RIM_RADIUS_M: RIM_R_M,
      HOOP_X_M: STAND_X / SCALE,
      HOOP_Y_M: STAND_Y / SCALE,
    };

    for (let i = 0; i < 10; i++) {
      let b = { _x_m: C.HOOP_X_M, _y_m: C.HOOP_Y_M - 1.0, vx: 0, vy: 4.0, _scored: false };
      for (let f = 0; f < 120; f++) {
        const prevY = b._y_m;
        b.vy += C.GRAVITY * (1/60);
        b._y_m += b.vy * (1/60);
        b._x_m += b.vx * (1/60);

        // Mini checkScoring
        const crossedRim = prevY <= C.HOOP_Y_M && b._y_m > C.HOOP_Y_M;
        const movingDown = b.vy > 0;
        const insideHoop = Math.abs(b._x_m - C.HOOP_X_M) < C.RIM_RADIUS_M * 0.88;
        if (crossedRim && movingDown && insideHoop && !b._scored) {
          passed++;
          b._scored = true;
          break;
        }
      }
    }

    console.log(`🏀 HOOP TEST RESULT: ${passed}/10`);
    if (passed < 10) {
      console.error(`❌ ТЕСТ НЕ ПРОЙДЕН — только ${passed}/10 попаданий`);
    } else {
      console.log('✅ ТЕСТ ПРОЙДЕН — 10/10 попаданий!');
    }
    console.log('═════════════════════════════════\n');

    setMounted(true);
  }, []);

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

    // ═══════════════════════════════════════════════════════════
    // 🏀 БАСКЕТБОЛЬНАЯ СТОЙКА — МЕТРИЧЕСКАЯ СИСТЕМА (ФИКСИРОВАНО)
    // ═══════════════════════════════════════════════════════════
    // КОНФЛИКТ #1 ИСПРАВЛЕН: M2PX удалён, везде используется единый SCALE
    // 1 метр = SCALE пиксели (консистентно для визуальных и физических координат)

    // Позиция стойки (ШАГ 2: кольцо у левой стены, выше)
    const STAND_Y = H * 0.44;         // поднять выше (~44% высоты canvas)

    // Щит (backboard) — ШАГ 6: удвоить высоту
    const BD_W  = 0.06 * SCALE;       // толщина щита 6cm
    const BD_H  = 1.05 * SCALE * 2.0; // удвоить высоту щита (вместо 1.05м → 2.1м)
    const BD_X  = W * 0.015;          // вплотную к стене (ШАГ 2)

    // Кольцо (rim) — УВЕЛИЧЕНО В 3 РАЗА для удобства
    const RIM_R_M  = 0.255 * 3;       // УВЕЛИЧЕНО 3x: 0.255 → 0.765м (визуальный радиус)
    const RIM_R  = RIM_R_M * SCALE;   // конвертировать в пиксели
    const RIM_T  = 0.02  * SCALE;     // толщина обода 2cm

    // ═════════════════════════════════════════════════════════════
    // ИЗМЕНЕНИЕ: Приблизить кольцо к щиту — зазор в 3 раза меньше
    // ═════════════════════════════════════════════════════════════
    const BD_RIGHT = BD_X + BD_W;                    // правый край щита
    const oldGap = (W * 0.08) - RIM_R - BD_RIGHT;   // текущий зазор при старом STAND_X
    const newGap = Math.max(4, oldGap / 3);         // зазор в 3 раза меньше (мин 4px)
    const STAND_X = BD_RIGHT + newGap + RIM_R;      // новая позиция кольца

    // Сетка (net)
    const NET_W  = RIM_R * 2.0;        // ширина сверху = диаметр
    const NET_H  = RIM_R * 1.3;        // высота сетки
    const NET_BOT_W = RIM_R * 0.8;     // ширина снизу

    // Мяч (ball) — FIBA spec
    const BALL_R_M = 0.12;  // радиус мяча (24cm диаметр FIBA)

    // Restitution coefficients for realistic bouncing
    const RESTITUTION_RIM = 0.55;      // дужка — средний отскок
    const RESTITUTION_BACKBOARD = 0.45; // щит — мягкий отскок
    const RESTITUTION_FLOOR = 0.35;     // пол — гасит движение

    // Player positions (derived from old system, kept for backward compat)
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
      STAND_X - P_START,
      STAND_Y - P_START_Y
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
    const MIN_BALL_SPEED = 5.0;
    const MAX_BALL_SPEED = 16.0;

    function recalculateIdealPowerFor200Scale(distFraction: number): number {
      if (distFraction <= 0.3) return 100;
      if (distFraction <= 0.6) return 140;
      if (distFraction <= 0.85) return 190;
      return 200;
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



    function stepBall(b: any, dt_normalized: number) {
      if (b.state !== 'flying') return;
      const FIXED_DT = 1/120;

      if (b._accumulator === undefined) { b._accumulator = 0; b._physTick = 0; }

      const frameMs = dt_normalized * (1000/60);
      b._accumulator = Math.min(b._accumulator + frameMs/1000, 3 * FIXED_DT);

      // ⭐ RIM GEOMETRY: Physics-Synchronized (ШАГ 2)
      // 🔒 ФИЗИКА: идеальный круг в горизонтальной плоскости (SI метры)
      // Радиус физической коллизии = 0.255м (больше чем FIBA для удобства геймплея)
      // 👁️  ВИЗУАЛ: синхронизирован с физикой (RIM_R_M * M2PX)
      // ВАЖНО: Physics rim = Visual rim (оба используют одну константу RIM_R_M)

      const C: PhysicsConstantsM = {
        GRAVITY: 9.81, BALL_MASS: 0.623, BALL_RADIUS_M: 0.12,
        RIM_RADIUS_M: RIM_R_M,       // ✅ 0.765m (0.255 × 3, увеличено для удобства)
        RIM_TUBE_R_M: 0.02,          // ✅ rim thickness 2cm
        NET_ZONE_DEPTH_M: 0.8,
        E_RIM: 0.45, MU_RIM: 0.35, Cd: 0.004, Cm: 0.000045, OMEGA_DECAY: 0.985,
        HOOP_X_M: STAND_X / SCALE, HOOP_Y_M: STAND_Y / SCALE,
        BOARD_X_M: (BD_X - BD_W) / SCALE, BOARD_TOP_M: (STAND_Y - BD_H * 0.5) / SCALE,
        BOARD_BOT_M: (STAND_Y + BD_H * 0.5) / SCALE, GROUND_Y_M: GY / SCALE,
        POLE_X_M: (STAND_X - RIM_R * 3) / SCALE,
      };

      // ✅ VALIDATE RIM ALIGNMENT (once per frame to verify physics is correct)
      validateRimAlignment(C);

      // 🔴 КРИТИЧНО: Обмеження на кількість фізичних ітерацій за кадр
      // При лагу (dt > 50ms) accumulator може накопичити 5+ FIXED_DT
      // Без обмеження м'яч телепортується на 5+ кроків одночасно!
      const MAX_PHYSICS_STEPS = 5;
      let physicsSteps = 0;

      while (b._accumulator >= FIXED_DT && b.state === 'flying' && physicsSteps < MAX_PHYSICS_STEPS) {
        physicsSteps++;
        const prev_y_before_step = b._y_m;
        integratePhysics(b, FIXED_DT, C);

        // Magnus lift from backspin
        const magnus_lift = b.omega * (C.MAGNUS_COEFFICIENT ?? 0.06);
        b.vy -= magnus_lift * FIXED_DT;

        // Spin decay
        b.omega *= (1 - (C.SPIN_DECAY_RATE ?? 0.25) * FIXED_DT);

        checkAllCollisions(b, FIXED_DT, C);
        // ✅ SCORING SYSTEM: ШАГ 7 — порядок вызовов
        // 1. checkRimCollision (내장 в checkAllCollisions) — физика коллизий
        // 2. checkScoring (ШАГ 6) — цилиндр попадания
        if (!checkScoring(b, prev_y_before_step, C)) {
          checkGateScoring(b, C, prev_y_before_step);
        }
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
          // Меж: від горизонталі вліво (-π*0.98) до вертикалі вгору (-π/2)
          if (ss.aimAngle < -Math.PI * 0.98) { ss.aimAngle = -Math.PI * 0.98; ss.aimDir = 1; }
          if (ss.aimAngle > -Math.PI * 0.5) { ss.aimAngle = -Math.PI * 0.5; ss.aimDir = -1; }
        }
        if (ss.phase === 'charging') {
          // Oscillate distance indicator marker with arcade-style difficulty
          const distToHoop = Math.hypot(STAND_X - (p.x - 15*scaleX), STAND_Y - (p.y - 55*scaleY));
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

      // Pure physics scoring - no accuracy UI
      const ss = gs.shootStates[idx];
      const distMeters = (ss.distToHoop ? (ss.distToHoop / 140).toFixed(1) : '?');

      let flashText = `✅ ГІОЛ! +1 (${distMeters}m)`;
      let flashColor = '#44ff44';

      if (ss.ball?.outcome === 'bank') {
        flashText = `🏦 BANK! +1 (${distMeters}m)`;
        flashColor = '#ff8800';
      }

      addFlash(flashText, STAND_X + 55*scaleX, STAND_Y - 45*scaleY, flashColor);

      const ball = ss.ball;
      gs.netSwing = { type: 'DIRECT', startTime: Date.now(), duration: 200 };

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
      const distToHoop = Math.hypot(STAND_X - px, STAND_Y - py);

      // Pure physics - no arcade meter UI

    }

    function drawBasket() {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // ═══════════════════════════════════════════════════════════
      // 🏀 НОВАЯ СИСТЕМА РЕНДЕРА (SIDE-VIEW)
      // ═══════════════════════════════════════════════════════════

      // ── ЩИТ (BACKBOARD) ─────────────────────────
      // ШАГ 6: щит торчит больше вверх над кольцом
      // ИЗМЕНЕНИЕ 2: верхняя часть × 2, нижняя не менять
      const BD_TOP = BD_H * 0.75 * 2;   // верхняя часть × 2
      const BD_BOT = BD_H * 0.25;        // нижняя часть без изменений
      const BD_TOTAL = BD_TOP + BD_BOT;

      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(BD_X, STAND_Y - BD_TOP, BD_W, BD_TOTAL);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(BD_X, STAND_Y - BD_TOP, BD_W, BD_TOTAL);

      // Прицельный квадрат на щите (оранжевый) — оставить на той же высоте относительно кольца
      ctx.strokeStyle = '#FF6600';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        BD_X + BD_W * 0.1,
        STAND_Y - BD_H * 0.2,   // не менять
        BD_W * 0.8,
        BD_H * 0.38              // не менять
      );

      // ── КОЛЬЦО (2D SIDE-VIEW) ─────────────────────────
      // Горизонтальная линия кольца (перекладина)
      ctx.beginPath();
      ctx.moveTo(STAND_X - RIM_R, STAND_Y);
      ctx.lineTo(STAND_X + RIM_R, STAND_Y);
      ctx.strokeStyle = '#CC4400';
      ctx.lineWidth = 0.022 * SCALE;
      ctx.stroke();

      // Левый обод (circle)
      ctx.beginPath();
      ctx.arc(STAND_X - RIM_R, STAND_Y, 0.02 * SCALE, 0, Math.PI * 2);
      ctx.fillStyle = '#CC4400';
      ctx.fill();

      // Правый обод (circle)
      ctx.beginPath();
      ctx.arc(STAND_X + RIM_R, STAND_Y, 0.02 * SCALE, 0, Math.PI * 2);
      ctx.fillStyle = '#CC4400';
      ctx.fill();

      // Кронштейн (крепление кольца к щиту) — УМЕНЬШЕН В 3 РАЗА
      ctx.beginPath();
      ctx.moveTo(BD_X + BD_W, STAND_Y);
      ctx.lineTo(STAND_X - RIM_R, STAND_Y);
      ctx.strokeStyle = '#883300';
      ctx.lineWidth = (0.014 * SCALE) / 3;  // УМЕНЬШЕН 3x для пропорции
      ctx.stroke();

      // ── СЕТКА (TRAPEZOID FROM VERTICAL LINES) ─────────────────────────
      const NET_H_PX  = RIM_R * 1.4;
      const NET_TOP_W = RIM_R * 2.0;
      const NET_BOT_W = RIM_R * 0.85;
      const NET_LINES = 8;

      for (let i = 0; i <= NET_LINES; i++) {
        const t    = i / NET_LINES;
        const topX = (STAND_X - RIM_R) + t * NET_TOP_W;
        const botX = (STAND_X - RIM_R + (NET_TOP_W - NET_BOT_W) * 0.5) + t * NET_BOT_W;
        ctx.beginPath();
        ctx.moveTo(topX, STAND_Y);
        ctx.lineTo(botX, STAND_Y + NET_H_PX);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Горизонтальные нити (3 штуки)
      for (let j = 1; j <= 3; j++) {
        const ty = j / 3;
        const lx = (STAND_X - RIM_R) + (NET_TOP_W - NET_BOT_W) * 0.5 * ty;
        const rx = lx + NET_TOP_W - (NET_TOP_W - NET_BOT_W) * ty;
        ctx.beginPath();
        ctx.moveTo(lx, STAND_Y + NET_H_PX * ty);
        ctx.lineTo(rx, STAND_Y + NET_H_PX * ty);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── GOAL FLASH (goal celebration animation) ─────
      if (gs.netShake) {
        const a = Math.max(0, (gs.netShakeEnd - Date.now()) / 700);
        ctx.globalAlpha = a * 0.3;
        ctx.fillStyle = '#44FF44';
        ctx.fillRect(STAND_X - RIM_R - 20, STAND_Y - 30, NET_TOP_W + 40, NET_H_PX + 60);
      }
      ctx.globalAlpha = 1;

      // ── DEBUG OVERLAY (if enabled) ─────
      if (gs.debugPhysicsCircle) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        // Draw rim collision zones (left and right rim)
        ctx.beginPath();
        ctx.arc(STAND_X - RIM_R, STAND_Y, 0.02 * SCALE + 0.03 * SCALE, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(STAND_X + RIM_R, STAND_Y, 0.02 * SCALE + 0.03 * SCALE, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();
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
        const isMine = i === 0;
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
            ctx.arc(STAND_X, STAND_Y, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // СИНЯ ДИНАМІЧНА ДУГА (поточна сила)
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

        if (isMine && ss.ball && ss.phase === 'flying') {

          ctx.save();
          ctx.translate(ss.ball.x, ss.ball.y);
          ctx.rotate(ss.ball.rot);
          drawBball(0, 0, 11*scaleX);
          ctx.restore();
        } else if (ss.ball) {

        }
        if (isMine && ss.ball && ss.phase === 'auto_run') {
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
            aimAngle: ss.aimAngle || -Math.PI * 0.98,
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

    // DEBUG MODE: Press 'D' to toggle physics rim circle visualization
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd') {
        gs.debugPhysicsCircle = !gs.debugPhysicsCircle;
        console.log(`🔵 Physics Debug Circle: ${gs.debugPhysicsCircle ? '✅ ON' : '❌ OFF'}`);
      }
    });

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
          const behindBoard = (p.x - 15*scaleX) < BD_X;
          // 🚨 ВИПРАВЛЕННЯ: Обидва кути повинні бути вверх (від'ємні в canvas coords)
          // Стрілка рухається від горизонталі вліво до вертикалі вгору
          // (0° = вправо, -π/2 = вгору, -π = вліво)
          ss.aimAngle = -Math.PI * 0.98;  // старт: майже горизонталь вліво
          ss.aimDir = 1;  // до вертикалі (вгору)
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
          const hoopX_m = STAND_X / SCALE;
          const hoopY_m = STAND_Y / SCALE;
          const groundY_m = GY / SCALE;

          const dx_m = hoopX_m - headX_m;
          const dy_m = hoopY_m - headY_m;

          const theta = -ss.lockedAngle;  // canvas угол (від'ємне = вгору) → математичний

          // 🎯 ГАРАНТОВАНА ДУГА: Знайти швидкість яка доводить м'яч найближче до кільця
          // Використовуємо simulateTrajectory для точного симулювання (та сама фізика що й в гру)
          let bestV = 8.0;
          let bestDist = 9999;
          let bestTraj: Array<{ x: number; y: number }> = [];

          for (let v = 4.0; v <= 18.0; v += 0.15) {
            const vx_test = Math.cos(theta) * v;
            const vy_test = -Math.sin(theta) * v;

            const traj = simulateTrajectory({
              vx_m: vx_test,
              vy_m: vy_test,
              x0_m: headX_m,
              y0_m: headY_m,
              scale: SCALE,
              groundY_m: groundY_m,
              hoopX_m: hoopX_m,
              hoopY_m: hoopY_m,
            });

            // Знайти мінімальну відстань до кільця по траєкторії
            for (const pt of traj) {
              const x_m = pt.x / SCALE;
              const y_m = pt.y / SCALE;
              const dx_test = x_m - hoopX_m;
              const dy_test = y_m - hoopY_m;
              const dist = Math.sqrt(dx_test*dx_test + dy_test*dy_test);

              if (dist < bestDist) {
                bestDist = dist;
                bestV = v;
                bestTraj = traj;
              }
            }
          }

          const v_ideal = bestV;
          ss.idealVelocity = v_ideal;
          ss.idealPower = Math.max(0.05, Math.min(0.95, (v_ideal - 4.0) / 14.0));

          const vx_ideal = Math.cos(theta) * v_ideal;
          const vy_ideal = -Math.sin(theta) * v_ideal;

          // 📊 DETAILED BESTV SEARCH DIAGNOSTICS (logged to browser console on Click 1)
          if (typeof window !== 'undefined') {
            setTimeout(() => {
              console.log('[BEST_V_SEARCH]', {
                bestV: bestV.toFixed(2),
                bestDist_m: bestDist.toFixed(3),
                theta_deg: (theta * 180/Math.PI).toFixed(1),
                headX_m: headX_m.toFixed(3),
                headY_m: headY_m.toFixed(3),
                hoopX_m: hoopX_m.toFixed(3),
                hoopY_m: hoopY_m.toFixed(3),
                dx_m: (hoopX_m - headX_m).toFixed(3),
                dy_m: (hoopY_m - headY_m).toFixed(3),
                idealPower: ss.idealPower?.toFixed(4),
                reachesHoop: (bestDist < 0.5) ? '✅ YES' : '❌ NO - MISSES',
                vx_ideal: vx_ideal.toFixed(3),
                vy_ideal: vy_ideal.toFixed(3),
                vx_sign: vx_ideal < 0 ? '✅ LEFT (correct)' : '❌ RIGHT (wrong)',
                vy_sign: vy_ideal < 0 ? '✅ UP (correct)' : '❌ DOWN (wrong)',
              });
            }, 0);
          }

          // Генерировать дугу через simulateTrajectory з гарантією досягнення кільця
          ss.idealTraj = simulateTrajectory({
            vx_m: vx_ideal,
            vy_m: vy_ideal,
            x0_m: headX_m,
            y0_m: headY_m,
            scale: SCALE,
            groundY_m: groundY_m,
            hoopX_m: hoopX_m,
            hoopY_m: hoopY_m,
          });

          console.log('[ARC DIAGNOSTIC]', {
            head_px: {x: Math.round(headX_m*SCALE), y: Math.round(headY_m*SCALE)},
            hoop_px: {x: Math.round(STAND_X), y: Math.round(STAND_Y)},
            dx_m: dx_m.toFixed(3),
            dy_m: dy_m.toFixed(3),
            theta_deg: (theta * 180/Math.PI).toFixed(1),
            v_ideal: v_ideal.toFixed(3),
            vx_ideal: vx_ideal.toFixed(3),
            vy_ideal: vy_ideal.toFixed(3),
          });

          console.log('[ARC END]', {
            arc_length: ss.idealTraj?.length,
            arc_first: ss.idealTraj?.[0],
            arc_last: ss.idealTraj?.[ss.idealTraj?.length - 1],
            hoop: {x: STAND_X, y: STAND_Y},
            error_px: ss.idealTraj?.length > 0 ? {
              dx: Math.round(ss.idealTraj[ss.idealTraj.length-1].x - STAND_X),
              dy: Math.round(ss.idealTraj[ss.idealTraj.length-1].y - STAND_Y),
            } : 'no arc',
            bestDist_m: bestDist.toFixed(4),
            v_ideal_used: v_ideal.toFixed(3),
          });

          ss.phase = "charging";
          ss.power = 0;
          ss.powerDir = 1;

          const tolerance = 0.08;  // ±8% от идеальной силы (в 0-1 scale)

          markerPosRef.current = ss.idealPower;
          markerDirRef.current = 1;
        } else if (ss.phase === "charging") {
          // 🎯 КЛІК 3: КИДОК З ЧИСТОЇ МЕТРИКИ
          // Мяч повинен рухатись РОВНО з тією ж швидкістю що й v_ideal (червона дуга)

          const theta3 = -ss.lockedAngle;
          const hx_m3 = (p.x - 15*scaleX) / SCALE;
          const hy_m3 = (p.y - 52*scaleY) / SCALE;

          // 🎯 ГАРАНТІЯ: Швидкість = 4.0 + power * 14.0 (та сама формула що й для idealPower)
          const launch_speed = 4.0 + markerPosRef.current * 14.0;  // 4-18 м/с

          const vx_m = Math.cos(theta3) * launch_speed;
          const vy_m = -Math.sin(theta3) * launch_speed;

          ss.ball = {
            _x_m: hx_m3, _y_m: hy_m3,
            vx: vx_m, vy: vy_m,
            omega: 0,
            x: hx_m3 * SCALE, y: hy_m3 * SCALE,  // пиксели = метри × SCALE (синхронізовано з _x_m/_y_m)
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

          if (typeof window !== 'undefined') {
            setTimeout(() => {
              console.log('[LAUNCH DIAGNOSTIC]', {
                theta_deg: (theta3 * 180 / Math.PI).toFixed(1),
                ss_power: markerPosRef.current.toFixed(4),
                idealPower: ss.idealPower?.toFixed(4),
                idealVelocity_ms: ss.idealVelocity?.toFixed(3),
                launch_speed_computed: launch_speed.toFixed(3),
                vx_m: vx_m.toFixed(3),
                vy_m: vy_m.toFixed(3),
              });
            }, 0);
          }

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

    // ════════════════════════════════════════════════════════════════
    // ШАГ 7: АВТО-ТЕСТ 10/10 — гонять пока не 10/10
    // ════════════════════════════════════════════════════════════════
    function runHoopTest(physicsC: PhysicsConstantsM): void {
      let passed = 0;
      const results: string[] = [];

      for (let i = 0; i < 10; i++) {
        const testBall = {
          _x_m: physicsC.HOOP_X_M,           // точно по центру
          _y_m: physicsC.HOOP_Y_M - 1.0,     // 1м выше кольца
          vx: 0,
          vy: 4.0,                             // летит вниз
          _scored: false,
          omega: 0,
          _accumulator: 0,
          _physTick: 0,
          _checkpoints: [],
          _scale: 1,
          rimContacts: 0,
          rimContactMask: 0,
          hitBackboard: false,
          rimHitTimer: 0,
          x: 0,
          y: 0,
          rot: 0,
          state: 'flying',
          scoredGoal: false,
          outcome: 'in_progress',
          spin: 0,
        } as unknown as BallStateM;

        let scored = false;
        for (let frame = 0; frame < 120; frame++) {
          const prevY = testBall._y_m;
          testBall.vy  += physicsC.GRAVITY * (1/60);
          testBall._y_m += testBall.vy  * (1/60);
          testBall._x_m += testBall.vx  * (1/60);
          checkRimCollision(testBall as BallStateM, physicsC);
          if (checkScoring(testBall as BallStateM, prevY, physicsC)) {
            scored = true;
            break;
          }
        }

        if (scored) passed++;
        results.push(`Ball ${i+1}: ${scored ? '✅ GOAL' : '❌ MISS'} | finalX=${testBall._x_m.toFixed(3)} finalY=${testBall._y_m.toFixed(3)}`);
      }

      console.log('═══════════════════════════════');
      console.log(`🏀 HOOP TEST RESULT: ${passed}/10`);
      results.forEach(r => console.log(r));
      console.log('HOOP_X_M:', physicsC.HOOP_X_M, 'HOOP_Y_M:', physicsC.HOOP_Y_M);
      console.log('RIM_RADIUS_M:', physicsC.RIM_RADIUS_M, 'BALL_R_M:', physicsC.BALL_RADIUS_M);
      console.log('═══════════════════════════════');

      if (passed < 10) {
        console.error('❌ ТЕСТ НЕ ПРОЙДЕН! Исправь физику до 10/10');
      } else {
        console.log('✅ ТЕСТ ПРОЙДЕН — 10/10 попаданий!');
      }
    }

    // Вызвать тест один раз при инициализации
    const runHoopTestOnce = runHoopTest;

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
    gs.shootStates.push({ phase:null,aimAngle:-Math.PI*0.98,aimDir:1,power:0,powerDir:1,ball:null,lockedAngle:null,idealTraj:null,idealSpeed:10,runTarget:null,inDanger:false });

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
