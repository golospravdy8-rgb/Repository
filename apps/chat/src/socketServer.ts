import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';

interface PlayerState {
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

interface GameRoom {
  roomId: string;
  players: Map<string, PlayerState>;
  ball: BallState;
  lastUpdateTime: number;
}

const gameRooms = new Map<string, GameRoom>();
const UPDATE_INTERVAL = 50; // 50ms
const gameLoops = new Map<string, NodeJS.Timeout>();
const roomPlayers: { [roomId: string]: { [socketId: string]: any } } = {};

export function initializeSocket(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // JOIN GAME ROOM
    socket.on('join_game', (data: { roomId: string; playerIndex: number; x: number; y: number }) => {
      const { roomId, playerIndex, x, y } = data;
      socket.join(roomId);

      console.log(`[Socket.IO] Player ${playerIndex} joined room ${roomId}`);

      // Initialize or get existing room
      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, {
          roomId,
          players: new Map(),
          ball: { x: 400, y: 300, vx: 0, vy: 0, state: 'idle' },
          lastUpdateTime: Date.now(),
        });

        // Start game loop for this room
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
      });

      // Broadcast player joined
      io.to(roomId).emit('player_joined', {
        socketId: socket.id,
        playerIndex,
        x,
        y,
        totalPlayers: room.players.size,
      });
    });

    // PLAYER MOVE EVENT
    socket.on('player_move', (data: { index: number; x: number; y: number; status: 'alive' | 'eliminated' }) => {
      const rooms = Array.from(io.sockets.adapter.rooms.entries())
        .filter(([_, members]) => members.has(socket.id))
        .map(([roomId]) => roomId);

      if (rooms.length === 0) return;

      const roomId = rooms[0];
      const room = gameRooms.get(roomId);
      if (!room) return;

      // Update player state
      const player = room.players.get(socket.id);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.status = data.status;
      }

      // Broadcast to all players in room
      io.to(roomId).emit('player_moved', {
        socketId: socket.id,
        playerIndex: data.index,
        x: data.x,
        y: data.y,
        status: data.status,
      });
    });

    // SHOOT START EVENT
    socket.on('shoot_start', (data: { index: number; angle: number }) => {
      const rooms = Array.from(io.to(socket.id).sockets.adapter.rooms.entries())
        .filter(([_, members]) => members.has(socket.id))
        .map(([roomId]) => roomId);

      if (rooms.length === 0) return;

      const roomId = rooms[0];

      // Broadcast shoot start to all
      io.to(roomId).emit('shoot_started', {
        socketId: socket.id,
        playerIndex: data.index,
        angle: data.angle,
        timestamp: Date.now(),
      });
    });

    // BALL STATE UPDATE
    socket.on('ball_state', (data: { x: number; y: number; vx: number; vy: number; state: string }) => {
      const rooms = Array.from(io.sockets.adapter.rooms.entries())
        .filter(([_, members]) => members.has(socket.id))
        .map(([roomId]) => roomId);

      if (rooms.length === 0) return;

      const roomId = rooms[0];
      const room = gameRooms.get(roomId);
      if (!room) return;

      // Update ball state
      room.ball = {
        x: data.x,
        y: data.y,
        vx: data.vx,
        vy: data.vy,
        state: data.state as 'idle' | 'flying' | 'in_basket',
      };

      // Broadcast to all
      io.to(roomId).emit('ball_updated', {
        x: data.x,
        y: data.y,
        vx: data.vx,
        vy: data.vy,
        state: data.state,
        timestamp: Date.now(),
      });
    });

    // PLAYER ELIMINATED EVENT
    socket.on('player_eliminated', (data: { index: number }) => {
      const rooms = Array.from(io.sockets.adapter.rooms.entries())
        .filter(([_, members]) => members.has(socket.id))
        .map(([roomId]) => roomId);

      if (rooms.length === 0) return;

      const roomId = rooms[0];
      const room = gameRooms.get(roomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (player) {
        player.status = 'eliminated';
      }

      // Broadcast elimination
      io.to(roomId).emit('player_was_eliminated', {
        socketId: socket.id,
        playerIndex: data.index,
        timestamp: Date.now(),
      });
    });

    // SCORE UPDATE EVENT
    socket.on('score_updated', (data: { index: number; score: number; kills: number }) => {
      const rooms = Array.from(io.sockets.adapter.rooms.entries())
        .filter(([_, members]) => members.has(socket.id))
        .map(([roomId]) => roomId);

      if (rooms.length === 0) return;

      const roomId = rooms[0];
      const room = gameRooms.get(roomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (player) {
        player.score = data.score;
        player.kills = data.kills;
      }

      // Broadcast score update
      io.to(roomId).emit('score_changed', {
        socketId: socket.id,
        playerIndex: data.index,
        score: data.score,
        kills: data.kills,
        timestamp: Date.now(),
      });
    });

    // NEW EVENT HANDLERS FOR HTML DEMO (Rucheyok)
    socket.on('join-room', (data: { room: string; name: string }) => {
      const { room: roomId, name } = data;
      socket.join(roomId);
      console.log(`[Socket] Player joined room: ${roomId} (${name})`);
      if (!roomPlayers[roomId]) {
        roomPlayers[roomId] = {};
      }
    });

    socket.on('player-move', (data: { room: string; id: string; playerIdx: number; x: number; y: number; score: number; status: string; name?: string }) => {
      const { room: roomId } = data;
      if (!roomPlayers[roomId]) {
        roomPlayers[roomId] = {};
      }
      roomPlayers[roomId][socket.id] = data;
      // Broadcast updated players to room
      io.to(roomId).emit('players-update', roomPlayers[roomId]);
    });

    // DISCONNECT
    socket.on('disconnect', () => {
      const rooms = Array.from(io.sockets.adapter.rooms.entries())
        .filter(([_, members]) => members.has(socket.id))
        .map(([roomId]) => roomId);

      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);

      rooms.forEach((roomId) => {
        const room = gameRooms.get(roomId);
        if (room) {
          const player = room.players.get(socket.id);
          room.players.delete(socket.id);

          io.to(roomId).emit('player_disconnected', {
            socketId: socket.id,
            playerIndex: player?.index,
          });

          // Clean up room if empty
          if (room.players.size === 0) {
            const loop = gameLoops.get(roomId);
            if (loop) clearInterval(loop);
            gameLoops.delete(roomId);
            gameRooms.delete(roomId);
            console.log(`[Socket.IO] Room ${roomId} cleaned up (empty)`);
          }
        }
        // Clean up roomPlayers for this connection
        if (roomPlayers[roomId]) {
          delete roomPlayers[roomId][socket.id];
        }
      });
    });
  });

  return io;
}

function startGameLoop(io: Server, roomId: string) {
  const room = gameRooms.get(roomId);
  if (!room) return;

  console.log(`[Socket.IO] Starting game loop for room ${roomId}`);

  const loop = setInterval(() => {
    if (!gameRooms.has(roomId)) {
      clearInterval(loop);
      gameLoops.delete(roomId);
      return;
    }

    const currentRoom = gameRooms.get(roomId)!;
    const now = Date.now();
    const deltaTime = (now - currentRoom.lastUpdateTime) / 1000; // seconds
    currentRoom.lastUpdateTime = now;

    // Apply physics (gravity, friction, etc.)
    if (currentRoom.ball.state === 'flying') {
      currentRoom.ball.vy += 9.8 * deltaTime; // gravity (adjust as needed)
      currentRoom.ball.x += currentRoom.ball.vx * deltaTime;
      currentRoom.ball.y += currentRoom.ball.vy * deltaTime;

      // Boundary checks
      if (currentRoom.ball.y > 600) {
        currentRoom.ball.state = 'idle';
        currentRoom.ball.x = 400;
        currentRoom.ball.y = 300;
        currentRoom.ball.vx = 0;
        currentRoom.ball.vy = 0;
      }
    }

    // Send game state to all players in room every 50ms
    io.to(roomId).emit('game_state_update', {
      players: Array.from(currentRoom.players.values()),
      ball: currentRoom.ball,
      timestamp: now,
    });
  }, UPDATE_INTERVAL);

  gameLoops.set(roomId, loop);
}

export function getGameRoom(roomId: string): GameRoom | undefined {
  return gameRooms.get(roomId);
}

export function getAllRooms(): Map<string, GameRoom> {
  return gameRooms;
}
