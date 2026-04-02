import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory online presence store (resets on server restart — acceptable for presence)
declare global {
  // eslint-disable-next-line no-var
  var onlinePresence: Map<string, number>;
}
global.onlinePresence = global.onlinePresence || new Map<string, number>();

const ONLINE_TTL_MS = 45000; // 45 seconds

function pruneStale() {
  const now = Date.now();
  Array.from(global.onlinePresence.entries()).forEach(([id, ts]) => {
    if (now - ts > ONLINE_TTL_MS) global.onlinePresence.delete(id);
  });
}

// POST — heartbeat ping
export async function POST(req: NextRequest) {
  const { userId } = await req.json().catch(() => ({}));
  if (userId) {
    global.onlinePresence.set(String(userId), Date.now());
  }
  return NextResponse.json({ ok: true });
}

// GET — list online user IDs
export async function GET() {
  pruneStale();
  const onlineIds = Array.from(global.onlinePresence.keys());
  return NextResponse.json({ onlineIds, count: onlineIds.length });
}
