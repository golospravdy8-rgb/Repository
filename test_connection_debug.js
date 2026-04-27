#!/usr/bin/env node

const { Client } = require("colyseus.js");

async function test() {
  console.log("[TEST] Starting connection test...");
  console.log("[TEST] Creating client for ws://localhost:3006");

  const client = new Client("ws://localhost:3006");

  client.onOpen(() => {
    console.log("[TEST] ✅ WebSocket opened");
  });

  client.onClose(() => {
    console.log("[TEST] ⚠️ WebSocket closed");
  });

  client.onError((err) => {
    console.log("[TEST] ❌ WebSocket error:", err.message);
  });

  try {
    console.log("[TEST] Attempting joinOrCreate basketball...");
    const room = await client.joinOrCreate("basketball", { nickname: "TestPlayer" });

    console.log("[TEST] ✅ Joined! Session:", room.sessionId);
    console.log("[TEST] Room state type:", typeof room.state);
    console.log("[TEST] Room state keys:", Object.keys(room.state || {}).join(", "));

    if (room.state && room.state.players) {
      console.log(`[TEST] ✅ Players available: ${room.state.players.size} players`);
    } else {
      console.log(`[TEST] ⚠️ room.state or players undefined`);
      console.log(`[TEST] State:`, room.state);
    }

    room.leave();
    console.log("[TEST] ✅ Left room");
    process.exit(0);
  } catch (error) {
    console.error(`[TEST] ❌ Error:`, error.message);
    console.error(`[TEST] Stack:`, error.stack);
    process.exit(1);
  }
}

test();
