#!/usr/bin/env node

const { Client } = require("colyseus.js");

async function runTest() {
  try {
    const client = new Client("ws://localhost:3006");
    const room = await client.joinOrCreate("basketball", { nickname: "PollingTest" });

    console.log("[TEST] Starting 50ms polling sync (like canvas)...");

    let pollCount = 0;
    let lastPlayerCount = -1;

    const pollInterval = setInterval(() => {
      pollCount++;

      // Guard like the fixed canvas code
      if (!room || !room.state || !room.state.players) {
        if (pollCount === 1) console.log(`[Poll #${pollCount}] State not ready yet`);
        return;
      }

      const currentCount = room.state.players.size;
      if (currentCount !== lastPlayerCount) {
        console.log(`[Poll #${pollCount}] Players: ${currentCount}`);
        lastPlayerCount = currentCount;
      }
    }, 50);

    // Run for 2 seconds
    await new Promise(r => setTimeout(r, 2000));

    clearInterval(pollInterval);
    console.log(`[TEST] ✅ Completed ${pollCount} polls over 2 seconds`);

    room.leave();
    process.exit(0);
  } catch (err) {
    console.error("[TEST] ❌ Error:", err.message);
    process.exit(1);
  }
}

runTest();
