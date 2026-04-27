// @ts-nocheck
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "colyseus";
import { BasketballRoom } from "./lib/colyseus/BasketballRoom";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3006", 10);  // Fly.io uses PORT=8080

const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Colyseus server on same port
  const gameServer = new Server({
    server: httpServer,
    pingInterval: 3000,
    pingMaxRetries: 2,
    verifyClient: (info, done) => {
      done(true);
    }
  });

  gameServer.define("basketball", BasketballRoom);

  httpServer.on("error", (err) => {
    console.error("❌ HTTP Server error:", err);
    process.exit(1);
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`\n✅ Next.js + Colyseus ready on http://localhost:${port}`);
    console.log(`📡 WebSocket: ws://localhost:${port}\n`);
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down server...");
    httpServer.close();
    process.exit(0);
  });
}).catch((err) => {
  console.error("❌ Failed to start:", err);
  process.exit(1);
});
