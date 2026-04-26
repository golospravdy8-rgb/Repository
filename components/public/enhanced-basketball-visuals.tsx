'use client';

/**
 * Enhanced Basketball Visuals - Pixel-Based Drawing Functions
 * Renders metallic rim, glass backboard, and cloth net
 * All coordinates are in PIXELS, not meters
 */

export class EnhancedBasketballVisuals {
  constructor() {}

  /**
   * Draw enhanced metallic rim with gradients
   * Replaces the simple ellipse with segment-based metallic rendering
   */
  drawMetallicRim(
    ctx: CanvasRenderingContext2D,
    rimX: number,
    rimY: number,
    rimRadius: number,
    scaleX: number
  ): void {
    const segments = 16;
    const segmentAngle = (Math.PI * 2) / segments;

    for (let i = 0; i < segments; i++) {
      const angle1 = i * segmentAngle;
      const angle2 = (i + 1) * segmentAngle;
      const angleMid = (angle1 + angle2) / 2;

      const x1 = rimX + rimRadius * Math.cos(angle1);
      const y1 = rimY + rimRadius * Math.sin(angle1);
      const x2 = rimX + rimRadius * Math.cos(angle2);
      const y2 = rimY + rimRadius * Math.sin(angle2);

      // Gradient for segment (brighter front, darker sides)
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);

      const isFront = Math.abs(angleMid - Math.PI / 2) < Math.PI / 4;
      const isBack = Math.abs(angleMid - (3 * Math.PI) / 2) < Math.PI / 4;

      if (isFront || isBack) {
        gradient.addColorStop(0, '#e8e8e8');
        gradient.addColorStop(0.5, '#d0d0d0');
        gradient.addColorStop(1, '#a8a8a8');
      } else {
        gradient.addColorStop(0, '#c0c0c0');
        gradient.addColorStop(0.5, '#a8a8a8');
        gradient.addColorStop(1, '#808080');
      }

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4 * scaleX;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Shine highlight on front
      if (isFront) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5 * scaleX;
        ctx.beginPath();
        ctx.moveTo(x1, y1 - 2);
        ctx.lineTo(x2, y2 - 2);
        ctx.stroke();
      }
    }

    // Rim interior shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2 * scaleX;
    ctx.beginPath();
    ctx.ellipse(rimX, rimY, rimRadius, 8 * scaleX, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Draw glass backboard with reflections and scratches
   */
  drawGlassBackboard(
    ctx: CanvasRenderingContext2D,
    boardX: number,
    boardTop: number,
    boardWidth: number,
    boardHeight: number,
    scaleX: number,
    scaleY: number
  ): void {
    // Glass base (semi-transparent blue tint)
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#6496c8';
    ctx.fillRect(boardX, boardTop, boardWidth, boardHeight);
    ctx.globalAlpha = 1;

    // Reflection gradient (left to right)
    const reflectionGradient = ctx.createLinearGradient(boardX, boardTop, boardX + boardWidth, boardTop);
    reflectionGradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    reflectionGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
    reflectionGradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
    ctx.fillStyle = reflectionGradient;
    ctx.fillRect(boardX, boardTop, boardWidth, boardHeight);

    // Vertical scratches
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) {
      const x = boardX + (Math.random() * boardWidth * 0.6 + boardWidth * 0.2);
      ctx.beginPath();
      ctx.moveTo(x, boardTop);
      ctx.lineTo(x + (Math.random() - 0.5) * 8, boardTop + boardHeight);
      ctx.stroke();
    }

    // Border glow
    const borderGradient = ctx.createLinearGradient(boardX, boardTop, boardX + boardWidth, boardTop);
    borderGradient.addColorStop(0, 'rgba(150, 200, 240, 0.6)');
    borderGradient.addColorStop(0.5, 'rgba(100, 150, 200, 0.3)');
    borderGradient.addColorStop(1, 'rgba(80, 120, 180, 0.6)');
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 3 * scaleX;
    ctx.strokeRect(boardX, boardTop, boardWidth, boardHeight);

    ctx.restore();
  }

  /**
   * Draw cloth net with deformation visualization
   * Replaces simple vertical lines with woven pattern
   */
  drawClothNet(
    ctx: CanvasRenderingContext2D,
    rimX: number,
    rimY: number,
    rimRadius: number,
    rimBottom: number,
    scaleX: number,
    scaleY: number,
    netSwing: number = 0
  ): void {
    ctx.save();

    // Net color (white nylon)
    ctx.strokeStyle = 'rgba(240, 240, 240, 0.85)';
    ctx.lineWidth = 1.5 * scaleX;

    const netVerticalLines = 7;
    const netHorizontalLines = 3;

    // Draw vertical lines with swing deformation
    for (let i = 0; i < netVerticalLines; i++) {
      const t = i / (netVerticalLines - 1);
      const x1 = rimX - rimRadius + t * (rimRadius * 2);
      const y1 = rimY + 8 * scaleY;

      // Bottom of net with tapering
      const x2 = rimX - rimRadius * 0.4 + t * (rimRadius * 0.8);
      const y2 = rimBottom + netSwing;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw horizontal lines (tapering from top to bottom)
    ctx.strokeStyle = 'rgba(220, 220, 220, 0.75)';
    for (let j = 0; j < netHorizontalLines; j++) {
      const progress = (j + 1) / (netHorizontalLines + 1);
      const y = rimY + 8 * scaleY + progress * (rimBottom - rimY - 8 * scaleY);
      const width = rimRadius * 2 * (1 - progress * 0.4);

      ctx.beginPath();
      ctx.moveTo(rimX - width / 2, y);
      ctx.lineTo(rimX + width / 2, y);
      ctx.stroke();
    }

    // Net weave pattern (diagonal lines for texture)
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 0.5;
    const waveSize = 12 * scaleX;
    for (let i = 0; i < (rimBottom - rimY) / waveSize; i++) {
      const y = rimY + 8 * scaleY + i * waveSize;
      for (let j = -1; j < 3; j++) {
        const x = rimX - rimRadius + j * waveSize * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + waveSize * 0.5, y + waveSize * 0.5);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Draw basket assembly (backboard + rim + net)
   * Call this instead of or in addition to the original drawBasket()
   */
  drawEnhancedBasket(
    ctx: CanvasRenderingContext2D,
    boardX: number,
    boardTop: number,
    boardWidth: number,
    boardHeight: number,
    hoopX: number,
    hoopY: number,
    hoopRadius: number,
    rimBottom: number,
    scaleX: number,
    scaleY: number,
    netSwing: number = 0
  ): void {
    // Draw in order: backboard, rim, net
    this.drawGlassBackboard(ctx, boardX, boardTop, boardWidth, boardHeight, scaleX, scaleY);
    this.drawMetallicRim(ctx, hoopX, hoopY, hoopRadius, scaleX);
    this.drawClothNet(ctx, hoopX, hoopY, hoopRadius, rimBottom, scaleX, scaleY, netSwing);
  }
}

export default EnhancedBasketballVisuals;
