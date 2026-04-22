import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';
import { initializeSocket } from '@/socketServer';

export const config = {
  api: {
    bodyParser: false,
  },
};

let io: any = null;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(res.socket as any).server?.io) {
    console.log('[Socket.IO] Initializing Socket.IO server...');

    const httpServer = (res.socket as any).server as unknown as HTTPServer;
    io = initializeSocket(httpServer);

    (res.socket as any).server.io = io;

    // Optional: Log room updates for debugging
    io.on('connection', (socket: any) => {
      socket.on('debug_rooms', () => {
        const roomInfo = Array.from(io.sockets.adapter.rooms.entries()).map(
          ([roomId, members]) => ({
            roomId,
            playerCount: members.size,
          })
        );
        socket.emit('debug_rooms_info', roomInfo);
      });
    });
  }

  res.status(200).json({ ok: true });
}
