#!/usr/bin/env node

const { Client } = require("colyseus.js");

(async () => {
  try {
    const client = new Client("ws://localhost:3006");
    const room = await client.joinOrCreate("basketball", { nickname: "TestCheck" });

    console.log("========== ROOM STRUCTURE ==========");
    console.log("room.sessionId:", room.sessionId);
    console.log("room.name:", room.name);
    console.log("room.state:", room.state);
    console.log("\n========== STATE OBJECT ==========");
    console.log("typeof room.state:", typeof room.state);
    console.log("room.state.constructor:", room.state?.constructor?.name);
    console.log("room.state keys:", Object.keys(room.state || {}));

    console.log("\n========== TRYING TO ACCESS PROPERTIES ==========");
    for (const key of Object.keys(room.state || {})) {
      const val = room.state[key];
      console.log(`  ${key}: ${typeof val} = ${val instanceof Map ? `Map(${val.size})` : JSON.stringify(val).slice(0, 50)}`);
    }

    room.leave();
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err.message);
    console.error("Stack:", err.stack?.slice(0, 500));
    process.exit(1);
  }
})();
