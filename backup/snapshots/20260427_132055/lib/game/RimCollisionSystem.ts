import { RIM_PHYSICS_CONFIG } from './rimPhysicsConfig';

interface Vector2 {
  x: number;
  y: number;
}

interface CollisionResult {
  isColliding: boolean;
  normal: Vector2;
  contactPoint: Vector2;
  penetration: number;
}

interface BallState {
  rimTouches: number;
  passedTopGate: boolean;
  hasScoredThisShot: boolean;
}

/**
 * Система столкновений мяча с кольцом
 * Реализует реалистичную физику отскока от дужки и gate-систему для определения гола
 */
export class RimCollisionSystem {
  private config: typeof RIM_PHYSICS_CONFIG;

  constructor(config = RIM_PHYSICS_CONFIG) {
    this.config = config;
  }

  /**
   * Проверяет столкновение мяча (окружность) с дужкой кольца (тор)
   * Основано на расстоянии от центра до окружности кольца
   *
   * @param ballPos Позиция центра мяча
   * @param ballRadius Радиус мяча
   * @param rimCenter Позиция центра кольца
   * @returns Результат коллизии с нормалью и точкой контакта
   */
  detectBallRimCollision(
    ballPos: Vector2,
    ballRadius: number,
    rimCenter: Vector2
  ): CollisionResult {
    const dx = ballPos.x - rimCenter.x;
    const dy = ballPos.y - rimCenter.y;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);
    const rimR = this.config.rimRadius;

    // Расстояние от поверхности дужки до центра мяча
    // Если мяч внутри дужки (radiusInner < dist < radiusOuter), произойдёт столкновение
    const rimOuterRadius = rimR + this.config.rimWidth / 2;
    const rimInnerRadius = rimR - this.config.rimWidth / 2;

    // Проверяем пересечение мяча с дужкой
    const penetration =
      ballRadius + this.config.rimWidth / 2 - Math.abs(distFromCenter - rimR);

    if (penetration <= 0) {
      return {
        isColliding: false,
        normal: { x: 0, y: 0 },
        contactPoint: { x: 0, y: 0 },
        penetration: 0,
      };
    }

    // Определить точку контакта на дужке
    const contactAngle = Math.atan2(dy, dx);
    const contactRadius =
      distFromCenter < rimR ? rimInnerRadius : rimOuterRadius;
    const contactPoint = {
      x: rimCenter.x + Math.cos(contactAngle) * contactRadius,
      y: rimCenter.y + Math.sin(contactAngle) * contactRadius,
    };

    // Нормаль направлена от контакта к центру мяча
    const nx = ballPos.x - contactPoint.x;
    const ny = ballPos.y - contactPoint.y;
    const len = Math.sqrt(nx * nx + ny * ny) || 1;

    return {
      isColliding: true,
      normal: { x: nx / len, y: ny / len },
      contactPoint,
      penetration,
    };
  }

  /**
   * Расчёт отскока мяча от дужки кольца
   * Разделяет скорость на нормальную (упругость) и тангенциальную (трение)
   *
   * Использует формулу отражения:
   * v_new = -restitution * (v·n) * n + (1 - friction) * v_tangent
   *
   * @param vel Вектор скорости мяча
   * @param normal Нормаль к поверхности контакта
   * @param dt Дельта времени (для трения)
   * @returns Новый вектор скорости после отскока
   */
  calculateRimBounce(
    vel: Vector2,
    normal: Vector2,
    dt: number = 1 / 60
  ): Vector2 {
    const { rimRestitution, rimFriction } = this.config;

    // Скалярное произведение скорости и нормали (компонента вдоль нормали)
    const dot = vel.x * normal.x + vel.y * normal.y;

    // Тангенциальная составляющая (движение вдоль дужки)
    const tx = vel.x - dot * normal.x;
    const ty = vel.y - dot * normal.y;

    // По нормали отскакиваем с коэффициентом упругости
    // Если dot < 0 (мяч летит в дужку), отскок = -dot * restitution
    const bounceNormal = -dot * rimRestitution;

    // Трение замедляет тангенциальное движение
    // Чем больше rimFriction, тем больше замедление
    const frictionFactor = Math.max(0, 1 - rimFriction * dt * 60);

    return {
      x: bounceNormal * normal.x + tx * frictionFactor,
      y: bounceNormal * normal.y + ty * frictionFactor,
    };
  }

  /**
   * Проверяет попал ли мяч в кольцо (gate-система из RigelFrix/Unity)
   * Два триггера: верхний (вход) и нижний (выход через сетку)
   *
   * Гол засчитывается когда мяч проходит через обе зоны сверху вниз
   *
   * @param ballPos Позиция мяча
   * @param ballVel Скорость мяча
   * @param rimCenter Центр кольца
   * @param state Состояние мяча (прошёл ли верхнюю зону, и т.д.)
   * @returns { scored: boolean, updatedState: BallState }
   */
  checkScoring(
    ballPos: Vector2,
    ballVel: Vector2,
    rimCenter: Vector2,
    state: BallState
  ): { scored: boolean; updatedState: BallState } {
    const {
      topGateOffset,
      bottomGateOffset,
      gateWidth,
      minVelocityTopGate,
      minVelocityBottomGate,
    } = this.config;

    const newState = { ...state };

    // Мяч должен лететь вниз для попадания (vy > 0)
    if (ballVel.y <= 0) {
      return { scored: false, updatedState: newState };
    }

    const dx = Math.abs(ballPos.x - rimCenter.x);

    // === TOP GATE: мяч входит в кольцо сверху ===
    const topGateY = rimCenter.y + topGateOffset;
    const atTopGate = Math.abs(ballPos.y - topGateY) < 8;
    const inGateWidth = dx < gateWidth / 2;
    const fastEnough = ballVel.y > minVelocityTopGate;

    if (!newState.passedTopGate && fastEnough && atTopGate && inGateWidth) {
      newState.passedTopGate = true;
    }

    // === BOTTOM GATE: мяч выходит снизу через сетку → ГОЛ! ===
    const bottomGateY = rimCenter.y + bottomGateOffset;
    const atBottomGate = Math.abs(ballPos.y - bottomGateY) < 8;
    const fastEnoughBottom = ballVel.y > minVelocityBottomGate;

    if (
      newState.passedTopGate &&
      !newState.hasScoredThisShot &&
      fastEnoughBottom &&
      atBottomGate &&
      inGateWidth
    ) {
      newState.hasScoredThisShot = true;
      return { scored: true, updatedState: newState };
    }

    return { scored: false, updatedState: newState };
  }

  /**
   * Сброс состояния мяча при начале нового броска
   */
  resetBallState(): BallState {
    return {
      rimTouches: 0,
      passedTopGate: false,
      hasScoredThisShot: false,
    };
  }
}
