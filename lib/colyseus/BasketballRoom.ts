import { Room, Client } from "colyseus";
import { GameStateSchema, PlayerSchema, BallSchema } from "./schemas.shared";

const PLAYER_COLORS = ["#4fc3f7", "#81c784", "#ffb74d", "#f06292", "#ce93d8", "#80cbc4"];

export class BasketballRoom extends Room<GameStateSchema> {
  maxClients = 6;

  // Physics constants (скопированы из RucheekGameCanvas)
  private G = 0.102;                          // гравитация
  private RESTITUTION_RIM = 0.55;             // отскок от обода
  private RESTITUTION_BACKBOARD = 0.45;       // отскок от щита
  private RESTITUTION_FLOOR = 0.35;           // отскок от пола
  private MIN_BALL_SPEED = 5.0;
  private MAX_BALL_SPEED = 16.0;

  // Canvas/Hoop dimensions
  private W_ORIG = 860;
  private H_ORIG = 624;
  private GY_ORIG = 584;
  private POLE_X = 12;
  private ARM_X = 52;
  private BOARD_X = 57;
  private BOARD_W = 10;
  private BOARD_TOP = 189;
  private BOARD_BOT = 292;
  private HOOP_X = 110;
  private HOOP_Y = 307;
  private HOOP_R = 27;
  private HOOP_DEPTH = 15;
  private NET_ZONE = 35;
  private BALL_RADIUS = 12;

  private lastBallScore = 0;
  private ballShotTime = 0;

  onCreate(options: any) {
    console.log(`[Colyseus] Basketball room created`);

    this.setState(new GameStateSchema());

    const state = this.state;
    state.rimX = this.HOOP_X;
    state.rimY = this.HOOP_Y;
    state.rimRadius = this.HOOP_R;
    state.ballRadius = this.BALL_RADIUS;
    state.scale = 1;

    // Physics loop: 60fps = 16.67ms per frame
    this.setSimulationInterval((deltaTime) => {
      this.updatePhysics(deltaTime);
    }, 1000 / 60);

    // Message handlers
    this.onMessage("move", (client, data) => this.handleMove(client, data));
    this.onMessage("shoot", (client, data) => this.handleShoot(client, data));
    this.onMessage("ready", (client, data) => this.handleReady(client, data));
  }

  onJoin(client: Client, options: any) {
    console.log(`[Colyseus] Player ${options.nickname} joining (${client.sessionId})`);

    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.nickname = options.nickname || "Player";

    // 🏀 RUCHEEK: Assign permanent playerIndex (0-5) based on join order
    const playerCount = this.state.players.size;
    player.playerIndex = playerCount;

    // 🏀 RUCHEEK: Fixed queue positions (X coordinates)
    // These are hardcoded from original QUEUE_POSITIONS array (original coords: 860x624)
    const QUEUE_X = [480, 560, 640, 720, 800, 860];
    const queueX = QUEUE_X[Math.min(playerCount, QUEUE_X.length - 1)];

    player.x = queueX;     // Fixed X from queue position
    player.y = 584;        // Ground Y (always same in original coords, scales on client)
    player.color = options.color || PLAYER_COLORS[playerCount % PLAYER_COLORS.length];
    player.status = "alive";
    player.score = 0;

    this.state.players.set(client.sessionId, player);

    console.log(`[Colyseus] Player ${player.nickname} joined. Total: ${this.state.players.size}`);

    // Broadcast join event to all (including new player)
    this.broadcast("playerJoined", {
      playerId: client.sessionId,
      nickname: player.nickname,
      color: player.color,
      playerIndex: player.playerIndex,
    });
  }

  onLeave(client: Client) {
    console.log(`[Colyseus] Player ${client.sessionId} leaving`);
    this.state.players.delete(client.sessionId);

    this.broadcast("playerLeft", {
      playerId: client.sessionId,
    });
  }

  private handleMove(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.x = data.x || player.x;
    player.y = data.y || player.y;
    player.status = data.status || "alive";
  }

  private handleShoot(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.status = "shooting";

    // Launch ball on server
    const ball = this.state.ball;
    ball.x = data.startX || player.x;
    ball.y = data.startY || player.y;
    ball.vx = data.vx || 0;
    ball.vy = data.vy || 0;
    ball.state = "flying";
    ball.lastShooterId = client.sessionId;
    ball.rimContacts = 0;
    ball.spin = data.spin || 0;
    ball.rotation = 0;
    ball.guaranteedScore = data.guaranteedScore || 0;

    this.ballShotTime = Date.now();
    this.lastBallScore = 0;

    console.log(`[Physics] Ball launched by ${player.nickname}: vx=${ball.vx.toFixed(2)}, vy=${ball.vy.toFixed(2)}`);
  }

  private handleReady(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.isReady = true;
    }
  }

  private updatePhysics(deltaTime: number) {
    const ball = this.state.ball;

    if (ball.state !== "flying" && ball.state !== "bouncing") {
      return;
    }

    // Apply gravity
    ball.vy += this.G;

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Apply spin (rotation)
    if (ball.spin) {
      ball.rotation += ball.spin * 2;
    }

    // Check collisions
    const groundY = this.GY_ORIG;

    // Floor collision
    if (ball.y >= groundY - this.BALL_RADIUS) {
      ball.y = groundY - this.BALL_RADIUS;
      ball.vy *= -this.RESTITUTION_FLOOR;
      ball.vx *= 0.95;

      if (Math.abs(ball.vy) < 1.5 && Math.abs(ball.vx) < 1.5) {
        ball.state = "idle";
        ball.vx = 0;
        ball.vy = 0;
      }
    }

    // Backboard collision
    const BOARD_X = this.BOARD_X;
    const BOARD_FACE = BOARD_X + this.BOARD_W;
    const BOARD_TOP = this.BOARD_TOP;
    const BOARD_BOT = this.BOARD_BOT;

    if (
      ball.x - this.BALL_RADIUS < BOARD_FACE &&
      ball.x + this.BALL_RADIUS > BOARD_X &&
      ball.y > BOARD_TOP &&
      ball.y < BOARD_BOT
    ) {
      ball.x = BOARD_FACE + this.BALL_RADIUS;
      ball.vx *= -this.RESTITUTION_BACKBOARD;
    }

    // Hoop collision
    this.checkAndApplyRimCollision(ball);

    // Check if ball is in hoop
    this.checkGoal(ball);

    // Bounds check
    if (ball.x < 0 || ball.x > this.W_ORIG || ball.y > this.GY_ORIG + 100) {
      ball.state = "idle";
      ball.vx = 0;
      ball.vy = 0;
    }
  }

  private checkAndApplyRimCollision(ball: BallSchema) {
    const dx = ball.x - this.HOOP_X;
    const dy = ball.y - this.HOOP_Y;
    const dist = Math.hypot(dx, dy);

    // Rim tube radius
    const RIM_TUBE = this.HOOP_R * 0.22;

    // Check if ball is near rim
    if (dist < this.HOOP_R + this.BALL_RADIUS + 5) {
      // Determine which rim edge (front or back)
      const frontRim = { x: this.HOOP_X + this.HOOP_R, y: this.HOOP_Y };
      const backRim = { x: this.HOOP_X - this.HOOP_R, y: this.HOOP_Y };

      const dFront = Math.hypot(ball.x - frontRim.x, ball.y - frontRim.y);
      const dBack = Math.hypot(ball.x - backRim.x, ball.y - backRim.y);
      const isFront = dFront < dBack;
      const rim = isFront ? frontRim : backRim;

      const rimDx = ball.x - rim.x;
      const rimDy = ball.y - rim.y;
      const rimDist = Math.hypot(rimDx, rimDy) || 1;

      // Normal vector
      const nx = rimDx / rimDist;
      const ny = rimDy / rimDist;

      // Check if ball is touching rim
      if (rimDist < RIM_TUBE + this.BALL_RADIUS) {
        // Push ball away from rim
        ball.x = rim.x + nx * (this.BALL_RADIUS + RIM_TUBE + 1);
        ball.y = rim.y + ny * (this.BALL_RADIUS + RIM_TUBE + 1);

        // Reflect velocity
        const dot = ball.vx * nx + ball.vy * ny;
        const tx = ball.vx - dot * nx;
        const ty = ball.vy - dot * ny;

        ball.vx = -dot * 0.25 * nx + tx * 0.82;
        ball.vy = -dot * 0.25 * ny + ty * 0.82;

        ball.rimContacts++;

        console.log(`[Physics] Rim collision #${ball.rimContacts}: speed=${Math.hypot(ball.vx, ball.vy).toFixed(2)}`);
      }
    }
  }

  private checkGoal(ball: BallSchema) {
    if (this.lastBallScore !== 0) return; // Already scored

    const dx = ball.x - this.HOOP_X;
    const dy = ball.y - this.HOOP_Y;
    const dist = Math.hypot(dx, dy);

    // Check if ball is inside hoop AND moving down
    if (dist < this.HOOP_R && ball.vy > 0 && ball.y > this.HOOP_Y + 10) {
      // Determine score based on accuracy/collision type
      let score = 0;
      let collisionType = "rimOut";

      if (ball.guaranteedScore >= 0.85) {
        // Guaranteed score (high accuracy)
        score = 12;
        collisionType = "swish";
      } else if (ball.guaranteedScore >= 0.70) {
        // Good accuracy
        score = 9;
        collisionType = "rattleIn";
      } else if (ball.guaranteedScore >= 0.50) {
        // Mediocre accuracy
        score = 6;
        collisionType = "rimOut";
      } else if (ball.rimContacts >= 1) {
        // Hit rim
        score = 3;
        collisionType = "bankShot";
      } else {
        // Miss
        score = 0;
        collisionType = "miss";
      }

      this.lastBallScore = score;
      ball.state = "scored";
      ball.inHole = true;

      // Update shooter's score
      const shooterId = ball.lastShooterId;
      const shooter = this.state.players.get(shooterId);
      if (shooter && score > 0) {
        shooter.score += score;
        console.log(`[Physics] GOAL! ${shooter.nickname} scored ${score} points! Total: ${shooter.score}`);
      } else {
        console.log(`[Physics] MISS! Ball scored 0 points.`);
      }

      // Broadcast shot result to all clients
      this.broadcast("shotResult", {
        playerId: shooterId,
        nickname: shooter?.nickname || "Player",
        score: score,
        collisionType: collisionType,
        accuracy: ball.guaranteedScore,
        timestamp: Date.now(),
      });

      // Reset ball after 1 second
      setTimeout(() => {
        ball.state = "idle";
        ball.x = 0;
        ball.y = 0;
        ball.vx = 0;
        ball.vy = 0;
        ball.inHole = false;
        ball.rimContacts = 0;
        ball.guaranteedScore = 0;
        this.lastBallScore = 0;

        // Reset shooter status
        if (shooter) {
          shooter.status = "alive";
        }
      }, 1000);
    }
  }
}
