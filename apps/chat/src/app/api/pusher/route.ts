import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { room, playerId, x, y, name, score, action } = await req.json();
    console.log('[Pusher API] Received:', { room, playerId, action });

    if (action === 'leave') {
      await pusherServer.trigger(`game-${room}`, 'player-leave', { playerId });
      console.log('[Pusher API] Player left:', playerId);
      return NextResponse.json({ ok: true });
    }

    await pusherServer.trigger(`game-${room}`, 'player-move', {
      playerId,
      x,
      y,
      name,
      score: score || 0,
      timestamp: Date.now(),
    });

    console.log('[Pusher API] Position sent:', { room, playerId, x, y });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Pusher API] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
