// Power Meter UI - Visual representation of power meter with adaptive green line

export const METER_STYLES = {
  container: {
    position: 'fixed' as const,
    width: '40px',
    height: '200px',
    background: 'rgba(51, 51, 51, 0.7)',
    border: '2px solid #666',
    borderRadius: '4px',
    zIndex: 1000,
    boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
  },
  greenLine: {
    position: 'absolute' as const,
    width: '100%',
    height: '4px',
    background: '#00FF00',
    boxShadow: '0 0 10px #00FF00, inset 0 0 10px rgba(0, 255, 0, 0.5)',
    animation: 'greenLinePulse 0.8s infinite',
  },
  meterFill: {
    position: 'absolute' as const,
    width: '100%',
    bottom: '0',
    background: 'linear-gradient(to top, #FF8C00, #FFFF00)',
    opacity: '0.9',
    transition: 'height 0.05s ease-out',
  },
  label: {
    position: 'absolute' as const,
    top: '-25px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#fff',
    whiteSpace: 'nowrap' as const,
    textShadow: '0 0 4px rgba(0, 0, 0, 0.8)',
  },
};

/**
 * Create meter element with green line at specified position
 */
export function createMeterElement(
  greenLinePosition: number,
  parentElement?: HTMLElement
): HTMLDivElement {
  // Create container
  const meter = document.createElement('div');
  meter.className = 'power-meter-container';
  Object.assign(meter.style, METER_STYLES.container);

  // Position meter on the right side of screen (will be adjusted by game)
  meter.style.right = '50px';
  meter.style.top = '50%';
  meter.style.transform = 'translateY(-50%)';

  // Create green line (target zone)
  const greenLine = document.createElement('div');
  greenLine.className = 'power-meter-green-line';
  Object.assign(greenLine.style, METER_STYLES.greenLine);

  // Position green line from bottom (inverted because CSS bottom: 0 is bottom of meter)
  const greenLineFromBottom = 200 - greenLinePosition;
  greenLine.style.bottom = `${greenLineFromBottom}px`;

  // Create meter fill (the moving part)
  const meterFill = document.createElement('div');
  meterFill.className = 'power-meter-fill';
  Object.assign(meterFill.style, METER_STYLES.meterFill);
  meterFill.style.height = '0px';

  // Create label
  const label = document.createElement('div');
  label.className = 'power-meter-label';
  Object.assign(label.style, METER_STYLES.label);
  label.textContent = '⚡ СИЛА';

  // Assemble
  meter.appendChild(greenLine);
  meter.appendChild(meterFill);
  meter.appendChild(label);

  // Inject CSS for animations if not already present
  if (!document.getElementById('power-meter-styles')) {
    const style = document.createElement('style');
    style.id = 'power-meter-styles';
    style.textContent = `
      @keyframes greenLinePulse {
        0%, 100% { opacity: 0.8; box-shadow: 0 0 10px #00FF00, inset 0 0 10px rgba(0, 255, 0, 0.5); }
        50% { opacity: 1.0; box-shadow: 0 0 15px #00FF00, inset 0 0 15px rgba(0, 255, 0, 0.8); }
      }
    `;
    document.head.appendChild(style);
  }

  // Append to DOM
  const target = parentElement || document.body;
  target.appendChild(meter);

  console.log(`[PowerMeterUI] Meter created with green line at ${greenLinePosition}px`);

  return meter;
}

/**
 * Update meter display with current height
 */
export function updateMeterDisplay(meterElement: HTMLDivElement, currentHeight: number): void {
  if (!meterElement) return;

  const meterFill = meterElement.querySelector('.power-meter-fill') as HTMLDivElement;
  if (meterFill) {
    // Clamp height between 0 and 200
    const clampedHeight = Math.max(0, Math.min(200, currentHeight));
    meterFill.style.height = `${clampedHeight}px`;
  }
}

/**
 * Update green line position (for dynamic repositioning)
 */
export function updateGreenLinePosition(meterElement: HTMLDivElement, greenLinePosition: number): void {
  if (!meterElement) return;

  const greenLine = meterElement.querySelector('.power-meter-green-line') as HTMLDivElement;
  if (greenLine) {
    const greenLineFromBottom = 200 - greenLinePosition;
    greenLine.style.bottom = `${greenLineFromBottom}px`;
  }
}

/**
 * Hide meter element
 */
export function hideMeter(meterElement: HTMLDivElement | null): void {
  if (meterElement && meterElement.parentElement) {
    meterElement.style.opacity = '0';
    meterElement.style.pointerEvents = 'none';

    // Remove after animation
    setTimeout(() => {
      if (meterElement.parentElement) {
        meterElement.parentElement.removeChild(meterElement);
      }
    }, 300);
  }
}

/**
 * Show accuracy feedback
 */
export function showAccuracyFeedback(accuracy: number, x: number, y: number): void {
  const feedback = document.createElement('div');
  feedback.style.position = 'fixed';
  feedback.style.left = `${x}px`;
  feedback.style.top = `${y}px`;
  feedback.style.fontSize = '18px';
  feedback.style.fontWeight = 'bold';
  feedback.style.color = accuracy === 100 ? '#00FF00' : accuracy >= 85 ? '#FFFF00' : '#FF8800';
  feedback.style.textShadow = '0 0 8px rgba(0, 0, 0, 0.8)';
  feedback.style.pointerEvents = 'none';
  feedback.style.zIndex = '999';
  feedback.style.animation = 'floatUp 1s ease-out forwards';
  feedback.textContent = `${accuracy}%`;

  // Inject animation
  if (!document.getElementById('accuracy-feedback-styles')) {
    const style = document.createElement('style');
    style.id = 'accuracy-feedback-styles';
    style.textContent = `
      @keyframes floatUp {
        0% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-40px); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(feedback);

  setTimeout(() => {
    if (feedback.parentElement) {
      feedback.parentElement.removeChild(feedback);
    }
  }, 1000);
}

/**
 * Helper: Format distance for display
 */
export function formatDistance(pixels: number): string {
  return `${pixels.toFixed(0)}px`;
}

/**
 * Helper: Get accuracy emoji
 */
export function getAccuracyEmoji(accuracy: number): string {
  if (accuracy === 100) return '✅';
  if (accuracy >= 85) return '⚡';
  if (accuracy >= 70) return '👍';
  return '❌';
}
