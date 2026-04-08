const fs = require('fs');

const data = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf-8'));
const structure = data.structure || {};

// Критические файлы для анализа Dashboard
const files = [
  'app\\admin\\dashboard\\page.tsx',
  'app\\admin\\page.tsx',
  'app\\admin\\layout.tsx',
  'lib\\auth.ts',
  'lib\\require-auth.ts',
  'app\\api\\admin\\me\\route.ts',
  'actions\\admin-data.ts',
  'app\\admin\\login\\page.tsx',
];

for (const file of files) {
  if (structure[file]) {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`FILE: ${file}`);
    console.log(`${'='.repeat(100)}`);
    const content = structure[file];
    console.log(content.substring(0, 2500));
    if (content.length > 2500) {
      console.log(`\n... [укорочено, всего ${content.length} символов] ...\n`);
    }
  } else {
    console.log(`\nNOT FOUND: ${file}`);
  }
}
