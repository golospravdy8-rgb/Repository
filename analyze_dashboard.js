const fs = require('fs');

const backupData = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf-8'));
const structure = backupData.structure || {};

// Список КРИТИЧЕСКИХ файлов для Dashboard
const criticalFiles = [
  'app\\admin\\dashboard\\page.tsx',
  'app\\admin\\dashboard\\AgeGroupTabs.tsx',
  'app\\admin\\dashboard\\error.tsx',
  'app\\admin\\page.tsx',
  'app\\admin\\layout.tsx',
  'app\\admin\\login\\page.tsx',
  'app\\admin\\games\\[id]\\page.tsx',
  'app\\admin\\games\\[id]\\error.tsx',
  'app\\admin\\error.tsx',
  'app\\admin\\AdminLogoutButton.tsx',
  'app\\api\\admin\\me\\route.ts',
  'app\\api\\admin\\login\\route.ts',
  'app\\api\\admin\\logout\\route.ts',
  'app\\api\\admin\\check\\route.ts',
  'lib\\auth.ts',
  'lib\\require-auth.ts',
  'lib\\auth-secret.ts',
  'actions\\admin-data.ts',
  'components\\public\\AdminButton.tsx',
  'components\\public\\StandingsTable.tsx',
  'app\\(public)\\standings\\page.tsx',
  'app\\(public)\\standings\\error.tsx',
  'app\\(public)\\vip\\page.tsx',
  'app\\(public)\\vip\\error.tsx',
];

console.log('📋 КРИТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ВОССТАНОВЛЕНИЯ DASHBOARD:\n');

let found = 0;
let totalSize = 0;

criticalFiles.forEach((f, idx) => {
  if (structure[f]) {
    const size = structure[f].length;
    totalSize += size;
    found++;
    console.log(`${String(idx + 1).padStart(2)}. ✓ ${f}`);
  } else {
    console.log(`${String(idx + 1).padStart(2)}. ✗ MISSING: ${f}`);
  }
});

console.log(`\n${'='.repeat(100)}`);
console.log(`📊 Статистика:`);
console.log(`   Найдено: ${found}/${criticalFiles.length} файлов`);
console.log(`   Размер: ${(totalSize / 1024).toFixed(2)} KB`);
console.log(`${'='.repeat(100)}`);

// Выведем первую часть одного из главных файлов
console.log('\n\n📄 ПРЕВЬЮ ГЛАВНОГО ФАЙЛА (app\\admin\\dashboard\\page.tsx):\n');
const dashboardPage = structure['app\\admin\\dashboard\\page.tsx'];
if (dashboardPage) {
  const lines = dashboardPage.split('\n');
  console.log(lines.slice(0, 30).join('\n'));
  console.log('\n... [truncated]\n');
}
