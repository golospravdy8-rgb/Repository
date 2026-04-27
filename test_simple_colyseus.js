#!/usr/bin/env node

const { Client } = require("colyseus.js");

async function testConnection() {
  console.log("🚀 Simple Colyseus test - ws://localhost:3006\n");

  const client = new Client("ws://localhost:3006");

  try {
    console.log("📤 Player 1 joining...");
    const room = await client.joinOrCreate("basketball", {
      nickname: "TestPlayer1",
      color: "#4fc3f7"
    });

    console.log(`✅ Player 1 joined. Session ID: ${room.sessionId}`);
    console.log(`📊 Room has ${room.state.players.size} players`);

    // List players
    console.log("\n🎮 Players in room:");
    room.state.players.forEach((player, key) => {
      console.log(`  - ${key}: ${player.nickname}`);
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`\n✅ TEST PASSED!`);
    room.leave();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }
}

testConnection();
