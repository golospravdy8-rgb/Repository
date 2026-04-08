const fs = require('fs');

const backupData = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf-8'));
const structure = backupData.structure || {};

// Анализируем структуру
const appFiles = Object.keys(structure).filter(k => k.includes('app\\'));
const componentFiles = Object.keys(structure).filter(k => k.includes('components\\'));
const dataFiles = Object.keys(structure).filter(k => k.includes('data\\'));
const publicFiles = Object.keys(structure).filter(k => k.includes('public\\'));

console.log(`\n╔════════════════════════════════════════════════════════════╗`);
console.log(`║  📊 АНАЛИЗ SUPER_FULL_BACKUP.json                        ║`);
console.log(`╚════════════════════════════════════════════════════════════╝\n`);

console.log(`Всего файлов: ${Object.keys(structure).length}\n`);
console.log(`  • app/:         ${appFiles.length} файлов`);
console.log(`  • components/:  ${componentFiles.length} файлов`);
console.log(`  • data/:        ${dataFiles.length} файлов`);
console.log(`  • public/:      ${publicFiles.length} файлов`);

// Ищем главные страницы
console.log(`\n🏠 ГЛАВНЫЕ СТРАНИЦЫ (page.tsx, layout.tsx):\n`);
const mainPages = appFiles.filter(f => f.includes('page.tsx') || f.includes('layout.tsx'));
mainPages.slice(0, 15).forEach(f => console.log(`  ✓ ${f}`));

// Ищем компоненты контента
console.log(`\n🧩 КОМПОНЕНТЫ КОНТЕНТА:\n`);
const contentComponents = componentFiles.filter(f =>
  f.includes('Hero') || f.includes('Team') || f.includes('Player') ||
  f.includes('Shop') || f.includes('Standings') || f.includes('Uniform') ||
  f.includes('Game') || f.includes('Banner')
);
contentComponents.slice(0, 20).forEach(f => console.log(`  ✓ ${f}`));

// Ищем данные
console.log(`\n📄 ФАЙЛЫ ДАННЫХ (data/):\n`);
dataFiles.forEach(f => console.log(`  ✓ ${f}`));

// Ищем публичные файлы
console.log(`\n📁 ПУБЛИЧНЫЕ ПАПКИ (public/):\n`);
const publicDirs = new Set();
publicFiles.forEach(f => {
  const match = f.match(/public\\([^\\]+)/);
  if (match) publicDirs.add(match[1]);
});
Array.from(publicDirs).sort().forEach(d => console.log(`  • ${d}/`));

// Ищем критические функции
console.log(`\n🎯 KRITICAL PAGES & FEATURES:\n`);
const critical = [
  { name: 'Главная страница', pattern: '(public)' },
  { name: 'Команды', pattern: 'teams' },
  { name: 'Игроки', pattern: 'players' },
  { name: 'Магазин', pattern: 'shop' },
  { name: 'Расписание', pattern: 'schedule' },
  { name: 'Турнирная таблица', pattern: 'standings' },
  { name: 'Форумы/Uniforms', pattern: 'uniform' },
  { name: 'Dashboard', pattern: 'admin' },
];

critical.forEach(item => {
  const matches = appFiles.filter(f => f.toLowerCase().includes(item.pattern.toLowerCase()));
  const status = matches.length > 0 ? '✅' : '❌';
  console.log(`${status} ${item.name.padEnd(25)} (${matches.length} файлов)`);
});

console.log(`\n✨ АНАЛИЗ ЗАВЕРШЕН\n`);
