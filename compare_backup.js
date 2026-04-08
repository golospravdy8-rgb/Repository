const fs = require('fs');

const backupData = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf-8'));
const structure = backupData.structure || {};

// Критические Dashboard файлы
const dashboardFiles = [
  'app\\admin\\dashboard\\page.tsx',
  'app\\admin\\dashboard\\AgeGroupTabs.tsx',
  'app\\admin\\dashboard\\error.tsx',
  'app\\admin\\page.tsx',
  'app\\admin\\layout.tsx',
  'app\\admin\\AdminLogoutButton.tsx',
  'app\\admin\\error.tsx',
  'app\\admin\\login\\page.tsx',
  'app\\admin\\games\\[id]\\page.tsx',
  'app\\admin\\games\\[id]\\error.tsx',
  'app\\api\\admin\\me\\route.ts',
  'app\\api\\admin\\login\\route.ts',
  'app\\api\\admin\\logout\\route.ts',
  'app\\api\\admin\\check\\route.ts',
  'lib\\auth.ts',
  'lib\\require-auth.ts',
  'lib\\auth-secret.ts',
  'actions\\admin-data.ts',
];

console.log(`Total files to restore from backup: ${dashboardFiles.length}\n`);

let found = 0;
let missing = 0;

for (const file of dashboardFiles) {
  if (structure[file]) {
    found++;
    console.log(`✓ ${file}`);
  } else {
    missing++;
    console.log(`✗ MISSING: ${file}`);
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`Found in backup: ${found}`);
console.log(`Missing in backup: ${missing}`);
console.log(`${'='.repeat(80)}`);

// Вывести размеры файлов
console.log('\nFile sizes in backup:');
for (const file of dashboardFiles) {
  if (structure[file]) {
    const size = structure[file].length;
    console.log(`  ${file.padEnd(50)} ${size} bytes`);
  }
}
