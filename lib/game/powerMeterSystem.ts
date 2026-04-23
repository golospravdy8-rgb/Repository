// Power Meter System - Adaptive green line positioning based on shot distance
// greenLinePosition = (currentDistance / maxDistance) * 180px

export interface PowerMeterState {
  isVisible: boolean;
  currentHeight: number; // 0-180px
  animationDirection: 1 | -1;
  animationSpeed: number; // px per ms
  greenLinePosition: number; // Target position for perfect shot
  isAnimating: boolean;
}

export interface DistanceCalculation {
  currentDistance: number;
  maxDistance: number;
  ratio: number; // currentDistance / maxDistance
  greenLinePixels: number; // greenLinePosition in pixels from bottom
}

export interface ShotResult {
  meterHeight: number;
  greenLinePosition: number;
  distanceDifference: number;
  accuracy: number; // 0-100%
  isIdealShot: boolean;
  flightDistance: number;
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
      animationSpeed: 0.1, // px per ms at 60fps
      greenLinePosition: 180,
      isAnimating: false,
    };

    console.log(`[PowerMeterSystem] Initialized with maxDistance: ${maxDistance}px`);
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate dynamic green line position based on current distance
   * Formula: greenLinePosition = (currentDistance / maxDistance) * 180
   * Returns position from BOTTOM of meter (0px = bottom, 180px = top)
   */
  calculateGreenLinePosition(currentDistance: number): number {
    const ratio = Math.min(1, currentDistance / this.maxDistance);
    const greenLine = ratio * 180;
    console.log(
      `[DEBUG PowerMeter] currentDistance=${currentDistance.toFixed(0)}px, maxDistance=${this.maxDistance.toFixed(0)}px, ` +
      `ratio=${ratio.toFixed(3)}, greenLinePosition=${greenLine.toFixed(0)}px`
    );
    return greenLine;
  }

  /**
   * Start meter animation (moving up and down cyclically)
   */
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
      // Smooth animation: oscillate from 0 to 180px
      // Period: ~3.6 seconds for full cycle
      const cycle = (elapsed % 3600) / 3600; // 0-1 over 3.6s
      const smoothHeight = Math.sin(cycle * Math.PI) * 180; // 0→180→0
      this.meterState.currentHeight = Math.max(0, Math.min(180, smoothHeight));
    }, 16); // ~60 FPS
  }

  /**
   * Stop meter animation
   */
  stopMeterAnimation(): void {
    this.meterState.isAnimating = false;
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }

  /**
   * Get current meter height (for UI and calculation)
   */
  getMeterCurrentHeight(): number {
    return this.meterState.currentHeight;
  }

  /**
   * Set green line position (called when shot starts)
   */
  setGreenLinePosition(position: number): void {
    this.meterState.greenLinePosition = Math.max(0, Math.min(180, position));
  }

  /**
   * Calculate accuracy based on distance from green line
   * Perfect shot < 5px = 100% accuracy
   */
  calculateAccuracy(meterHeight: number, greenLinePosition: number): number {
    const distanceFromGreen = Math.abs(meterHeight - greenLinePosition);

    if (distanceFromGreen < 5) {
      return 100; // Perfect shot
    } else if (distanceFromGreen < 15) {
      return 90; // Great shot
    } else if (distanceFromGreen < 30) {
      return 70; // Good shot
    } else {
      return 40; // Poor shot
    }
  }

  /**
   * Calculate additional flight distance based on accuracy
   * 100% accuracy = +30% to distance
   */
  calculateFlightDistance(currentDistance: number, accuracy: number): number {
    const accuracyRatio = accuracy / 100; // 0-1
    const extraPercent = accuracyRatio * 0.3; // 0-30%

    const additionalDistance = currentDistance * extraPercent;
    const totalDistance = currentDistance + additionalDistance;

    console.log(
      `[PowerMeter] Accuracy: ${accuracy}%, Extra: ${(extraPercent * 100).toFixed(0)}%, ` +
        `Total distance: ${totalDistance.toFixed(0)}px`
    );

    return totalDistance;
  }

  /**
   * Get complete shot result
   */
  getShotResult(meterHeight: number, greenLinePosition: number, currentDistance: number): ShotResult {
    const distanceDifference = Math.abs(meterHeight - greenLinePosition);
    const accuracy = this.calculateAccuracy(meterHeight, greenLinePosition);
    const flightDistance = this.calculateFlightDistance(currentDistance, accuracy);
    const isIdealShot = distanceDifference < 5;

    return {
      meterHeight,
      greenLinePosition,
      distanceDifference,
      accuracy,
      isIdealShot,
      flightDistance,
    };
  }

  /**
   * Get current meter state
   */
  getMeterState(): PowerMeterState {
    return { ...this.meterState };
  }

  /**
   * Reset meter state
   */
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
