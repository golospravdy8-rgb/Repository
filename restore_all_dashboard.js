const fs = require('fs');
const path = require('path');

console.log('🚀 RESTORING DASHBOARD FROM SUPER_FULL_BACKUP.json\n');

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

let restored = 0;
let failed = 0;
let notFound = 0;

console.log('📁 Restoring files:\n');

for (const backupPath of criticalFiles) {
  const content = structure[backupPath];

  if (!content) {
    console.log(`   ✗ NOT FOUND: ${backupPath}`);
    notFound++;
    continue;
  }

  // Convert backslash to forward slash for filesystem
  const fsPath = backupPath.replace(/\\/g, '/');
  const fullPath = path.join('.', fsPath);

  // Create directories
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`   ✓ ${backupPath}`);
    restored++;
  } catch (err) {
    console.log(`   ✗ ERROR: ${backupPath} - ${err.message}`);
    failed++;
  }
}

console.log(`\n${'='.repeat(100)}`);
console.log(`✅ RESTORATION COMPLETE`);
console.log(`   Restored: ${restored}`);
console.log(`   Failed: ${failed}`);
console.log(`   Not found: ${notFound}`);
console.log(`   Total: ${restored + failed + notFound}`);
console.log(`${'='.repeat(100)}`);

if (failed === 0 && notFound === 0) {
  console.log('\n✨ All files restored successfully!');
  console.log('\n📋 NEXT STEPS:');
  console.log('   1. npm run build          # Check for build errors');
  console.log('   2. npm run dev            # Test locally');
  console.log('   3. git add .');
  console.log('   4. git commit -m "Restore Dashboard from SUPER_FULL_BACKUP"');
  console.log('   5. git push origin main');
  console.log('   6. Clear cache + Redeploy on Vercel');
} else {
  console.log('\n⚠️  Some files failed. Check errors above.');
  process.exit(1);
}
