import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { room, playerId, playerIndex, nickname, x, y } = await req.json();

    console.log('[Pusher Join] Player joining:', { room, playerId, nickname });

    await pusherServer.trigger(`game-${room}`, 'player-joined', {
      playerId,
      playerIndex,
      nickname,
      x,
      y,
      timestamp: Date.now(),
    });

    console.log('[Pusher Join] Broadcast sent successfully');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Pusher Join] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
