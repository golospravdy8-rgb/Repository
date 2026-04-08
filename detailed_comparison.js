const fs = require('fs');
const path = require('path');

const backupData = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf-8'));
const structure = backupData.structure || {};

// Критические файлы для проверки
const files = [
  'app\\admin\\dashboard\\page.tsx',
  'app\\admin\\layout.tsx',
  'app\\admin\\login\\page.tsx',
  'lib\\auth.ts',
  'lib\\require-auth.ts',
  'app\\api\\admin\\me\\route.ts',
  'app\\api\\admin\\login\\route.ts',
];

console.log('Comparing current files with backup...\n');

for (const file of files) {
  // Путь для файловой системы (с прямыми слэшами)
  const fsPath = file.replace(/\\/g, '/');
  const fullPath = path.join('.', fsPath);

  // Попробуем найти реальный путь (может быть в Windows без backslashes)
  let currentContent = '';
  let fileExists = false;

  // Проверим несколько вариантов пути
  const pathVariants = [
    fullPath,
    fullPath.replace(/\\/g, '\\'),
    './' + fsPath,
  ];

  for (const variant of pathVariants) {
    try {
      currentContent = fs.readFileSync(variant, 'utf-8');
      fileExists = true;
      break;
    } catch (e) {
      // continue
    }
  }

  const backupContent = structure[file] || '';

  console.log(`${'='.repeat(100)}`);
  console.log(`FILE: ${file}`);
  console.log(`Exists: ${fileExists ? '✓ YES' : '✗ NO'}`);

  if (fileExists && backupContent) {
    if (currentContent === backupContent) {
      console.log('Content: ✓ IDENTICAL TO BACKUP');
    } else {
      // Find first difference
      const lines1 = currentContent.split('\n');
      const lines2 = backupContent.split('\n');

      let diffLine = -1;
      for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
        if (lines1[i] !== lines2[i]) {
          diffLine = i;
          break;
        }
      }

      console.log(`Content: ✗ DIFFERENT (first diff at line ${diffLine + 1})`);
      console.log(`Current lines: ${lines1.length}, Backup lines: ${lines2.length}`);

      if (diffLine >= 0) {
        console.log(`\nFirst difference:`);
        console.log(`  Current (line ${diffLine + 1}): ${lines1[diffLine]?.substring(0, 80)}`);
        console.log(`  Backup  (line ${diffLine + 1}): ${lines2[diffLine]?.substring(0, 80)}`);
      }
    }
  } else if (!fileExists && !backupContent) {
    console.log('Status: File missing in both current and backup');
  } else if (fileExists && !backupContent) {
    console.log('Status: File exists locally but NOT in backup');
  } else {
    console.log('Status: File in backup but NOT found locally');
  }

  console.log(`Current size: ${currentContent.length} bytes, Backup size: ${backupContent.length} bytes`);
}
