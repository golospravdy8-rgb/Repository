#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

// === RECURSIVE FILE READER ===
function walkDir(dir, filter) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(PROJECT_ROOT, fullPath);

    // Skip node_modules, .next, .git, etc.
    if (relPath.includes('node_modules') || relPath.includes('.next') || relPath.includes('.git') || relPath.includes('.vercel')) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath, filter));
    } else if (filter(entry.name)) {
      files.push(relPath);
    }
  }

  return files;
}

function readFileContent(filePath) {
  try {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    if (!fs.existsSync(fullPath)) return null;
    const content = fs.readFileSync(fullPath, 'utf-8');
    return content;
  } catch (error) {
    return null;
  }
}

function buildFileStructure() {
  const structure = {};
  const extensions = ['.tsx', '.ts', '.json', '.css', '.prisma', '.js', '.mjs', '.md'];

  const files = walkDir(PROJECT_ROOT, (name) => {
    return extensions.some(ext => name.endsWith(ext));
  });

  console.log(`Found ${files.length} files to backup...`);

  for (const file of files) {
    const content = readFileContent(file);
    if (content && content.length < 500000) { // Skip huge files
      structure[file] = content;
    }
  }

  return structure;
}

function getEnvContent() {
  const envLocal = readFileContent('.env.local');
  const env = readFileContent('.env');
  return {
    '.env.local': envLocal || null,
    '.env': env || null
  };
}

function buildSeeds() {
  const seedContent = readFileContent('prisma/seed.ts');
  return {
    'prisma/seed.ts': seedContent || null
  };
}

// === MAIN ===
function createSuperBackup() {
  console.log('🔄 Building SUPER_FULL_BACKUP.json...');

  console.log('📦 Collecting all source code...');
  const structure = buildFileStructure();
  console.log(`✓ Structure: ${Object.keys(structure).length} files collected`);

  console.log('🌱 Collecting seeds...');
  const seeds = buildSeeds();

  console.log('🔐 Collecting environment...');
  const envContent = getEnvContent();

  const backup = {
    meta: {
      project: 'basket-lviv',
      created_at: new Date().toISOString(),
      created_by: 'create_super_backup.js',
      description: 'Super Full Backup — complete structure (code), data (seeds), and secrets (env) in one file',
      version: '1.0',
      type: 'complete_project_backup',
      includes: ['all_source_code', 'database_schema', 'environment_secrets', 'seeds', 'configs']
    },
    structure,
    data: {
      ...seeds,
      'prisma_schema': structure['prisma/schema.prisma'] || null,
      'description': 'Seed files and database configuration'
    },
    secrets: {
      ...envContent,
      'note': 'Real secrets are included for backup/restoration purposes',
      'sources': ['.env.local', '.env']
    }
  };

  const backupPath = path.join(PROJECT_ROOT, 'SUPER_FULL_BACKUP.json');
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');

  const fileSize = fs.statSync(backupPath).size;
  console.log(`\n✅ SUPER_FULL_BACKUP.json created`);
  console.log(`📏 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📁 Total files in backup: ${Object.keys(backup.structure).length}`);
  console.log(`🔐 Includes real secrets: ${backup.secrets['.env.local'] ? 'YES' : 'NO'}`);

  return true;
}

// === RUN ===
try {
  createSuperBackup();
  console.log('\n✅ Backup creation completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
