"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface RucheekGameOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userPhone: string;
  containerWidth?: number;
  containerHeight?: number;
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

interface ShootState {
  phase: null | "aiming" | "charging" | "flying" | "auto_run" | "manual_run" | "pickup_wait";
  aimAngle: number;
  aimDir: number;
  power: number;
  powerDir: number;
  ball: any;
  lockedAngle: number | null;
  idealTraj: any;
  idealSpeed: number;
  runTarget: { x: number; y: number } | null;
  inDanger: boolean;
}

export default function RucheekGameOverlay({
  isOpen,
  onClose,
  userName,
  userPhone,
  containerWidth = 400,
  containerHeight = 500,
}: RucheekGameOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"waiting" | "playing" | "finished">("waiting");
  const [queue, setQueue] = useState<{ name: string; playerId: string; timestamp: number }[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerIndices, setMyPlayerIndices] = useState<number[]>([]);

  // Масштабирование
  const scaleX = containerWidth / 860;
  const scaleY = containerHeight / 624;

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
    if (!isOpen) return;

    const loadQueue = () => {
      try {
        const saved = localStorage.getItem("rucheek_queue");
        if (saved) {
          setQueue(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Failed to load queue:", e);
      }
    };

    loadQueue();

    // Слушать изменения в других вкладках
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "rucheek_queue") {
        loadQueue();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isOpen]);

  // Сохранить очередь в localStorage
  const saveQueue = useCallback((newQueue: typeof queue) => {
    setQueue(newQueue);
    localStorage.setItem("rucheek_queue", JSON.stringify(newQueue));
  }, []);

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
  }, [queue, userPhone, P_START, P_STEP, GY, PLAYER_COLORS]);

  // Рендеринг игры на canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current || gameState !== "playing") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      // Очистить canvas
      ctx.clearRect(0, 0, containerWidth, containerHeight);

      // Фон (прозрачный)
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, containerWidth, containerHeight);

      // Линия подлоги
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, GY);
      ctx.lineTo(containerWidth, GY);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Рисуем кошик
      drawBasket(ctx);

      // Рисуем игроков
      players.forEach((p, i) => {
        if (p.status === "eliminated") return;
        drawPlayer(ctx, p, i);
      });
    };

    const animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [isOpen, gameState, players, containerWidth, containerHeight, GY, POLE_X, ARM_X, BOARD_X, BOARD_W, BOARD_TOP, BOARD_BOT, BOARD_FACE, HOOP_X, HOOP_Y, HOOP_R]);

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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0d1117",
          borderRadius: "12px",
          padding: "20px",
          maxWidth: "90vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ color: "#ffdd00", margin: 0, fontSize: "18px" }}>🏀 РУЧЕЁК</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={containerWidth}
          height={containerHeight}
          style={{
            background: "#111827",
            borderRadius: "8px",
            border: "1px solid #1e2d4a",
            display: "block",
          }}
        />

        {/* Очередь */}
        <div style={{ background: "#1a1f35", padding: "12px", borderRadius: "8px", color: "#fff" }}>
          <div style={{ fontSize: "12px", color: "#ffdd00", marginBottom: "8px", fontWeight: "bold" }}>
            🏀 Очередь ({queue.length}/6):
          </div>
          {queue.length === 0 ? (
            <div style={{ fontSize: "12px", color: "#999" }}>Очередь пуста</div>
          ) : (
            <div style={{ fontSize: "12px", color: "#ccc" }}>
              {queue.map((q, i) => (
                <div key={i}>
                  {i + 1}. {q.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={addPlayerToQueue}
            style={{
              flex: 1,
              padding: "10px",
              background: "#27ae60",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            + Добавить
          </button>
          <button
            onClick={startGame}
            disabled={queue.length < 2}
            style={{
              flex: 1,
              padding: "10px",
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
      </div>
    </div>
  );
}
