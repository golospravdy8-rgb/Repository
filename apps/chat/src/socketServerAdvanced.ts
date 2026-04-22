import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { SOCKET_CONFIG, GAME_CONSTANTS, EVENTS } from '@/config/socket.config';
import {
  applyGravity,
  updatePosition,
  checkBoundaryCollision,
  bounceFromNormal,
  isInBasket,
  distance,
  type PhysicsBody,
} from '@/utils/physics';

interface PlayerState {
  index: number;
  x: number;
  y: number;
  prevX?: number;  // Для интерполяции
  prevY?: number;  // Для интерполяции
  vx?: number;     // Velocity X для dead reckoning
  vy?: number;     // Velocity Y для dead reckoning
  status: 'alive' | 'eliminated';
  score: number;
  kills: number;
  socketId: string;
  lastUpdate: number;
}

interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'idle' | 'flying' | 'in_basket';
  lastUpdatedBy?: string;
  lastUpdatedAt: number;
}

interface GameRoom {
  roomId: string;
  players: Map<string, PlayerState>;
  ball: BallState;
  ballBody: PhysicsBody;
  lastUpdateTime: number;
  createdAt: number;
}

const gameRooms = new Map<string, GameRoom>();
const gameLoops = new Map<string, NodeJS.Timeout>();

export function initializeSocketAdvanced(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: SOCKET_CONFIG.server.cors,
    transports: SOCKET_CONFIG.server.transports,
    maxHttpBufferSize: SOCKET_CONFIG.server.maxHttpBufferSize,
    pingInterval: SOCKET_CONFIG.server.pingInterval,
    pingTimeout: SOCKET_CONFIG.server.pingTimeout,
  });

  io.on('connection', (socket: Socket) => {
    if (SOCKET_CONFIG.performance.logConnections) {
      console.log(`[Socket.IO] Client connected: ${socket.id}`);
    }

    // JOIN GAME ROOM
    socket.on(EVENTS.CLIENT.JOIN_GAME, (data: any) => {
      const { roomId, playerIndex, x, y } = data;
      socket.join(roomId);

      if (SOCKET_CONFIG.performance.logConnections) {
        console.log(`[Socket.IO] Player ${playerIndex} joined room ${roomId}`);
      }

      // Initialize or get existing room
      if (!gameRooms.has(roomId)) {
        const newRoom: GameRoom = {
          roomId,
          players: new Map(),
          ball: {
            x: GAME_CONSTANTS.COURT_WIDTH / 2,
            y: GAME_CONSTANTS.COURT_HEIGHT / 2,
            vx: 0,
            vy: 0,
            state: 'idle',
            lastUpdatedAt: Date.now(),
          },
          ballBody: {
            position: {
              x: GAME_CONSTANTS.COURT_WIDTH / 2,
              y: GAME_CONSTANTS.COURT_HEIGHT / 2,
            },
            velocity: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            radius: GAME_CONSTANTS.BALL_RADIUS,
            mass: 0.6, // kg (basketball approx)
          },
          lastUpdateTime: Date.now(),
          createdAt: Date.now(),
        };
        gameRooms.set(roomId, newRoom);
        startGameLoop(io, roomId);
      }

      const room = gameRooms.get(roomId)!;
      room.players.set(socket.id, {
        index: playerIndex,
        x,
        y,
        status: 'alive',
        score: 0,
        kills: 0,
        socketId: socket.id,
        lastUpdate: Date.now(),
      });

      // Send room state to new player
      socket.emit('room_state', {
        players: Array.from(room.players.values()),
        ball: {
          x: room.ball.x,
          y: room.ball.y,
          vx: room.ball.vx,
          vy: room.ball.vy,
          state: room.ball.state,
        },
        config: {
          updateInterval: SOCKET_CONFIG.game.updateInterval,
          courtWidth: GAME_CONSTANTS.COURT_WIDTH,
          courtHeight: GAME_CONSTANTS.COURT_HEIGHT,
          gravity: GAME_CONSTANTS.GRAVITY,
        },
      });

      // Broadcast player joined
      io.to(roomId).emit(EVENTS.SERVER.PLAYER_JOINED, {
        socketId: socket.id,
        playerIndex,
        x,
        y,
        totalPlayers: room.players.size,
      });
    });

    // PLAYER MOVE EVENT
    socket.on(EVENTS.CLIENT.PLAYER_MOVE, (data: any) => {
      const roomId = getRoomIdForSocket(io, socket.id);
      if (!roomId) return;

      const room = gameRooms.get(roomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (player) {
        // Сохраняем старую позицию для интерполяции
        player.prevX = player.x;
        player.prevY = player.y;

        const newX = Math.max(
          GAME_CONSTANTS.COURT_PADDING + GAME_CONSTANTS.PLAYER_RADIUS,
          Math.min(GAME_CONSTANTS.COURT_WIDTH - GAME_CONSTANTS.COURT_PADDING - GAME_CONSTANTS.PLAYER_RADIUS, data.x)
        );
        const newY = Math.max(
          GAME_CONSTANTS.COURT_PADDING + GAME_CONSTANTS.PLAYER_RADIUS,
          Math.min(GAME_CONSTANTS.COURT_HEIGHT - GAME_CONSTANTS.COURT_PADDING - GAME_CONSTANTS.PLAYER_RADIUS, data.y)
        );

        // Вычисляем скорость для dead reckoning (pixels per second)
        const now = Date.now();
        const dt = Math.max(1, now - player.lastUpdate) / 1000; // в секундах
        player.vx = (newX - player.x) / dt;
        player.vy = (newY - player.y) / dt;

        player.x = newX;
        player.y = newY;
        player.status = data.status;
        player.lastUpdate = now;
      }

      io.to(roomId).emit(EVENTS.SERVER.PLAYER_MOVED, {
        socketId: socket.id,
        playerIndex: data.index,
        x: player?.x,
        y: player?.y,
        vx: player?.vx || 0,
        vy: player?.vy || 0,
        status: data.status,
        timestamp: Date.now(),
      });
    });

    // SHOOT START EVENT
    socket.on(EVENTS.CLIENT.SHOOT_START, (data: any) => {
      const roomId = getRoomIdForSocket(io, socket.id);
      if (!roomId) return;

      const room = gameRooms.get(roomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (player && player.status === 'alive') {
        // Calculate initial ball velocity from angle
        const speed = GAME_CONSTANTS.BALL_INITIAL_SPEED;
        const vx = Math.cos(data.angle) * speed;
        const vy = Math.sin(data.angle) * speed;

        room.ball.vx = vx;
        room.ball.vy = vy;
        room.ball.x = player.x;
        room.ball.y = player.y;
        room.ball.state = 'flying';
        room.ball.lastUpdatedBy = socket.id;
        room.ball.lastUpdatedAt = Date.now();

        room.ballBody.position = { x: player.x, y: player.y };
        room.ballBody.velocity = { x: vx, y: vy };
        room.ballBody.acceleration = { x: 0, y: 0 };

        io.to(roomId).emit(EVENTS.SERVER.SHOOT_STARTED, {
          socketId: socket.id,
          playerIndex: data.index,
          angle: data.angle,
          speed,
          timestamp: Date.now(),
        });
      }
    });

    // BALL STATE UPDATE
    socket.on(EVENTS.CLIENT.BALL_STATE, (data: any) => {
      const roomId = getRoomIdForSocket(io, socket.id);
      if (!roomId) return;

      const room = gameRooms.get(roomId);
      if (!room) return;

      room.ball = {
        x: data.x,
        y: data.y,
        vx: data.vx,
        vy: data.vy,
        state: data.state,
        lastUpdatedBy: socket.id,
        lastUpdatedAt: Date.now(),
      };

      room.ballBody.position = { x: data.x, y: data.y };
      room.ballBody.velocity = { x: data.vx, y: data.vy };
    });

    // PLAYER ELIMINATED EVENT
    socket.on(EVENTS.CLIENT.PLAYER_ELIMINATED, (data: any) => {
      const roomId = getRoomIdForSocket(io, socket.id);
      if (!roomId) return;

      const room = gameRooms.get(roomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (player) {
        player.status = 'eliminated';
      }

      io.to(roomId).emit(EVENTS.SERVER.PLAYER_WAS_ELIMINATED, {
        socketId: socket.id,
        playerIndex: data.index,
        timestamp: Date.now(),
      });
    });

    // SCORE UPDATE EVENT
    socket.on(EVENTS.CLIENT.SCORE_UPDATED, (data: any) => {
      const roomId = getRoomIdForSocket(io, socket.id);
      if (!roomId) return;

      const room = gameRooms.get(roomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (player) {
        player.score = data.score;
        player.kills = data.kills;
      }

      io.to(roomId).emit(EVENTS.SERVER.SCORE_CHANGED, {
        socketId: socket.id,
        playerIndex: data.index,
        score: data.score,
        kills: data.kills,
        timestamp: Date.now(),
      });
    });

    // DEBUG ROOMS
    socket.on(EVENTS.CLIENT.DEBUG_ROOMS, () => {
      const roomInfo = Array.from(gameRooms.entries()).map(([roomId, room]) => ({
        roomId,
        playerCount: room.players.size,
        ballState: room.ball.state,
        createdAt: new Date(room.createdAt).toISOString(),
      }));
      socket.emit(EVENTS.SERVER.DEBUG_ROOMS_INFO, roomInfo);
    });

    // DISCONNECT
    socket.on('disconnect', () => {
      const rooms = Array.from(io.sockets.adapter.rooms.entries())
        .filter(([_, members]) => members.has(socket.id))
        .map(([roomId]) => roomId);

      if (SOCKET_CONFIG.performance.logConnections) {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      }

      rooms.forEach((roomId) => {
        const room = gameRooms.get(roomId);
        if (room) {
          const player = room.players.get(socket.id);
          room.players.delete(socket.id);

          io.to(roomId).emit(EVENTS.SERVER.PLAYER_DISCONNECTED, {
            socketId: socket.id,
            playerIndex: player?.index,
          });

          // Clean up room if empty
          if (room.players.size === 0) {
            const loop = gameLoops.get(roomId);
            if (loop) clearInterval(loop);
            gameLoops.delete(roomId);
            gameRooms.delete(roomId);

            if (SOCKET_CONFIG.performance.logConnections) {
              console.log(`[Socket.IO] Room ${roomId} cleaned up (empty)`);
            }
          }
        }
      });
    });
  });

  return io;
}

function startGameLoop(io: Server, roomId: string) {
  const room = gameRooms.get(roomId);
  if (!room) return;

  if (SOCKET_CONFIG.performance.logConnections) {
    console.log(`[Socket.IO] Starting game loop for room ${roomId}`);
  }

  const loop = setInterval(() => {
    if (!gameRooms.has(roomId)) {
      clearInterval(loop);
      gameLoops.delete(roomId);
      return;
    }

    const currentRoom = gameRooms.get(roomId)!;
    const now = Date.now();
    const deltaTime = (now - currentRoom.lastUpdateTime) / 1000;
    currentRoom.lastUpdateTime = now;

    // Apply physics to ball
    if (currentRoom.ball.state === 'flying') {
      applyGravity(currentRoom.ballBody, deltaTime);
      updatePosition(currentRoom.ballBody, deltaTime);

      // Update ball state from physics body
      currentRoom.ball.x = currentRoom.ballBody.position.x;
      currentRoom.ball.y = currentRoom.ballBody.position.y;
      currentRoom.ball.vx = currentRoom.ballBody.velocity.x;
      currentRoom.ball.vy = currentRoom.ballBody.velocity.y;

      // Check boundaries
      const { collided, normal } = checkBoundaryCollision(
        currentRoom.ballBody.position,
        GAME_CONSTANTS.BALL_RADIUS,
        GAME_CONSTANTS.COURT_PADDING,
        GAME_CONSTANTS.COURT_WIDTH - GAME_CONSTANTS.COURT_PADDING,
        GAME_CONSTANTS.COURT_PADDING,
        GAME_CONSTANTS.COURT_HEIGHT - GAME_CONSTANTS.COURT_PADDING
      );

      if (collided) {
        bounceFromNormal(currentRoom.ballBody.velocity, normal);
      }

      // Check if ball is in basket
      const topBasketDist = distance(currentRoom.ballBody.position, {
        x: GAME_CONSTANTS.BASKET_X,
        y: GAME_CONSTANTS.BASKET_TOP_Y,
      });
      const bottomBasketDist = distance(currentRoom.ballBody.position, {
        x: GAME_CONSTANTS.BASKET_X,
        y: GAME_CONSTANTS.BASKET_BOTTOM_Y,
      });

      if (topBasketDist <= GAME_CONSTANTS.BASKET_RADIUS || bottomBasketDist <= GAME_CONSTANTS.BASKET_RADIUS) {
        currentRoom.ball.state = 'in_basket';

        // Award points to shooter
        if (currentRoom.ball.lastUpdatedBy) {
          const shooter = Array.from(currentRoom.players.values()).find((p) => p.socketId === currentRoom.ball.lastUpdatedBy);
          if (shooter) {
            shooter.score += GAME_CONSTANTS.BASKET_SCORE;
            shooter.kills += 1;
          }
        }
      }

      // Reset if ball goes too far
      if (currentRoom.ballBody.position.y > GAME_CONSTANTS.COURT_HEIGHT) {
        currentRoom.ball.state = 'idle';
        currentRoom.ball.x = GAME_CONSTANTS.COURT_WIDTH / 2;
        currentRoom.ball.y = GAME_CONSTANTS.COURT_HEIGHT / 2;
        currentRoom.ball.vx = 0;
        currentRoom.ball.vy = 0;
      }
    }

    // Send game state to all players in room every UPDATE_INTERVAL
    // С ИНТЕРПОЛЯЦИЕЙ: отправляем predicted positions и контрольные точки мяча

    // Вычисляем predicted positions для всех игроков
    const playersData = Array.from(currentRoom.players.values()).map(p => ({
      ...p,
      // Predicted position = x + vx * (elapsed / 1000)
      // Клиент будет интерполировать между этой и следующей позицией
      vx: p.vx || 0,
      vy: p.vy || 0,
      prevX: p.prevX || p.x,
      prevY: p.prevY || p.y,
    }));

    // Контрольные точки мяча для гладкого полета через интерполяцию
    const ballControlPoints = [];
    if (currentRoom.ball.state === 'flying') {
      ballControlPoints.push({
        x: currentRoom.ball.x,
        y: currentRoom.ball.y,
        vx: currentRoom.ball.vx,
        vy: currentRoom.ball.vy,
        t: now,
      });
    }

    io.to(roomId).emit(EVENTS.SERVER.GAME_STATE_UPDATE, {
      players: playersData,
      ball: {
        x: currentRoom.ball.x,
        y: currentRoom.ball.y,
        vx: currentRoom.ball.vx,
        vy: currentRoom.ball.vy,
        state: currentRoom.ball.state,
      },
      ballControlPoints,
      timestamp: now,
    });
  }, SOCKET_CONFIG.game.updateInterval);

  gameLoops.set(roomId, loop);
}

function getRoomIdForSocket(io: Server, socketId: string): string | null {
  const rooms = Array.from(io.sockets.adapter.rooms.entries())
    .filter(([_, members]) => members.has(socketId))
    .map(([roomId]) => roomId);

  return rooms.length > 0 ? rooms[0] : null;
}

export function getGameRoom(roomId: string): GameRoom | undefined {
  return gameRooms.get(roomId);
}

export function getAllRooms(): Map<string, GameRoom> {
  return gameRooms;
}

export function getGameStats(): {
  activeRooms: number;
  totalPlayers: number;
  rooms: Array<{ roomId: string; playerCount: number }>;
} {
  const rooms = Array.from(gameRooms.values()).map((room) => ({
    roomId: room.roomId,
    playerCount: room.players.size,
  }));

  return {
    activeRooms: gameRooms.size,
    totalPlayers: Array.from(gameRooms.values()).reduce((sum, room) => sum + room.players.size, 0),
    rooms,
  };
}
