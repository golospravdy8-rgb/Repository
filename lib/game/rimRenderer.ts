/**
 * Реалистичная отрисовка баскетбольного кольца и сетки
 * Включает кольцо (дужку), сетку и анимацию при попадании
 */

/**
 * Рисует реалистичное баскетбольное кольцо с сеткой
 *
 * @param ctx Canvas контекст
 * @param rimCenter Позиция центра кольца { x, y }
 * @param rimRadius Радиус дужки в пикселях
 * @param rimWidth Толщина дужки в пикселях
 */
export function drawRealisticHoop(
  ctx: CanvasRenderingContext2D,
  rimCenter: { x: number; y: number },
  rimRadius: number,
  rimWidth: number = 7
) {
  ctx.save();

  // === ДУЖКА КОЛЬЦА (оранжевая труба) ===

  // Задняя часть дужки (более тёмная оранжевая)
  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = rimWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.arc(rimCenter.x, rimCenter.y, rimRadius, 0, Math.PI, false);
  ctx.stroke();

  // Передняя часть дужки (ярче для 3D эффекта)
  ctx.strokeStyle = '#FF8C00';
  ctx.lineWidth = rimWidth + 1;

  ctx.beginPath();
  ctx.arc(
    rimCenter.x,
    rimCenter.y,
    rimRadius,
    Math.PI,
    2 * Math.PI,
    false
  );
  ctx.stroke();

  ctx.restore();

  // === СЕТКА ===
  drawNetSegments(ctx, rimCenter, rimRadius);
}

/**
 * Рисует сегменты сетки (вертикальные нити и горизонтальные узлы)
 */
function drawNetSegments(
  ctx: CanvasRenderingContext2D,
  rimCenter: { x: number; y: number },
  rimRadius: number
) {
  const netHeight = rimRadius * 1.8;
  const segments = 10;
  const rows = 6;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;

  // Вертикальные нити сетки
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const topX = rimCenter.x + (t * 2 - 1) * rimRadius;
    const topY = rimCenter.y;

    // Сужение сетки к низу (конус)
    const narrowing = 0.4;
    const bottomX = rimCenter.x + (t * 2 - 1) * rimRadius * narrowing;
    const bottomY = rimCenter.y + netHeight;

    ctx.beginPath();
    ctx.moveTo(topX, topY);

    // Слегка волнистая нить для естественности
    const midX = (topX + bottomX) / 2 + (Math.random() * 2 - 1) * 0.5;
    const midY = (topY + bottomY) / 2;
    ctx.quadraticCurveTo(midX, midY, bottomX, bottomY);
    ctx.stroke();
  }

  // Горизонтальные узлы сетки
  for (let row = 1; row <= rows; row++) {
    const t = row / rows;
    const y = rimCenter.y + t * netHeight;
    const narrowing = 1 - t * (1 - 0.4);

    ctx.beginPath();
    ctx.moveTo(rimCenter.x - rimRadius * narrowing, y);
    ctx.lineTo(rimCenter.x + rimRadius * narrowing, y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Анимация сетки при попадании мяча в кольцо
 * Рисует волну, которая распространяется по сетке
 *
 * @param ctx Canvas контекст
 * @param rimCenter Позиция центра кольца
 * @param rimRadius Радиус кольца
 * @param progress Прогресс анимации от 0 до 1
 */
export function drawNetScoreAnimation(
  ctx: CanvasRenderingContext2D,
  rimCenter: { x: number; y: number },
  rimRadius: number,
  progress: number
) {
  const netHeight = rimRadius * 1.8;
  // Волна затухает со временем (амплитуда уменьшается)
  const wave = Math.sin(progress * Math.PI * 3) * (1 - progress) * 10;
  const segments = 10;

  ctx.save();
  // Альфа-канал затухает во время анимации
  const alpha = Math.max(0, 0.9 - progress * 0.5);
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 2;

  // Вертикальные нити с волной
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const topX = rimCenter.x + (t * 2 - 1) * rimRadius;
    const topY = rimCenter.y;

    const narrowing = 0.4;
    const bottomX = rimCenter.x + (t * 2 - 1) * rimRadius * narrowing;
    const bottomY = rimCenter.y + netHeight;

    ctx.beginPath();
    ctx.moveTo(topX, topY);

    // Волна деформирует сетку (больше в центре, меньше по краям)
    const midX = (topX + bottomX) / 2 + wave * (t - 0.5) * 2;
    const midY = (topY + bottomY) / 2 + wave * 0.5;
    ctx.quadraticCurveTo(midX, midY, bottomX, bottomY);
    ctx.stroke();
  }

  ctx.restore();
}
