"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { joinGameChannel, trackPlayers, getAllPlayers, leaveGameChannel, GamePlayer } from "@/lib/gameChannel";

interface RucheekGameCanvasProps {
  isVisible: boolean;
  userName?: string;
  userPhone?: string;
  gameRoomId?: string;
}

const PLAYER_COLORS = ["#4fc3f7","#81c784","#ffb74d","#f06292","#ce93d8","#80cbc4"];
const MAX_PLAYERS_PER_USER = 3;

export default function RucheekGameCanvas({ isVisible, userName = "", userPhone = "", gameRoomId = "default" }: RucheekGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pnameRef = useRef<HTMLInputElement>(null);
  const btnStartRef = useRef<HTMLButtonElement>(null);
  const channelRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [pname, setPname] = useState(userName);
  const [showModal, setShowModal] = useState(false);
  const [, forceUpdate] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);

  // Game state (local ref)
  const gsRef = useRef<any>({
    state: "waiting",
    myPlayers: [] as GamePlayer[],
    allPlayers: [] as GamePlayer[],
    shootStates: [] as any[],
    flashes: [] as any[],
    selectedMoveIdx: -1,
    disputeP1: 0,
    disputeP2: -1,
    netShake: false,
    netShakeEnd: 0,
    netShakeT: 0,
    turnStartTime: 0,
    turnTimeoutId: null as any,
    eventLog: [] as Array<{text: string, time: number}>,
  });

  useEffect(() => { setMounted(true); }, []);

  // ── Presence-based game channel ──────────────────────────────────────────
  useEffect(() => {
    if (!mounted || !isVisible) return;

    const handlePresenceSync = () => {
      const gs = gsRef.current;
      if (!channelRef.current) return;

      // Get all players from presence (with deduplication)
      gs.allPlayers = getAllPlayers(channelRef.current);
      setPlayerCount(gs.allPlayers.length);
      forceUpdate(n => n + 1);
    };

    const channel = joinGameChannel(gameRoomId, handlePresenceSync);
    channelRef.current = channel;

    // Initial sync
    setTimeout(() => {
      handlePresenceSync();
    }, 50);

    return () => {
      leaveGameChannel(channel);
      channelRef.current = null;
    };
  }, [mounted, isVisible, gameRoomId]);

  // ── Periodic position sync (10 FPS) ──────────────────────────────────────
  useEffect(() => {
    if (!mounted || !isVisible || gsRef.current.state !== 'playing') return;

    const interval = setInterval(() => {
      const gs = gsRef.current;
      if (channelRef.current && gs.myPlayers.length > 0) {
        trackPlayers(channelRef.current, userPhone, gs.myPlayers);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [mounted, isVisible, userPhone]);

  // ── Game loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || !isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const gameLoop = () => {
      const gs = gsRef.current;
      if (gs.state === 'playing') {
        update(gs, canvas);
        draw(gs, ctx, canvas);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawWaitingScreen(ctx, canvas, gs);
      }
      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [mounted, isVisible]);

  // ── Canvas click handler ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || !isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const gs = gsRef.current;

    const handleClick = (e: MouseEvent) => {
      if (gs.state !== 'playing') return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Find clicked player
      for (let i = 0; i < gs.myPlayers.length; i++) {
        const p = gs.myPlayers[i];
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist < 20) {
          gs.selectedMoveIdx = i;
          forceUpdate(n => n + 1);
          return;
        }
      }

      // Move selected player
      if (gs.selectedMoveIdx >= 0) {
        const p = gs.myPlayers[gs.selectedMoveIdx];
        p.x = x;
        p.y = y;
        p.status = 'moving';
        trackPlayers(channelRef.current, userPhone, gs.myPlayers);
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [mounted, isVisible, userPhone]);

  // ── Add player ───────────────────────────────────────────────────────────
  const handleAddPlayer = () => {
    const gs = gsRef.current;
    const myCount = gs.myPlayers.length;

    if (myCount >= MAX_PLAYERS_PER_USER) return;

    const playerId = `${userPhone}-${Date.now()}`;
    const newPlayer: GamePlayer = {
      id: playerId,
      name: pname || `Player ${myCount + 1}`,
      owner: userPhone,
      x: 100 + myCount * 50,
      y: 500,
      status: 'idle',
      hp: 3
    };

    gs.myPlayers.push(newPlayer);
    gs.shootStates.push({ phase: null, ball: null });

    trackPlayers(channelRef.current, userPhone, gs.myPlayers);
    forceUpdate(n => n + 1);
  };

  // ── Start game ───────────────────────────────────────────────────────────
  const handleStart = () => {
    const gs = gsRef.current;
    if (playerCount < 2) return;
    gs.state = 'playing';
    forceUpdate(n => n + 1);
  };

  // ── Leave game ───────────────────────────────────────────────────────────
  const handleLeave = () => {
    const gs = gsRef.current;
    gs.myPlayers = [];
    gs.shootStates = [];
    gs.state = 'waiting';
    trackPlayers(channelRef.current, userPhone, []);
    forceUpdate(n => n + 1);
  };

  return (
    <>
      {isVisible && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          <canvas
            ref={canvasRef}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'auto',
              display: 'block'
            }}
          />
        </div>,
        document.body
      )}

      {isVisible && (
        <div style={{
          position: 'fixed',
          bottom: 100,
          left: 20,
          zIndex: 10000,
          display: 'flex',
          gap: 10,
          flexDirection: 'column'
        }}>
          <input
            ref={pnameRef}
            type="text"
            value={pname}
            onChange={(e) => setPname(e.target.value)}
            placeholder="Player name"
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #ccc',
              fontSize: 14
            }}
          />
          <button
            onClick={handleAddPlayer}
            style={{
              padding: '10px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#4fc3f7',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🏀 Гравець
          </button>
          <button
            ref={btnStartRef}
            onClick={handleStart}
            disabled={playerCount < 2}
            style={{
              padding: '10px 16px',
              borderRadius: 6,
              border: 'none',
              background: playerCount >= 2 ? '#81c784' : '#ccc',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: playerCount >= 2 ? 'pointer' : 'not-allowed'
            }}
          >
            ▶️ Старт ({playerCount})
          </button>
          <button
            onClick={handleLeave}
            style={{
              padding: '10px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#f06292',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ❌ Вихід
          </button>
        </div>
      )}
    </>
  );
}

// ============================================================================
// GAME LOGIC
// ============================================================================

function update(gs: any, canvas: HTMLCanvasElement) {
  // Placeholder for game physics
}

function draw(gs: any, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw all players
  gs.allPlayers.forEach((player: GamePlayer) => {
    drawPlayer(ctx, player);
  });

  // Draw basket
  drawBasket(ctx, canvas);
}

function drawWaitingScreen(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, gs: any) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏀 Рухейок', canvas.width / 2, canvas.height / 2 - 40);

  ctx.font = '16px sans-serif';
  ctx.fillText(`Гравців: ${gs.allPlayers.length}`, canvas.width / 2, canvas.height / 2 + 20);
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: GamePlayer) {
  ctx.save();
  ctx.fillStyle = PLAYER_COLORS[Math.abs(player.owner.charCodeAt(0)) % PLAYER_COLORS.length];

  // Head
  ctx.beginPath();
  ctx.arc(player.x, player.y - 28, 6, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 22);
  ctx.lineTo(player.x, player.y - 8);
  ctx.stroke();

  // Name
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(player.name, player.x, player.y + 15);

  ctx.restore();
}

function drawBasket(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const x = 60;
  const y = canvas.height - 100;

  ctx.save();
  ctx.strokeStyle = '#e05545';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  // Pole
  ctx.beginPath();
  ctx.moveTo(x, canvas.height - 20);
  ctx.lineTo(x, y - 40);
  ctx.stroke();

  // Arm
  ctx.beginPath();
  ctx.moveTo(x, y - 40);
  ctx.lineTo(x + 35, y - 40);
  ctx.stroke();

  // Rim
  ctx.strokeStyle = '#ff9900';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(x + 55, y - 20, 18, 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
