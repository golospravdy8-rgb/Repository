import Matter from 'matter-js';

const { Engine, Bodies, Body, Events, Vector, Composite, Collision } = Matter;

export type CollisionType = 'swish' | 'rattleIn' | 'rimOut' | 'bankShot' | 'none';

export interface BallPhysicsResult {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angularVelocity: number;
  collisionType: CollisionType;
}

export class BasketballPhysics {
  private engine: Matter.Engine;
  private ball: Matter.Body;
  private hoopLeft: Matter.Body;
  private hoopRight: Matter.Body;
  private backboard: Matter.Body;
  private worldBounds: Matter.Body[];

  readonly RESTITUTION = 0.6;  // упругость при отскоке
  readonly FRICTION = 0.01;    // трение о воздух
  readonly BALL_MASS = 0.623;  // масса баскетбольного мяча в кг
  readonly AIR_RESISTANCE = 0.99; // сопротивление воздуха

  private lastCollisionType: CollisionType = 'none';
  private lastCollisionTime: number = 0;

  constructor(
    hoopX: number,
    hoopY: number,
    hoopRadius: number,
    ballRadius: number,
    boardX?: number,
    boardY?: number
  ) {
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.2 },  // гравитация в пиксели/мс^2
      enableSleeping: false
    });

    // Левое ребро обруча (маленький круг для коліжій)
    this.hoopLeft = Bodies.circle(
      hoopX - hoopRadius, hoopY, 4,
      {
        isStatic: true,
        restitution: this.RESTITUTION,
        label: 'rimLeft',
        friction: 0.8,
        frictionStatic: 0.8
      }
    );

    // Правое ребро обруча
    this.hoopRight = Bodies.circle(
      hoopX + hoopRadius, hoopY, 4,
      {
        isStatic: true,
        restitution: this.RESTITUTION,
        label: 'rimRight',
        friction: 0.8,
        frictionStatic: 0.8
      }
    );

    // Щит (вертикальная прямоугольная поверхность)
    this.backboard = Bodies.rectangle(
      boardX || hoopX - hoopRadius - 15,
      boardY || hoopY - 30,
      8,
      100,
      {
        isStatic: true,
        restitution: 0.5,
        label: 'backboard',
        friction: 0.3
      }
    );

    // Мяч (динамический объект)
    this.ball = Bodies.circle(0, 0, ballRadius, {
      restitution: this.RESTITUTION,
      friction: this.FRICTION,
      frictionAir: 0.005,
      mass: this.BALL_MASS,
      label: 'ball',
      density: 0.001
    });

    // Границы мира (чтобы мяч не улетел за пределы)
    const bounds = 2000;
    this.worldBounds = [
      Bodies.rectangle(-bounds, 0, bounds * 2, 100, { isStatic: true, label: 'wallLeft' }),
      Bodies.rectangle(bounds, 0, bounds * 2, 100, { isStatic: true, label: 'wallRight' }),
      Bodies.rectangle(0, -bounds, bounds * 2, 100, { isStatic: true, label: 'wallTop' })
    ];

    Composite.add(this.engine.world, [
      this.hoopLeft,
      this.hoopRight,
      this.backboard,
      this.ball,
      ...this.worldBounds
    ]);

    // Слушатель коллизий
    Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        if (pair.bodyA.label === 'ball' || pair.bodyB.label === 'ball') {
          this.handleCollision(pair);
        }
      });
    });
  }

  private handleCollision(pair: Matter.Pair) {
    const otherBody = pair.bodyA.label === 'ball' ? pair.bodyB : pair.bodyA;

    if (otherBody.label === 'rimLeft' || otherBody.label === 'rimRight') {
      this.lastCollisionType = 'rimOut'; // По умолчанию rimOut, может быть переписано
      this.lastCollisionTime = Date.now();
    } else if (otherBody.label === 'backboard') {
      this.lastCollisionType = 'bankShot';
      this.lastCollisionTime = Date.now();
    }
  }

  launchBall(startX: number, startY: number, vx: number, vy: number) {
    Body.setPosition(this.ball, { x: startX, y: startY });
    Body.setVelocity(this.ball, { x: vx, y: vy });
    Body.setAngularVelocity(this.ball, 0.3);
    this.lastCollisionType = 'none';
  }

  step(deltaTime: number = 1000 / 60): BallPhysicsResult {
    Engine.update(this.engine, deltaTime);

    // Применяем воздушное сопротивление
    Body.setVelocity(this.ball, {
      x: this.ball.velocity.x * this.AIR_RESISTANCE,
      y: this.ball.velocity.y
    });

    const pos = this.ball.position;
    const collisionType = this.detectCollisionType();

    // Обновляем lastCollisionType если произошла новая коллизия
    if (collisionType !== 'none') {
      this.lastCollisionType = collisionType;
    }

    return {
      x: pos.x,
      y: pos.y,
      vx: this.ball.velocity.x,
      vy: this.ball.velocity.y,
      angularVelocity: this.ball.angularVelocity,
      collisionType: this.lastCollisionType
    };
  }

  private detectCollisionType(): CollisionType {
    const ballPos = this.ball.position;
    const hoopCenterX = (this.hoopLeft.position.x + this.hoopRight.position.x) / 2;
    const hoopCenterY = this.hoopLeft.position.y;

    const distToCenter = Vector.magnitude(
      Vector.sub(ballPos, { x: hoopCenterX, y: hoopCenterY })
    );

    const NET_ZONE = 10;
    const HOOP_RADIUS = (this.hoopRight.position.x - this.hoopLeft.position.x) / 2;

    const isGoingDown = this.ball.velocity.y > 0;
    const isAtHoopLevel = Math.abs(ballPos.y - hoopCenterY) < 20;

    if (!isGoingDown || !isAtHoopLevel) {
      return 'none';
    }

    // SWISH: чистое попадание в центр
    if (distToCenter < NET_ZONE) {
      return 'swish';
    }

    // RATTLE_IN: дотик обода с крутым углом
    if (distToCenter < HOOP_RADIUS) {
      const entryAngle = Math.atan2(this.ball.velocity.y, this.ball.velocity.x) * 180 / Math.PI;
      return entryAngle < -25 ? 'rattleIn' : 'rimOut';
    }

    return 'none';
  }

  getBallPosition() {
    return { ...this.ball.position };
  }

  getBallVelocity() {
    return { ...this.ball.velocity };
  }

  checkCollision(ballX: number, ballY: number, ballVx: number, ballVy: number): CollisionType {
    const hoopCenterX = (this.hoopLeft.position.x + this.hoopRight.position.x) / 2;
    const hoopCenterY = this.hoopLeft.position.y;

    const distToCenter = Math.hypot(ballX - hoopCenterX, ballY - hoopCenterY);
    const NET_ZONE = 10;
    const HOOP_RADIUS = (this.hoopRight.position.x - this.hoopLeft.position.x) / 2;

    const isGoingDown = ballVy > 0;
    const isAtHoopLevel = Math.abs(ballY - hoopCenterY) < 20;

    if (!isGoingDown || !isAtHoopLevel) {
      return 'none';
    }

    if (distToCenter < NET_ZONE) {
      return 'swish';
    }

    if (distToCenter < HOOP_RADIUS) {
      const entryAngle = Math.atan2(ballVy, ballVx) * 180 / Math.PI;
      return entryAngle < -25 ? 'rattleIn' : 'rimOut';
    }

    return 'none';
  }

  destroy() {
    Engine.clear(this.engine);
  }
}
