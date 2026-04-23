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

export function createMeterElement(
  greenLinePosition: number,
  parentElement?: HTMLElement
): HTMLDivElement {
  const meter = document.createElement('div');
  meter.className = 'power-meter-container';
  Object.assign(meter.style, METER_STYLES.container);

  meter.style.right = '50px';
  meter.style.top = '50%';
  meter.style.transform = 'translateY(-50%)';

  const greenLine = document.createElement('div');
  greenLine.className = 'power-meter-green-line';
  Object.assign(greenLine.style, METER_STYLES.greenLine);

  const greenLineFromBottom = 200 - greenLinePosition;
  greenLine.style.bottom = `${greenLineFromBottom}px`;

  const label = document.createElement('div');
  label.className = 'power-meter-label';
  Object.assign(label.style, METER_STYLES.label);
  label.textContent = '⚡ СИЛА';

  meter.appendChild(greenLine);
  meter.appendChild(label);

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

  const target = parentElement || document.body;
  target.appendChild(meter);

  console.log(`[PowerMeterUI] Meter created with green line at ${greenLinePosition.toFixed(0)}px`);

  return meter;
}


export function hideMeter(meterElement: HTMLDivElement | null): void {
  if (meterElement && meterElement.parentElement) {
    meterElement.style.opacity = '0';
    meterElement.style.pointerEvents = 'none';

    setTimeout(() => {
      if (meterElement.parentElement) {
        meterElement.parentElement.removeChild(meterElement);
      }
    }, 300);
  }
}

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
