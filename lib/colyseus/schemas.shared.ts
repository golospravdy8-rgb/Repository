// ✅ SHARED SCHEMA FILE - Used by both server and client
// This file MUST be identical on both sides for Colyseus serialization to work

import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerSchema extends Schema {
  @type("string") id: string = "";
  @type("string") nickname: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") color: string = "#4fc3f7";
  @type("number") playerIndex: number = 0;
  @type("number") score: number = 0;
  @type("string") status: string = "alive"; // alive | dead | shooting
  @type("boolean") isReady: boolean = false;
  @type("string") lastAction: string = "idle";
  @type("number") lastSeen: number = 0;
}

export class BallSchema extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") radius: number = 12;
  @type("string") state: string = "idle"; // idle | flying | bouncing | scored
  @type("string") lastShooterId: string = "";
  @type("boolean") inHole: boolean = false;
  @type("number") rotation: number = 0;
  @type("number") rimContacts: number = 0;
  @type("number") spin: number = 0;
  @type("number") guaranteedScore: number = 0; // для accuracy-based scoring
  @type("number") omega: number = 0;           // rad/s spin from new physics engine
  @type("number") physTick: number = 0;        // current physics tick
  @type("string") lastOutcome: string = "";    // last classified ShotOutcome
  @type("number") rimContactMask: number = 0;  // bitmask: bit0=front, bit1=back, bit2=side
  @type("string") trajectoryHash: string = ""; // base64 trajectory for desync detection
  @type("number") launchTick: number = 0;      // server tick when shot launched
}

export class GameStateSchema extends Schema {
  @type({ map: PlayerSchema })
  players = new MapSchema<PlayerSchema>();

  @type(BallSchema)
  ball = new BallSchema();

  @type("string")
  gamePhase = "waiting";

  @type("number")
  gameTime = 0;

  @type("number")
  rimX = 110;

  @type("number")
  rimY = 307;

  @type("number")
  rimRadius = 27;

  @type("number")
  ballRadius = 12;

  @type("number")
  scale = 1;

  @type("number")
  physicsTick: number = 0;     // global monotonic 120Hz tick counter
  @type("string")
  desyncFlags: string = "";    // comma-separated playerIds with desync
}
