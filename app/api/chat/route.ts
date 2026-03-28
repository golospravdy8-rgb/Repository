import { NextRequest } from "next/server";

// In-memory SSE clients list (shared across requests in the same Vercel instance)
declare global {
  // eslint-disable-next-line no-var
  var sseClients: ReadableStreamDefaultController[];
}
global.sseClients = global.sseClients || [];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — subscribe to SSE stream
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      global.sseClients.push(controller);

      // Send initial ping so browser knows connection is alive
      const ping = `data: ${JSON.stringify({ type: "ping" })}\n\n`;
      controller.enqueue(new TextEncoder().encode(ping));
    },
    cancel(controller) {
      global.sseClients = global.sseClients.filter((c) => c !== controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// POST — send a message, broadcast to all SSE clients
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.username || !body.text) {
    return Response.json({ error: "username and text required" }, { status: 400 });
  }

  const message = {
    type: "message",
    username: String(body.username).slice(0, 64),
    text: String(body.text).slice(0, 500),
    ts: Date.now(),
  };

  const data = `data: ${JSON.stringify(message)}\n\n`;
  const encoded = new TextEncoder().encode(data);

  // Broadcast to all connected clients
  const dead: ReadableStreamDefaultController[] = [];
  for (const client of global.sseClients) {
    try {
      client.enqueue(encoded);
    } catch {
      dead.push(client);
    }
  }
  // Remove dead clients
  global.sseClients = global.sseClients.filter((c) => !dead.includes(c));

  return Response.json({ ok: true, clients: global.sseClients.length });
}
