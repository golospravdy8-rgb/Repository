#!/usr/bin/env node

const { Client } = require("colyseus.js");

(async () => {
  try {
    const client = new Client("ws://localhost:3006");
    const room = await client.joinOrCreate("basketball", { nickname: "DelayTest" });

    console.log("[T+0ms] Immediately after join:");
    console.log("  gamePhase:", room.state.gamePhase);
    console.log("  rimX:", room.state.rimX);
    console.log("  players size:", room.state.players?.size);

    await new Promise(r => setTimeout(r, 100));

    console.log("[T+100ms] After 100ms:");
    console.log("  gamePhase:", room.state.gamePhase);
    console.log("  rimX:", room.state.rimX);
    console.log("  players size:", room.state.players?.size);

    await new Promise(r => setTimeout(r, 500));

    console.log("[T+600ms] After 600ms total:");
    console.log("  gamePhase:", room.state.gamePhase);
    console.log("  rimX:", room.state.rimX);
    console.log("  players size:", room.state.players?.size);

    room.leave();
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
})();
