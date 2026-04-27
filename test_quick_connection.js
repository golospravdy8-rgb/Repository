#!/usr/bin/env node

const { Client } = require("colyseus.js");

async function test() {
  const client = new Client("ws://localhost:3006");

  try {
    const room = await client.joinOrCreate("basketball");
    console.log(`✅ Connected! Session: ${room.sessionId}`);
    console.log(`State object keys: ${Object.keys(room.state).join(", ")}`);

    if (room.state && room.state.players) {
      console.log(`✅ Players available: ${room.state.players.size} players`);
    } else {
      console.log(`⚠️ room.state or players undefined`);
      console.log(`State:`, room.state);
    }

    room.leave();
    process.exit(0);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}

test();
