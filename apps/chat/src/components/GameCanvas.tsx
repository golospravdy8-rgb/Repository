'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGameSocket } from '@/hooks/useGameSocket';

interface Player {
  index: number;
  x: number;
  y: number;
  status: 'alive' | 'eliminated';
  score?: number;
  kills?: number;
}

interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'idle' | 'flying' | 'in_basket';
}

interface GameCanvasProps {
  roomId: string;
  playerIndex: number;
  width?: number;
  height?: number;
}

export function GameCanvas({ roomId, playerIndex, width = 800, height = 600 }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [players, setPlayers] = useState<Map<number, Player>>(new Map());
  const [ballState, setBallState] = useState<BallState>({
    x: width / 2,
    y: height / 2,
    vx: 0,
    vy: 0,
    state: 'idle',
  });
  const [playerCount, setPlayerCount] = useState(0);

  const { emitPlayerMove, emitShootStart, emitBallState, emitScoreUpdate } = useGameSocket({
    roomId,
    playerIndex,
    initialX: 100 + playerIndex * 100,
    initialY: height - 100,
    onPlayerMoved: (data) => {
      setPlayers((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.playerIndex, {
          index: data.playerIndex,
          x: data.x,
          y: data.y,
          status: data.status,
        });
        return newMap;
      });
    },
    onGameStateUpdate: (data) => {
      if (data.players) {
        const newMap = new Map<number, Player>();
        data.players.forEach((p: any) => {
          newMap.set(p.index, p);
        });
        setPlayers(newMap);
      }
      if (data.ball) {
        setBallState(data.ball);
      }
    },
    onPlayerJoined: (data) => {
      setPlayerCount(data.totalPlayers);
    },
  });

  // Render game state to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw court
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, width - 100, height - 100);

    // Draw center line
    ctx.beginPath();
    ctx.moveTo(width / 2, 50);
    ctx.lineTo(width / 2, height - 50);
    ctx.stroke();

    // Draw basket (top)
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(width / 2, 80, 15, 0, Math.PI * 2);
    ctx.stroke();

    // Draw basket (bottom)
    ctx.beginPath();
    ctx.arc(width / 2, height - 80, 15, 0, Math.PI * 2);
    ctx.stroke();

    // Draw players
    players.forEach((player) => {
      if (player.status === 'alive') {
        ctx.fillStyle = playerIndex === player.index ? '#4ecdc4' : '#ff6b6b';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Player number
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${player.index}`, player.x, player.y);

        // Score
        if (player.score !== undefined) {
          ctx.font = '10px Arial';
          ctx.fillText(`${player.score}`, player.x, player.y + 15);
        }
      }
    });

    // Draw ball
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.arc(ballState.x, ballState.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw info text
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Players: ${playerCount}`, 10, 10);
    ctx.fillText(`Ball: ${ballState.state}`, 10, 25);
    ctx.fillText(`Your index: ${playerIndex}`, 10, 40);
  }, [players, ballState, playerIndex, playerCount, width, height]);

  // Handle mouse/touch input for player movement
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    emitPlayerMove(x, y, 'alive');
  };

  // Handle click for shooting
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Calculate angle
    const player = players.get(playerIndex);
    if (!player) return;

    const angle = Math.atan2(clickY - player.y, clickX - player.x);
    emitShootStart(angle);

    // Simulate ball movement
    emitBallState(player.x, player.y, Math.cos(angle) * 300, Math.sin(angle) * 300, 'flying');
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-xl font-bold text-white">Game Room: {roomId}</h2>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border-2 border-gray-500 cursor-crosshair bg-gray-900"
        onMouseMove={handleMouseMove}
        onClick={handleCanvasClick}
      />
      <div className="text-white text-sm">
        <p>Move mouse to move player</p>
        <p>Click to shoot</p>
      </div>
    </div>
  );
}
