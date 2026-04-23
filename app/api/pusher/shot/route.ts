import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { room, playerId, playerIndex, nickname, shotScore, accuracy, collisionType } = await req.json();

    console.log('[Pusher Shot] Player shot:', { room, playerId, nickname, shotScore });

    await pusherServer.trigger(`game-${room}`, 'shot-completed', {
      playerId,
      playerIndex,
      nickname,
      shotScore,
      accuracy,
      collisionType,
      timestamp: Date.now(),
    });

    console.log('[Pusher Shot] Broadcast sent successfully');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Pusher Shot] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
