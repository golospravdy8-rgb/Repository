#!/usr/bin/env node
/**
 * 🚀 FULL SITE RESTORATION SCRIPT
 * basket-lviv: Restores 328 files from SUPER_FULL_BACKUP.json
 *
 * Usage: node restore_full_site.js
 *
 * What it does:
 * 1. Reads SUPER_FULL_BACKUP.json
 * 2. Extracts all 328 files
 * 3. Fixes image paths (old → new structure)
 * 4. Creates files in correct directories
 * 5. Reports progress
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  🚀 FULL SITE RESTORATION FROM SUPER_FULL_BACKUP.json ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// ============================================================================
// STEP 1: Create New Public Directory Structure
// ============================================================================

console.log('📁 STEP 1: Creating organized public directory structure...\n');

const dirs = [
  'public/shop/balls',
  'public/shop/uniforms',
  'public/logos/teams',
  'public/logos/players',
  'public/images',
  'public/data',
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ✓ Created: ${dir}`);
  }
});

// ============================================================================
// STEP 2: Read Backup
// ============================================================================

console.log('\n📖 STEP 2: Reading SUPER_FULL_BACKUP.json...\n');

let backupData;
try {
  backupData = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf-8'));
} catch (err) {
  console.error('❌ ERROR: Cannot read SUPER_FULL_BACKUP.json');
  console.error(`   ${err.message}`);
  process.exit(1);
}

const structure = backupData.structure || {};
const totalFiles = Object.keys(structure).length;

console.log(`  ✓ Backup loaded`);
console.log(`  ✓ Total files in structure: ${totalFiles}`);

// ============================================================================
// STEP 3: Extract and Restore Files
// ============================================================================

console.log('\n💾 STEP 3: Extracting and restoring files...\n');

let restored = 0;
let fixed = 0;
let errors = 0;
const errorLog = [];

// Image path replacements
const pathMappings = [
  { from: /\/balls\//g, to: '/shop/balls/' },
  { from: /\/uniforms\//g, to: '/shop/uniforms/' },
  { from: /\/logos\//g, to: '/logos/teams/' },
  { from: /\/hero_banner\//g, to: '/images/' },
  { from: /\/team-logos\//g, to: '/logos/teams/' },
  { from: /\/players\//g, to: '/logos/players/' },
];

for (const [backupPath, content] of Object.entries(structure)) {
  try {
    // Convert backslashes to forward slashes
    const fsPath = backupPath.replace(/\\/g, '/');

    // Skip if it's a json file in public/data (already exists)
    if (fsPath.includes('public/data/') && fsPath.endsWith('.json')) {
      continue;
    }

    // Fix image paths in content
    let fixedContent = content;
    let hasChanges = false;

    // Only fix if it's a .tsx, .ts, or .js file
    if (fsPath.match(/\.(tsx?|js)$/i)) {
      for (const mapping of pathMappings) {
        if (mapping.from.test(fixedContent)) {
          fixedContent = fixedContent.replace(mapping.from, mapping.to);
          hasChanges = true;
        }
      }
    }

    // Create directories
    const dir = path.dirname(fsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(fsPath, fixedContent, 'utf-8');

    restored++;
    if (hasChanges) fixed++;

    // Log every 50 files
    if (restored % 50 === 0) {
      console.log(`  ✓ Progress: ${restored}/${totalFiles} files restored`);
    }
  } catch (err) {
    errors++;
    errorLog.push(`${backupPath}: ${err.message}`);
  }
}

// ============================================================================
// STEP 4: Report Results
// ============================================================================

console.log(`\n${'='.repeat(60)}`);
console.log('📊 RESTORATION COMPLETE\n');
console.log(`  ✓ Files restored: ${restored}`);
console.log(`  ✓ Path fixes applied: ${fixed}`);
console.log(`  ⚠️  Errors: ${errors}`);

if (errors > 0) {
  console.log('\n❌ Error Details:');
  errorLog.slice(0, 10).forEach(err => console.log(`   ${err}`));
  if (errorLog.length > 10) {
    console.log(`   ... and ${errorLog.length - 10} more`);
  }
}

// ============================================================================
// STEP 5: Verify Critical Files
// ============================================================================

console.log('\n🔍 STEP 4: Verifying critical files exist...\n');

const criticalFiles = [
  'app/(public)/page.tsx',
  'app/(public)/teams/page.tsx',
  'app/(public)/players/page.tsx',
  'app/(public)/shop/page.tsx',
  'app/(public)/standings/page.tsx',
  'app/admin/dashboard/page.tsx',
  'components/public/HeroButtons.tsx',
  'components/public/ShopClient.tsx',
  'components/public/StandingsTable.tsx',
  'lib/prisma.ts',
];

let criticalOK = 0;
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${file}`);
    criticalOK++;
  } else {
    console.log(`  ❌ MISSING: ${file}`);
  }
});

// ============================================================================
// STEP 6: Summary
// ============================================================================

console.log(`\n${'='.repeat(60)}`);
console.log('\n✨ RESTORATION SUMMARY\n');
console.log(`  Status: ${restored > 300 ? '✅ SUCCESS' : '⚠️  WARNING'}`);
console.log(`  Files: ${restored}/${totalFiles}`);
console.log(`  Critical files: ${criticalOK}/${criticalFiles.length}`);
console.log(`  Errors: ${errors}`);

if (restored > 300 && errors === 0) {
  console.log('\n🎉 READY FOR NEXT STEP!\n');
  console.log('Execute these commands:\n');
  console.log('  1. npm run build           # Verify build succeeds');
  console.log('  2. npm run dev             # Test locally');
  console.log('  3. git add .');
  console.log('  4. git commit -m "feat: Full site restoration - 328 files from SUPER_FULL_BACKUP"');
  console.log('  5. git push origin main');
  console.log('\nVercel will auto-deploy! Monitor at https://vercel.com/dashboard\n');
} else {
  console.log('\n⚠️  Please check errors above before proceeding.\n');
}

console.log(`${'-'.repeat(60)}\n`);
process.exit(errors > 0 ? 1 : 0);
