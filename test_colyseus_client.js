#!/usr/bin/env node

const { Client } = require("colyseus.js");

async function testConnection() {
  console.log("🚀 Testing Colyseus connection to ws://localhost:3006...\n");

  const client = new Client("ws://localhost:3006");

  try {
    console.log("📤 Attempting to join basketball room...");
    // Player 1 joins
    const room1 = await client.joinOrCreate("basketball", {
      nickname: "Player1",
      color: "#4fc3f7"
    });

    console.log(`✅ Player 1 joined. Session ID: ${room1.sessionId}`);

    // Wait for state to be available
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`📊 Room players count: ${room1.state.players.size}`);

    // Join Player 2
    console.log("\n📤 Player 2 joining...");
    const client2 = new Client("ws://localhost:3000");
    const room2 = await client2.joinOrCreate("basketball", {
      nickname: "Player2",
      color: "#81c784"
    });

    console.log(`✅ Player 2 joined. Session ID: ${room2.sessionId}`);

    await new Promise(resolve => setTimeout(resolve, 800));

    // Check visibility
    const p1Count = room1.state.players.size;
    const p2Count = room2.state.players.size;

    console.log(`\n📊 Player 1 sees ${p1Count} players`);
    console.log(`📊 Player 2 sees ${p2Count} players`);

    // List all visible players
    console.log("\n🎮 Player 1's view:");
    room1.state.players.forEach((player, key) => {
      console.log(`  - ${key}: ${player.nickname} (x=${player.x}, y=${player.y})`);
    });

    console.log("\n🎮 Player 2's view:");
    room2.state.players.forEach((player, key) => {
      console.log(`  - ${key}: ${player.nickname} (x=${player.x}, y=${player.y})`);
    });

    // Test move
    console.log("\n📤 Player 1 sending move event...");
    room1.send("move", { x: 300, y: 200, status: "alive" });

    await new Promise(resolve => setTimeout(resolve, 500));

    const p1After = room1.state.players.get(room1.sessionId);
    console.log(`\n📍 Player 1 position after move: x=${p1After.x}, y=${p1After.y}`);

    if (p1Count === 2 && p2Count === 2) {
      console.log(`\n✅ TEST PASSED! Both players can see each other!`);
      room1.leave();
      room2.leave();
      process.exit(0);
    } else {
      console.log(`\n❌ TEST FAILED! Players not visible to each other.`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testConnection();
