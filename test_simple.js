#!/usr/bin/env node

const { Client } = require("colyseus.js");

(async () => {
  try {
    console.log("[TEST] Creating client...");
    const client = new Client("ws://localhost:3006");

    console.log("[TEST] Joining basketball room...");
    const room = await client.joinOrCreate("basketball", { nickname: "Test1" });

    console.log("[TEST] ✅ CONNECTED!");
    console.log("[TEST] Session ID:", room.sessionId);
    console.log("[TEST] Players in state:", room.state?.players?.size || "N/A");

    room.leave();
    process.exit(0);
  } catch (err) {
    console.error("[TEST] ❌ FAILED:", err.message);
    process.exit(1);
  }
})();
