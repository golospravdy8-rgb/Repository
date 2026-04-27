// Power Meter System - Adaptive green line positioning based on shot distance

export interface PowerMeterState {
  isVisible: boolean;
  currentHeight: number; // 0-180px
  animationDirection: 1 | -1;
  animationSpeed: number; // px per ms
  greenLinePosition: number; // Target position for perfect shot
  isAnimating: boolean;
}

export class PowerMeterSystem {
  private maxDistance: number;
  private meterState: PowerMeterState;
  private animationInterval: NodeJS.Timeout | null = null;

  constructor(maxDistance: number) {
    this.maxDistance = maxDistance;
    this.meterState = {
      isVisible: false,
      currentHeight: 0,
      animationDirection: 1,
      animationSpeed: 0.1,
      greenLinePosition: 180,
      isAnimating: false,
    };

    console.log(`[PowerMeterSystem] Initialized with maxDistance: ${maxDistance.toFixed(0)}px`);
  }

  calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  calculateGreenLinePosition(currentDistance: number): number {
    const ratio = Math.min(1, currentDistance / this.maxDistance);
    const greenLine = ratio * 180;
    console.log(
      `[GREEN LINE] currentDistance=${currentDistance.toFixed(0)}px, maxDistance=${this.maxDistance.toFixed(0)}px, ` +
      `ratio=${ratio.toFixed(3)}, greenLinePosition=${greenLine.toFixed(0)}px`
    );
    return greenLine;
  }

  startMeterAnimation(): void {
    if (this.meterState.isAnimating) return;

    this.meterState.isAnimating = true;
    this.meterState.currentHeight = 0;
    this.meterState.animationDirection = 1;

    const startTime = Date.now();
    this.animationInterval = setInterval(() => {
      if (!this.meterState.isAnimating) {
        clearInterval(this.animationInterval!);
        return;
      }

      const elapsed = Date.now() - startTime;
      const cycle = (elapsed % 3600) / 3600;
      const smoothHeight = Math.sin(cycle * Math.PI) * 180;
      this.meterState.currentHeight = Math.max(0, Math.min(180, smoothHeight));
    }, 16);
  }

  stopMeterAnimation(): void {
    this.meterState.isAnimating = false;
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }

  getMeterCurrentHeight(): number {
    return this.meterState.currentHeight;
  }

  setGreenLinePosition(position: number): void {
    this.meterState.greenLinePosition = Math.max(0, Math.min(180, position));
  }

  calculateAccuracy(meterHeight: number, greenLinePosition: number): number {
    const distanceFromGreen = Math.abs(meterHeight - greenLinePosition);

    let accuracy: number;
    if (distanceFromGreen < 5) {
      accuracy = 100;
    } else if (distanceFromGreen < 15) {
      accuracy = 90;
    } else if (distanceFromGreen < 30) {
      accuracy = 70;
    } else {
      accuracy = 40;
    }

    // DIAGNOSTIC: Log accuracy calculation
    console.log(`[ACCURACY] meterHeight=${meterHeight.toFixed(0)}px, greenLine=${greenLinePosition.toFixed(0)}px, ` +
      `distance=${distanceFromGreen.toFixed(0)}px → accuracy=${accuracy}%`);

    return accuracy;
  }

  getMeterState(): PowerMeterState {
    return { ...this.meterState };
  }

  reset(): void {
    this.stopMeterAnimation();
    this.meterState = {
      isVisible: false,
      currentHeight: 0,
      animationDirection: 1,
      animationSpeed: 0.1,
      greenLinePosition: 180,
      isAnimating: false,
    };
  }
}
