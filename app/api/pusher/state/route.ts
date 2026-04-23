import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { room, playerId, state } = await req.json();

    console.log('[Pusher State] Game state update:', { room, playerId });

    await pusherServer.trigger(`game-${room}`, 'state-update', {
      playerId,
      state,
      timestamp: Date.now(),
    });

    console.log('[Pusher State] Broadcast sent successfully');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Pusher State] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
