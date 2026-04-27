#!/usr/bin/env node

const { Client } = require("colyseus.js");

async function connectPlayer(name) {
  try {
    const client = new Client("ws://localhost:3006");
    const room = await client.joinOrCreate("basketball", { nickname: name });

    console.log(`[${name}] ✅ Connected! Session:`, room.sessionId);
    console.log(`[${name}] State keys:`, Object.keys(room.state || {}));
    console.log(`[${name}] State.gamePhase:`, room.state?.gamePhase);
    console.log(`[${name}] State.players type:`, typeof room.state?.players);

    // Try to access players
    if (room.state?.players) {
      console.log(`[${name}] Players size:`, room.state.players.size);
      room.state.players.forEach((player) => {
        console.log(`[${name}]   - Player: ${player.nickname} (id: ${player.id})`);
      });
    } else {
      console.log(`[${name}] ⚠️ No players property`);
    }

    return { room, client, name };
  } catch (err) {
    console.error(`[${name}] ❌ Failed:`, err.message);
    return null;
  }
}

(async () => {
  console.log("=== PLAYER 1 JOINS ===");
  const p1 = await connectPlayer("Player1");
  if (!p1) process.exit(1);

  await new Promise(r => setTimeout(r, 1000));

  console.log("\n=== PLAYER 2 JOINS ===");
  const p2 = await connectPlayer("Player2");
  if (!p2) process.exit(1);

  await new Promise(r => setTimeout(r, 1000));

  console.log("\n=== FINAL STATE ===");
  console.log("[P1] Players:", p1.room.state?.players?.size || 0);
  console.log("[P2] Players:", p2.room.state?.players?.size || 0);

  p1.room.leave();
  p2.room.leave();
  process.exit(0);
})();
