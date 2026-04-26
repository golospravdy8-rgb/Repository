import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { room, playerId, playerIndex, nickname, x, y, socket_id } = await req.json();

    console.log('[Pusher Join] Player joining:', { room, playerId, nickname, socket_id: socket_id?.substring(0, 12) + '...' });

    await pusherServer.trigger(`game-${room}`, 'player-joined', {
      playerId,
      playerIndex,
      nickname,
      x,
      y,
      timestamp: Date.now(),
    }, {
      socket_id,  // Prevent Pusher echo to sender
    });

    console.log('[Pusher Join] Broadcast sent with socket_id filter');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Pusher Join] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
