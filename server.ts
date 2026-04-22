import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeSocket } from './src/socketServer';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = parseInt(process.env.PORT || '3007', 10);

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO on the HTTP server
  initializeSocket(httpServer);
  console.log('[Socket.IO] ✅ Initialized on HTTP server at port ' + PORT);

  httpServer.listen(PORT, () => {
    console.log(`[Next.js] ✅ Ready on http://localhost:${PORT}`);
  });
});
