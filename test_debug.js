#!/usr/bin/env node

const { Client } = require("colyseus.js");

(async () => {
  console.log("Test started");
  const client = new Client("ws://localhost:3006");
  console.log("Client created");

  try {
    console.log("Attempting to join...");
    const room = await client.joinOrCreate("basketball", { nickname: "Test" });
    console.log("Joined:", room.sessionId);
    console.log("State:", room.state);
    room.leave();
    console.log("✅ SUCCESS");
    process.exit(0);
  } catch (e) {
    console.error("FAILED:", e.message);
    console.error("Stack:", e.stack);
    process.exit(1);
  }
})();
