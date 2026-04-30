// 🏀 FIREBASE ИГРОВОЙ СЕРВИС (ИСПРАВЛЕННЫЙ)
// С throttling, cleanup и heartbeat

import {
  ref,
  set,
  onValue,
  update,
  remove,
  get,
  onDisconnect,
} from "firebase/database";
import { getFirebaseDatabase, initializeFirebase } from "./firebase";

export { initializeFirebase };

// ⏱️ THROTTLING: Не отправлять часто
const THROTTLE_MS = 50; // Отправлять max каждые 50ms
const HEARTBEAT_MS = 5000; // Heartbeat каждые 5 секунд
const CLEANUP_MS = 10000; // Удалить неживых через 10 сек

// Для throttling движения
const lastUpdateTimeRef = new Map<string, number>();

// ============================================
// 👤 ПРИСОЕДИНЕНИЕ ИГРОКА (С CLEANUP)
// ============================================
export async function joinGame(
  roomId: string,
  playerId: string,
  nickname: string,
  playerIndex: number,
  x: number = 480,
  y: number = 400
) {
  const db = getFirebaseDatabase();
  const playerRef = ref(db, `games/${roomId}/players/${playerId}`);

  console.log(`👤 Присоединяю ${nickname} к комнате ${roomId}`);

  // ОСНОВНЫЕ ДАННЫЕ
  const playerData = {
    id: playerId,
    nickname,
    x,
    y,
    score: 0,
    playerIndex,
    status: "alive",
    timestamp: Date.now(),
    lastHeartbeat: Date.now(), // ← НОВОЕ: Heartbeat для cleanup
  };

  await set(playerRef, playerData);

  // 🔴 ВАЖНО: onDisconnect - удалить игрока если он отключился
  onDisconnect(playerRef).remove();

  // 💓 HEARTBEAT: Отправлять heartbeat каждые 5 секунд
  const heartbeatInterval = setInterval(async () => {
    try {
      const playerSnapshot = await get(playerRef);
      if (playerSnapshot.exists()) {
        await update(playerRef, {
          lastHeartbeat: Date.now(),
        });
      } else {
        clearInterval(heartbeatInterval);
      }
    } catch (err) {
      console.error("❌ Heartbeat ошибка:", err);
    }
  }, HEARTBEAT_MS);

  console.log(`✅ ${nickname} присоединился!`);

  return heartbeatInterval;
}

// ============================================
// 👣 ОБНОВЛЕНИЕ ПОЗИЦИИ (С THROTTLING)
// ============================================
export async function updatePlayerPosition(
  roomId: string,
  playerId: string,
  x: number,
  y: number
) {
  // 🔴 THROTTLING: Не отправлять слишком часто!
  const now = Date.now();
  const lastUpdate = lastUpdateTimeRef.get(playerId) || 0;

  if (now - lastUpdate < THROTTLE_MS) {
    // Слишком рано, пропустить
    return;
  }

  lastUpdateTimeRef.set(playerId, now);

  const db = getFirebaseDatabase();
  const playerRef = ref(db, `games/${roomId}/players/${playerId}`);

  // Округлить координаты до целых (меньше данных)
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);

  try {
    await update(playerRef, {
      x: roundedX,
      y: roundedY,
      timestamp: now,
      lastHeartbeat: now, // Обновляем heartbeat при движении
    });
  } catch (err) {
    console.error("❌ Position update ошибка:", err);
  }
}

// ============================================
// 🎯 ОБНОВЛЕНИЕ СОСТОЯНИЯ МЯЧА
// ============================================

// Вычислить hash траектории для детектирования десинхрона
export function computeTrajectoryHash(x: number, y: number, vx: number, vy: number): string {
  return `${Math.round(x)}-${Math.round(y)}-${Math.round(vx*10)}-${Math.round(vy*10)}`;
}

export async function updateBall(
  roomId: string,
  x: number,
  y: number,
  vx: number,
  vy: number,
  state: number,
  trajectoryHash?: string
) {
  const db = getFirebaseDatabase();
  const ballRef = ref(db, `games/${roomId}/ball`);

  try {
    const ballData: any = {
      x: Math.round(x),
      y: Math.round(y),
      vx: Math.round(vx * 100) / 100, // 2 знака после запятой
      vy: Math.round(vy * 100) / 100,
      state,
      timestamp: Date.now(),
    };

    // Добавить hash траектории для мультиплеєра
    if (trajectoryHash) {
      ballData.trajectoryHash = trajectoryHash;
    }

    await update(ballRef, ballData);
  } catch (err) {
    console.error("❌ Ball update ошибка:", err);
  }
}

// ============================================
// 🎊 ОБНОВЛЕНИЕ СЧЁТА
// ============================================
export async function updateScore(
  roomId: string,
  playerId: string,
  newScore: number
) {
  const db = getFirebaseDatabase();
  const playerRef = ref(db, `games/${roomId}/players/${playerId}`);

  try {
    await update(playerRef, {
      score: newScore,
      timestamp: Date.now(),
      lastHeartbeat: Date.now(),
    });
  } catch (err) {
    console.error("❌ Score update ошибка:", err);
  }
}

// ============================================
// 👥 ПОЛУЧИТЬ ВСЕХ ИГРОКОВ (ONE TIME)
// ============================================
export async function getPlayers(roomId: string) {
  const db = getFirebaseDatabase();
  const playersRef = ref(db, `games/${roomId}/players`);

  const snapshot = await get(playersRef);
  if (snapshot.exists()) {
    return Object.values(snapshot.val());
  }
  return [];
}

// ============================================
// 🏀 ПОЛУЧИТЬ СОСТОЯНИЕ МЯЧА (ONE TIME)
// ============================================
export async function getBallState(roomId: string) {
  const db = getFirebaseDatabase();
  const ballRef = ref(db, `games/${roomId}/ball`);

  const snapshot = await get(ballRef);
  if (snapshot.exists()) {
    return snapshot.val();
  }
  return { x: 300, y: 100, vx: 0, vy: 0, state: 0, timestamp: Date.now() };
}

// ============================================
// 👥 СЛУШАТЬ ИЗМЕНЕНИЯ ИГРОКОВ (С CLEANUP)
// ============================================
export function listenToPlayers(
  roomId: string,
  callback: (players: any[]) => void
) {
  const db = getFirebaseDatabase();
  const playersRef = ref(db, `games/${roomId}/players`);

  const unsubscribe = onValue(playersRef, (snapshot) => {
    if (snapshot.exists()) {
      const playersData = snapshot.val();
      let playersArray = Object.values(playersData) as any[];

      // 🔴 CLEANUP: Удалить призраков (no heartbeat > 10 сек)
      const now = Date.now();
      playersArray = playersArray.filter((player) => {
        const lastHeartbeat = player.lastHeartbeat || player.timestamp || 0;
        const timeSinceHeartbeat = now - lastHeartbeat;

        if (timeSinceHeartbeat > CLEANUP_MS) {
          console.log(
            `🗑️ Удаляю мёртвого игрока: ${player.nickname} (${timeSinceHeartbeat}ms)`
          );
          // Удалить из Firebase
          const playerRef = ref(db, `games/${roomId}/players/${player.id}`);
          remove(playerRef).catch((err) =>
            console.error("Cleanup error:", err)
          );
          return false; // Не включать в список
        }

        return true; // Включить живого игрока
      });

      callback(playersArray);
    } else {
      callback([]);
    }
  });

  return unsubscribe;
}

// ============================================
// 🏀 СЛУШАТЬ ИЗМЕНЕНИЯ МЯЧА (REAL-TIME)
// ============================================
export function listenToBall(
  roomId: string,
  callback: (ball: any) => void
) {
  const db = getFirebaseDatabase();
  const ballRef = ref(db, `games/${roomId}/ball`);

  const unsubscribe = onValue(ballRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    }
  });

  return unsubscribe;
}

// ============================================
// 👋 ВЫХОД ИГРОКА
// ============================================
export async function leaveGame(roomId: string, playerId: string) {
  const db = getFirebaseDatabase();
  const playerRef = ref(db, `games/${roomId}/players/${playerId}`);

  console.log(`👋 Удаляю игрока ${playerId}`);

  try {
    await remove(playerRef);
    console.log(`✅ Игрок удалён`);
  } catch (err) {
    console.error("❌ Leave game ошибка:", err);
  }
}

// ============================================
// 🔄 ИНИЦИАЛИЗИРОВАТЬ КОМНАТУ
// ============================================
export async function initializeRoom(roomId: string) {
  const db = getFirebaseDatabase();
  const roomRef = ref(db, `games/${roomId}`);

  try {
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      console.log(`🔄 Инициализирую комнату ${roomId}`);

      await set(roomRef, {
        players: {},
        ball: {
          x: 300,
          y: 100,
          vx: 0,
          vy: 0,
          state: 0,
          timestamp: Date.now(),
        },
        gameState: "waiting",
        gameTime: 0,
        createdAt: Date.now(),
      });

      console.log(`✅ Комната инициализирована!`);
    }
  } catch (err) {
    console.error("❌ Initialize room ошибка:", err);
  }
}
