const fs = require('fs');
const path = require('path');

// Читаем бэкап
const backupData = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf-8'));
const structure = backupData.structure || {};

// Список файлов Dashboard для восстановления
const filesToRestore = [
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
  'components\\public\\AdminButton.tsx',
];

let restored = 0;
let failed = 0;
let notInBackup = 0;

console.log(`Starting Dashboard restoration from backup...\n`);

for (const backupPath of filesToRestore) {
  const backupContent = structure[backupPath];

  if (!backupContent) {
    console.log(`✗ NOT IN BACKUP: ${backupPath}`);
    notInBackup++;
    continue;
  }

  // Конвертируем путь (Windows backslashes to forward slashes)
  const fsPath = backupPath.replace(/\\/g, '/');
  const fullPath = path.join('.', fsPath);

  // Создаём директории если нужно
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(fullPath, backupContent, 'utf-8');
    console.log(`✓ RESTORED: ${backupPath}`);
    restored++;
  } catch (err) {
    console.log(`✗ FAILED to restore ${backupPath}: ${err.message}`);
    failed++;
  }
}

console.log(`\n${'='.repeat(100)}`);
console.log(`Restored: ${restored}`);
console.log(`Failed: ${failed}`);
console.log(`Not in backup: ${notInBackup}`);
console.log(`${'='.repeat(100)}`);

if (failed === 0) {
  console.log('\n✓ Dashboard restoration COMPLETED successfully!');
  console.log('\nNext steps:');
  console.log('1. npm run build');
  console.log('2. npm run dev:safe');
  console.log('3. Test at http://localhost:3006/admin/login');
  console.log('4. Git commit and push');
  console.log('5. Vercel will auto-deploy');
} else {
  console.log('\n✗ Some files failed to restore. Check errors above.');
}
