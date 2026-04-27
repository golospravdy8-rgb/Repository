#!/usr/bin/env node

const { Client } = require("colyseus.js");

// Copy schema definitions from server
const { Schema, type, MapSchema } = require("@colyseus/schema");

class PlayerSchema extends Schema {}
type("string")(PlayerSchema.prototype, "id");
type("string")(PlayerSchema.prototype, "nickname");
type("number")(PlayerSchema.prototype, "x");
type("number")(PlayerSchema.prototype, "y");
type("string")(PlayerSchema.prototype, "color");
type("number")(PlayerSchema.prototype, "playerIndex");
type("number")(PlayerSchema.prototype, "score");
type("string")(PlayerSchema.prototype, "status");
type("boolean")(PlayerSchema.prototype, "isReady");
type("string")(PlayerSchema.prototype, "lastAction");

class BallSchema extends Schema {}
type("number")(BallSchema.prototype, "x");
type("number")(BallSchema.prototype, "y");
type("number")(BallSchema.prototype, "vx");
type("number")(BallSchema.prototype, "vy");
type("number")(BallSchema.prototype, "radius");
type("string")(BallSchema.prototype, "state");
type("string")(BallSchema.prototype, "lastShooterId");
type("boolean")(BallSchema.prototype, "inHole");
type("number")(BallSchema.prototype, "rotation");
type("number")(BallSchema.prototype, "rimContacts");
type("number")(BallSchema.prototype, "spin");
type("number")(BallSchema.prototype, "guaranteedScore");

class GameStateSchema extends Schema {}
type({ map: PlayerSchema })(GameStateSchema.prototype, "players");
type(BallSchema)(GameStateSchema.prototype, "ball");
type("string")(GameStateSchema.prototype, "gamePhase");
type("number")(GameStateSchema.prototype, "gameTime");
type("number")(GameStateSchema.prototype, "rimX");
type("number")(GameStateSchema.prototype, "rimY");
type("number")(GameStateSchema.prototype, "rimRadius");
type("number")(GameStateSchema.prototype, "ballRadius");
type("number")(GameStateSchema.prototype, "scale");

// Set the schema class as the room's state model
Room.prototype.state = GameStateSchema;

async function test() {
  try {
    console.log("[TEST] Creating client...");
    const client = new Client("ws://localhost:3006");
    const room = await client.joinOrCreate("basketball", { nickname: "Test1" });

    console.log("[TEST] ✅ Joined! Session:", room.sessionId);
    console.log("[TEST] State type:", room.state.constructor.name);
    console.log("[TEST] Players size:", room.state.players?.size || "undefined");

    if (room.state.players) {
      room.state.players.forEach((player) => {
        console.log(`  - ${player.nickname} at (${player.x}, ${player.y})`);
      });
    }

    room.leave();
    process.exit(0);
  } catch (err) {
    console.error("[TEST] ❌ Error:", err.message);
    process.exit(1);
  }
}

test();
