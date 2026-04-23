import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { room, playerId, x, y, name, score, action, ball } = await req.json();
    console.log('[Pusher API] Received:', { room, playerId, action, hasBall: !!ball });

    if (action === 'leave') {
      await pusherServer.trigger(`game-${room}`, 'player-leave', { playerId });
      console.log('[Pusher API] Player left:', playerId);
      return NextResponse.json({ ok: true });
    }

    // ETAP 8: Include ball data in player-move broadcast
    await pusherServer.trigger(`game-${room}`, 'player-move', {
      playerId,
      x,
      y,
      name,
      score: score || 0,
      ball: ball || null,  // ETAP 8: Broadcast ball state to other players
      timestamp: Date.now(),
    });

    if (ball) {
      console.log('[Pusher API] Position + ball sent:', { room, playerId, x, y, ballState: ball.state });
    } else {
      console.log('[Pusher API] Position sent (no ball):', { room, playerId, x, y });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Pusher API] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
