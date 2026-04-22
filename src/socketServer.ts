import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';

interface PlayerState {
  room: string;
  id: string;
  playerIdx: number;
  x: number;
  y: number;
  score: number;
  status: string;
  name?: string;
}

const roomPlayers: { [roomId: string]: { [socketId: string]: PlayerState } } = {};

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

    // Handle join-room for HTML demo
    socket.on('join-room', (data: { room: string; name: string }) => {
      const { room: roomId, name } = data;
      socket.join(roomId);
      console.log(`[Socket] Player joined room: ${roomId} (${name})`);
      if (!roomPlayers[roomId]) {
        roomPlayers[roomId] = {};
      }
    });

    // Handle player-move (HTML demo multiplayer)
    socket.on('player-move', (data: PlayerState) => {
      const { room: roomId } = data;
      if (!roomPlayers[roomId]) {
        roomPlayers[roomId] = {};
      }
      roomPlayers[roomId][socket.id] = data;
      // Broadcast updated players to room
      io.to(roomId).emit('players-update', roomPlayers[roomId]);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      // Clean up roomPlayers
      Object.keys(roomPlayers).forEach((roomId) => {
        if (roomPlayers[roomId] && roomPlayers[roomId][socket.id]) {
          delete roomPlayers[roomId][socket.id];
        }
      });
    });
  });

  return io;
}
