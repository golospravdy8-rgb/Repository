"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface RucheekGameCanvasProps {
  isVisible: boolean;
  userName: string;
  userPhone: string;
  onQueueUpdate?: (queue: any[]) => void;
}

interface Player {
  name: string;
  playerId: string;
  x: number;
  y: number;
  score: number;
  kills: number;
  status: "idle" | "running" | "shooting" | "eliminated";
  rf: number;
  color: string;
  ownerId: string;
}

export default function RucheekGameCanvas({
  isVisible,
  userName,
  userPhone,
  onQueueUpdate,
}: RucheekGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"waiting" | "playing" | "finished">("waiting");
  const [queue, setQueue] = useState<{ name: string; playerId: string; timestamp: number }[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerIndices, setMyPlayerIndices] = useState<number[]>([]);
  const [selectedMoveIdx, setSelectedMoveIdx] = useState(-1);
  const [showQueuePanel, setShowQueuePanel] = useState(false);

  // Масштабирование под размер окна браузера
  const scaleX = typeof window !== "undefined" ? window.innerWidth / 860 : 1;
  const scaleY = typeof window !== "undefined" ? window.innerHeight / 624 : 1;

  // Константы (адаптированные)
  const HOOP_X = 188 * scaleX;
  const HOOP_Y = 307 * scaleY;
  const HOOP_R = 27 * scaleX;
  const GY = 584 * scaleY;
  const POLE_X = 80 * scaleX;
  const ARM_X = 120 * scaleX;
  const BOARD_X = 125 * scaleX;
  const BOARD_W = 10 * scaleX;
  const BOARD_TOP = 189 * scaleY;
  const BOARD_BOT = 292 * scaleY;
  const BOARD_FACE = BOARD_X + BOARD_W;
  const P_START = 680 * scaleX;
  const P_STEP = 58 * scaleX;
  const G = 0.22;

  const PLAYER_COLORS = ["#4fc3f7", "#81c784", "#ffb74d", "#f06292", "#ce93d8", "#80cbc4"];

  // Загрузить очередь из localStorage
  useEffect(() => {
    if (!isVisible) return;

    const loadQueue = () => {
      try {
        const saved = localStorage.getItem("rucheek_queue");
        if (saved) {
          const q = JSON.parse(saved);
          setQueue(q);
          onQueueUpdate?.(q);
        }
      } catch (e) {
        console.error("Failed to load queue:", e);
      }
    };

    loadQueue();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "rucheek_queue") {
        loadQueue();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isVisible, onQueueUpdate]);

  // Сохранить очередь в localStorage
  const saveQueue = useCallback((newQueue: typeof queue) => {
    setQueue(newQueue);
    localStorage.setItem("rucheek_queue", JSON.stringify(newQueue));
    onQueueUpdate?.(newQueue);
  }, [onQueueUpdate]);

  // Добавить игрока в очередь
  const addPlayerToQueue = useCallback(() => {
    if (queue.length >= 6) {
      alert("Максимум 6 игроков!");
      return;
    }

    const newQueue = [
      ...queue,
      { name: userName, playerId: userPhone, timestamp: Date.now() },
    ];
    saveQueue(newQueue);
  }, [queue, userName, userPhone, saveQueue]);

  // Запустить игру
  const startGame = useCallback(() => {
    if (queue.length < 2) {
      alert("Нужно минимум 2 игрока!");
      return;
    }

    const newPlayers: Player[] = queue.map((q, i) => ({
      name: q.name,
      playerId: q.playerId,
      x: P_START + i * P_STEP,
      y: GY,
      score: 0,
      kills: 0,
      status: "idle",
      rf: 0,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      ownerId: q.playerId,
    }));

    setPlayers(newPlayers);
    setMyPlayerIndices(
      newPlayers
        .map((p, i) => (p.ownerId === userPhone ? i : -1))
        .filter((i) => i !== -1)
    );
    setGameState("playing");
    setShowQueuePanel(true);
  }, [queue, userPhone, P_START, P_STEP, GY, PLAYER_COLORS]);

  // Рендеринг игры на canvas
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Обновить размер canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const render = () => {
      // Очистить canvas (прозрачный фон)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (gameState === "playing") {
        // Линия подлоги
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, GY);
        ctx.lineTo(canvas.width, GY);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Рисуем кошик
        drawBasket(ctx);

        // Рисуем игроков
        players.forEach((p, i) => {
          if (p.status === "eliminated") return;
          drawPlayer(ctx, p, i);
        });
      }
    };

    const animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [isVisible, gameState, players, GY, POLE_X, ARM_X, BOARD_X, BOARD_W, BOARD_TOP, BOARD_BOT, BOARD_FACE, HOOP_X, HOOP_Y, HOOP_R, scaleX, scaleY]);

  const drawBasket = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.strokeStyle = "#e05545";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;

    // Стовп
    ctx.beginPath();
    ctx.moveTo(POLE_X, GY);
    ctx.lineTo(POLE_X, 209 * scaleY);
    ctx.stroke();

    // Рука
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(POLE_X, 209 * scaleY);
    ctx.lineTo(ARM_X, 209 * scaleY);
    ctx.stroke();

    // Щит
    ctx.strokeRect(BOARD_X, BOARD_TOP, BOARD_W, BOARD_BOT - BOARD_TOP);

    // Кольцо
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(HOOP_X, HOOP_Y, HOOP_R, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player, index: number) => {
    const isMine = myPlayerIndices.includes(index);
    const headR = 10 * scaleY;
    const headY = player.y - 54 * scaleY;

    ctx.save();
    ctx.fillStyle = player.color;
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Голова
    ctx.beginPath();
    ctx.arc(player.x, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Тело
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 43 * scaleY);
    ctx.lineTo(player.x, player.y - 18 * scaleY);
    ctx.stroke();

    // Руки
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 37 * scaleY);
    ctx.lineTo(player.x + 17 * scaleX, player.y - 22 * scaleY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 37 * scaleY);
    ctx.lineTo(player.x - 12 * scaleX, player.y - 26 * scaleY);
    ctx.stroke();

    // Ноги
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 18 * scaleY);
    ctx.lineTo(player.x - 10 * scaleX, player.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 18 * scaleY);
    ctx.lineTo(player.x + 10 * scaleX, player.y);
    ctx.stroke();

    // Ім'я
    ctx.fillStyle = isMine ? player.color : "rgba(180,180,180,0.6)";
    ctx.font = `${isMine ? "bold " : ""}11px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${isMine ? "👤 " : "🔒 "}${player.name}`, player.x, player.y - 73 * scaleY);

    // Очки
    ctx.fillStyle = "#ffdd00";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`🏀 ${player.score}`, player.x, player.y - 61 * scaleY);

    ctx.restore();
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const canvasContent = (
    <>
      {/* Прозрачный canvas overlay поверх всей страницы */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          pointerEvents: gameState === "playing" ? "auto" : "none",
          background: "transparent",
        }}
      />

      {/* Панель очереди (маленький блок в углу) */}
      {showQueuePanel && gameState === "playing" && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "rgba(20, 20, 30, 0.95)",
            border: "2px solid #e05545",
            borderRadius: "10px",
            padding: "12px 16px",
            color: "#fff",
            fontFamily: "sans-serif",
            fontSize: "12px",
            zIndex: 9001,
            maxWidth: "280px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.8)",
          }}
        >
          <div style={{ color: "#ffdd00", marginBottom: "8px", fontWeight: "bold" }}>
            🏀 Очередь ({queue.length}/6):
          </div>
          {queue.map((q, i) => (
            <div key={i} style={{ color: q.playerId === userPhone ? "#44ff88" : "#ccc" }}>
              {i + 1}. {q.name}
            </div>
          ))}
        </div>
      )}

      {/* Кнопки управления (маленькая панель) */}
      {gameState === "waiting" && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 9001,
          }}
        >
          <button
            onClick={addPlayerToQueue}
            style={{
              padding: "10px 16px",
              background: "#27ae60",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            + Додати
          </button>
          <button
            onClick={startGame}
            disabled={queue.length < 2}
            style={{
              padding: "10px 16px",
              background: queue.length < 2 ? "#444" : "#e05545",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: queue.length < 2 ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "13px",
              opacity: queue.length < 2 ? 0.5 : 1,
            }}
          >
            ▶ Старт
          </button>
        </div>
      )}
    </>
  );

  if (!isVisible) return null;

  return createPortal(canvasContent, document.body);
}
