const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Basketball Socket.IO Running!', time: new Date() });
});

const gameRooms = new Map();

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('join_game', (data) => {
    const { roomId, nickname, playerIndex, x, y } = data;
    socket.join('game-' + roomId);

    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, {
        players: new Map(),
        ball: { x: 300, y: 100, vx: 0, vy: 0, state: 0 }
      });
    }

    const room = gameRooms.get(roomId);
    room.players.set(socket.id, {
      id: socket.id,
      nickname,
      x: x || 400,
      y: y || 500,
      score: 0,
      playerIndex
    });

    io.to('game-' + roomId).emit('players_joined', {
      players: Array.from(room.players.values()),
      newPlayerId: socket.id,
      newPlayerNickname: nickname
    });
  });

  socket.on('move', (data) => {
    const { roomId, x, y } = data;
    const room = gameRooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (player) {
      player.x = x;
      player.y = y;
      socket.to('game-' + roomId).emit('player_moved', {
        playerId: socket.id,
        nickname: player.nickname,
        x, y
      });
    }
  });

  socket.on('shoot', (data) => {
    const { roomId, angle, power, shooterId, shooterName } = data;
    const room = gameRooms.get(roomId);
    if (!room) return;
    io.to('game-' + roomId).emit('ball_shoot', {
      angle, power, shooterId, shooterName
    });
  });

  socket.on('score', (data) => {
    const { roomId, playerId, playerName, newScore } = data;
    const room = gameRooms.get(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (player) player.score = newScore;
    io.to('game-' + roomId).emit('player_scored', {
      playerId, playerName, newScore,
      players: Array.from(room.players.values())
    });
  });

  socket.on('leave_game', (data) => {
    const { roomId } = data;
    const room = gameRooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    room.players.delete(socket.id);
    socket.leave('game-' + roomId);
    if (room.players.size > 0) {
      io.to('game-' + roomId).emit('player_left', {
        playerId: socket.id,
        playerName: player?.nickname,
        remainingPlayers: Array.from(room.players.values())
      });
    } else {
      gameRooms.delete(roomId);
    }
  });

  socket.on('disconnect', () => {
    gameRooms.forEach((room, roomId) => {
      if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id);
        room.players.delete(socket.id);
        if (room.players.size > 0) {
          io.to('game-' + roomId).emit('player_left', {
            playerId: socket.id,
            playerName: player?.nickname,
            remainingPlayers: Array.from(room.players.values())
          });
        } else {
          gameRooms.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3007;
httpServer.listen(PORT, () => {
  console.log('Socket.IO ready on port ' + PORT);
});
