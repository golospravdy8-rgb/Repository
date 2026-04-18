const fs = require("fs");
const path = require("path");

const ballsDir = path.join(__dirname, "..", "public", "images", "balls");

const balls = [
  "meteor-cellular.jpg",
  "nike-playground-8p-graphic.jpg",
  "nike-playground-8p.jpg",
  "nike-jordan-bb-ultimate-8p.jpg",
  "nike-jordan-legacy-2.0.jpg",
  "nike-playground-next-nature.jpg",
  "wilson-fiba-3x3-mini.jpg",
  "wilson-nba-drv-pro.jpg",
  "wilson-ncaa-elevate-vtx.jpg",
  "wilson-ncaa-elevate-bskt.jpg",
  "wilson-reaction-pro-295.jpg",
];

// SVG placeholder 400x400px
const svgTemplate = (name) => `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e3a8a;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#grad)"/>
  <circle cx="200" cy="200" r="80" fill="#fbbf24" opacity="0.8"/>
  <circle cx="200" cy="200" r="75" fill="none" stroke="#f97316" stroke-width="2"/>
  <text x="200" y="350" font-family="Arial" font-size="16" fill="white" text-anchor="middle">${name}</text>
  <text x="200" y="380" font-family="Arial" font-size="12" fill="#cbd5e1" text-anchor="middle">Placeholder</text>
</svg>`;

balls.forEach((ballName) => {
  const filepath = path.join(ballsDir, ballName);
  if (!fs.existsSync(filepath)) {
    const cleanName = ballName.replace(/[.-]/g, " ").replace(".jpg", "");
    fs.writeFileSync(filepath, svgTemplate(cleanName), "utf8");
    console.log(`✅ Создан placeholder: ${ballName}`);
  } else {
    console.log(`⏭️  Уже существует: ${ballName}`);
  }
});

console.log("\n✨ Placeholders готовы! Замените на реальные изображения позже.");
