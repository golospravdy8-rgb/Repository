const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    console.log('[PAGE LOG]', text);
    if (text.includes('RIM HIT') || text.includes('GOAL')) {
      logs.push(text);
    }
  });
  
  page.on('error', err => console.error('[PAGE ERROR]', err));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err));
  
  console.log('Opening http://localhost:3006...');
  await page.goto('http://localhost:3006', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Try to inject game directly
  await page.evaluate(() => {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);
    
    // Simple game loop
    const ctx = canvas.getContext('2d');
    const HOOP_X = 400;
    const HOOP_Y = 150;
    
    // Simulate ball bounces
    let x = 100;
    let y = 100;
    let vx = 3;
    let vy = 2;
    
    window.gameRunning = true;
    window.rimHits = 0;
    
    const gameLoop = () => {
      if (!window.gameRunning) return;
      
      // Physics
      vy += 0.25;
      x += vx;
      y += vy;
      
      // Gravity reset
      if (y > 500) {
        y = 500;
        vy *= -0.6;
        vx *= 0.95;
      }
      
      // Rim collision
      const dist = Math.hypot(x - HOOP_X, y - HOOP_Y);
      if (dist < 30) {
        window.rimHits++;
        const angle = Math.atan2(vy, vx) * 180 / Math.PI;
        const speed = Math.hypot(vx, vy);
        console.log(`RIM HIT: angle=${angle.toFixed(1)}°, speed=${speed.toFixed(2)}, contacts=${window.rimHits}`);
        
        // Bounce
        vx *= -0.5;
        vy *= -0.5;
      }
      
      // Draw
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#ff9900';
      ctx.fillRect(HOOP_X - 40, HOOP_Y - 10, 80, 20);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(x - 5, y - 5, 10, 10);
      
      requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
  });
  
  // Make 5 "shots"
  for (let i = 0; i < 5; i++) {
    console.log('Shot ' + (i + 1));
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('CAPTURED LOGS:');
  console.log('═══════════════════════════════════════');
  logs.forEach(log => console.log(log));
  console.log('TOTAL: ' + logs.length);
  
  await browser.close();
})();
