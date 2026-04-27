const net = require("net");

const socket = net.createConnection(3000, "localhost");

socket.on("connect", () => {
  console.log("✅ TCP connection successful");
  socket.write("GET /matchmake/joinOrCreate/basketball HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Key: test\r\nSec-WebSocket-Version: 13\r\n\r\n");
  setTimeout(() => socket.destroy(), 500);
});

socket.on("data", (data) => {
  console.log("📨 Response:", data.toString("utf8", 0, 200));
});

socket.on("error", (err) => {
  console.error("❌ Socket error:", err.message);
});

socket.on("close", () => {
  console.log("Socket closed");
  process.exit(0);
});

setTimeout(() => {
  console.error("❌ Timeout - no response from server");
  process.exit(1);
}, 5000);
