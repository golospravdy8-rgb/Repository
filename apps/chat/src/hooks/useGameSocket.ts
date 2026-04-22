'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface GameSocketOptions {
  roomId: string;
  playerIndex: number;
  initialX: number;
  initialY: number;
  onPlayerMoved?: (data: any) => void;
  onShootStarted?: (data: any) => void;
  onBallUpdated?: (data: any) => void;
  onPlayerEliminated?: (data: any) => void;
  onScoreChanged?: (data: any) => void;
  onGameStateUpdate?: (data: any) => void;
  onPlayerJoined?: (data: any) => void;
  onPlayerDisconnected?: (data: any) => void;
}

export function useGameSocket(options: GameSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const {
    roomId,
    playerIndex,
    initialX,
    initialY,
    onPlayerMoved,
    onShootStarted,
    onBallUpdated,
    onPlayerEliminated,
    onScoreChanged,
    onGameStateUpdate,
    onPlayerJoined,
    onPlayerDisconnected,
  } = options;

  // Initialize socket connection
  useEffect(() => {
    if (socketRef.current) return;

    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3011';
    const socketUrl = `${protocol}//${host}`;

    console.log(`[useGameSocket] Connecting to ${socketUrl}`);

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log(`[useGameSocket] Connected: ${socket.id}`);

      // Join game room
      socket.emit('join_game', {
        roomId,
        playerIndex,
        x: initialX,
        y: initialY,
      });
    });

    socket.on('player_moved', (data) => {
      onPlayerMoved?.(data);
    });

    socket.on('shoot_started', (data) => {
      onShootStarted?.(data);
    });

    socket.on('ball_updated', (data) => {
      onBallUpdated?.(data);
    });

    socket.on('player_was_eliminated', (data) => {
      onPlayerEliminated?.(data);
    });

    socket.on('score_changed', (data) => {
      onScoreChanged?.(data);
    });

    socket.on('game_state_update', (data) => {
      onGameStateUpdate?.(data);
    });

    socket.on('player_joined', (data) => {
      onPlayerJoined?.(data);
    });

    socket.on('player_disconnected', (data) => {
      onPlayerDisconnected?.(data);
    });

    socket.on('disconnect', () => {
      console.log('[useGameSocket] Disconnected from server');
    });

    socket.on('error', (error) => {
      console.error('[useGameSocket] Socket error:', error);
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, playerIndex, initialX, initialY, onPlayerMoved, onShootStarted, onBallUpdated, onPlayerEliminated, onScoreChanged, onGameStateUpdate, onPlayerJoined, onPlayerDisconnected]);

  // Emit functions
  const emitPlayerMove = useCallback(
    (x: number, y: number, status: 'alive' | 'eliminated') => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('player_move', {
          index: playerIndex,
          x,
          y,
          status,
        });
      }
    },
    [playerIndex]
  );

  const emitShootStart = useCallback(
    (angle: number) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('shoot_start', {
          index: playerIndex,
          angle,
        });
      }
    },
    [playerIndex]
  );

  const emitBallState = useCallback(
    (x: number, y: number, vx: number, vy: number, state: 'idle' | 'flying' | 'in_basket') => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ball_state', {
          x,
          y,
          vx,
          vy,
          state,
        });
      }
    },
    []
  );

  const emitPlayerEliminated = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('player_eliminated', {
        index: playerIndex,
      });
    }
  }, [playerIndex]);

  const emitScoreUpdate = useCallback(
    (score: number, kills: number) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('score_updated', {
          index: playerIndex,
          score,
          kills,
        });
      }
    },
    [playerIndex]
  );

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
    emitPlayerMove,
    emitShootStart,
    emitBallState,
    emitPlayerEliminated,
    emitScoreUpdate,
  };
}
