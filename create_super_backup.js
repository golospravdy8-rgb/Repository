#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

const GITHUB_TOKEN = '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';
const REPO = 'golospravdy8-rgb/Repository';
const BRANCH = 'main';

// Helper to make HTTPS requests
function makeRequest(url, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'User-Agent': 'Node.js-Backup-Script',
      'Authorization': `token ${GITHUB_TOKEN}`,
      ...headers
    };

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: defaultHeaders
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Fetch GitHub file tree
async function fetchFileTree() {
  console.log('📥 Fetching GitHub file tree...');
  const url = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;
  const { data } = await makeRequest(url);
  return data.tree || [];
}

// Fetch file content from GitHub
async function fetchFileContent(path) {
  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`;
  try {
    const { data } = await makeRequest(url);
    if (data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch (e) {
    console.warn(`⚠️  Failed to fetch ${path}:`, e.message);
    return null;
  }
}

// Get Git commit info
async function getLastCommit() {
  const url = `https://api.github.com/repos/${REPO}/commits/${BRANCH}`;
  try {
    const { data } = await makeRequest(url);
    return {
      sha: data.sha,
      message: data.commit.message,
      author: data.commit.author.name,
      date: data.commit.author.date
    };
  } catch (e) {
    return { sha: 'unknown', message: '', author: '', date: '' };
  }
}

// Filter and categorize files
function categorizeFiles(tree) {
  const categories = {
    code: [],
    media: [],
    config: [],
    other: []
  };

  const codeExt = ['.ts', '.tsx', '.js', '.jsx', '.css', '.prisma'];
  const configFiles = ['package.json', 'tsconfig.json', 'next.config.js', 'tailwind.config.ts', 'middleware.ts', '.gitignore', '.env.example'];
  const mediaExt = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];

  tree.forEach(item => {
    if (item.type === 'blob') {
      const ext = path.extname(item.path).toLowerCase();

      if (configFiles.some(cf => item.path.endsWith(cf))) {
        categories.config.push(item);
      } else if (codeExt.includes(ext)) {
        categories.code.push(item);
      } else if (mediaExt.includes(ext) || item.path.startsWith('public/')) {
        categories.media.push(item);
      } else {
        categories.other.push(item);
      }
    }
  });

  return categories;
}

// Export database data using Prisma
async function exportDatabaseData() {
  console.log('📊 Exporting database data via Prisma...');
  try {
    const dataScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function exportData() {
  const teams = await prisma.team.findMany({ include: { players: true, games: true } });
  const players = await prisma.player.findMany();
  const games = await prisma.game.findMany();
  const standings = await prisma.standing.findMany();
  const news = await prisma.news.findMany();
  const shopProducts = await prisma.shopProduct.findMany();
  const siteSettings = await prisma.siteSettings.findMany();

  console.log(JSON.stringify({
    teams,
    players,
    games,
    standings,
    news,
    shopProducts,
    siteSettings
  }, null, 2));

  await prisma.$disconnect();
}

exportData().catch(e => {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
});
`;

    fs.writeFileSync('/tmp/export_db.js', dataScript);
    const { stdout } = await execPromise('cd /d/n8n/basket-lviv && node /tmp/export_db.js 2>/dev/null || echo "{}"');
    fs.unlinkSync('/tmp/export_db.js');
    return JSON.parse(stdout || '{}');
  } catch (e) {
    console.warn('⚠️  Could not export database data:', e.message);
    return {};
  }
}

// Read environment secrets
function readSecrets() {
  console.log('🔐 Reading environment secrets...');
  const envPath = '/d/n8n/basket-lviv/.env.local';
  let envContent = '';

  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch (e) {
    console.warn('⚠️  .env.local not found, trying .env');
    try {
      envContent = fs.readFileSync('/d/n8n/basket-lviv/.env', 'utf-8');
    } catch (e2) {
      console.warn('⚠️  .env not found either');
    }
  }

  const secrets = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=');
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key.trim()) {
        secrets[key.trim()] = value;
      }
    }
  });

  return secrets;
}

// Main function
async function createBackup() {
  try {
    console.log('🚀 Starting SUPER_FULL_BACKUP.json creation...\n');

    // Step 1: Fetch GitHub tree
    const tree = await fetchFileTree();
    console.log(`✅ Fetched ${tree.length} files from GitHub`);

    // Step 2: Categorize files
    const { code, media, config, other } = categorizeFiles(tree);
    console.log(`   - Code files: ${code.length}`);
    console.log(`   - Media files: ${media.length}`);
    console.log(`   - Config files: ${config.length}`);
    console.log(`   - Other files: ${other.length}\n`);

    // Step 3: Fetch file contents
    console.log('📄 Fetching file contents...');
    const structure = {};
    let fetchedCount = 0;

    for (const file of [...code, ...config, ...other]) {
      const content = await fetchFileContent(file.path);
      if (content) {
        structure[file.path] = content;
        fetchedCount++;
        if (fetchedCount % 10 === 0) process.stdout.write('.');
      }
    }
    console.log(`\n✅ Fetched ${fetchedCount} file contents\n`);

    // Step 4: Build media registry
    console.log('🎬 Building media registry...');
    const mediaRegistry = {
      total_files: media.length,
      files: media.map(m => ({
        local_path: m.path,
        github_raw_url: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${m.path}`,
        sha: m.sha,
        size_bytes: m.size,
        category: m.path.split('/')[1] || 'root'
      }))
    };
    console.log(`✅ Media registry: ${mediaRegistry.total_files} files\n`);

    // Step 5: Export database
    const dbData = await exportDatabaseData();
    console.log('✅ Database exported\n');

    // Step 6: Get commit info
    console.log('📝 Fetching last commit info...');
    const commitInfo = await getLastCommit();
    console.log(`✅ Commit: ${commitInfo.sha.substring(0, 7)}\n`);

    // Step 7: Read secrets
    const secrets = readSecrets();
    console.log(`✅ Read ${Object.keys(secrets).length} environment variables\n`);

    // Step 8: Assemble backup
    console.log('🔧 Assembling backup structure...');
    const backup = {
      meta: {
        project: 'basket-lviv',
        description: 'Super Full Backup v2 — structure + data + media + secrets',
        github_repo: `https://github.com/${REPO}`,
        github_branch: BRANCH,
        github_last_commit: commitInfo.sha,
        github_commit_message: commitInfo.message,
        github_commit_author: commitInfo.author,
        github_commit_date: commitInfo.date,
        created_at: new Date().toISOString(),
        node_version: process.version,
        created_by: 'create_super_backup.js v2'
      },

      github_file_tree: tree.map(f => ({
        path: f.path,
        sha: f.sha,
        size: f.size,
        type: f.type,
        raw_url: f.type === 'blob' ? `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${f.path}` : null
      })),

      structure,

      data: dbData,

      media_registry: mediaRegistry,

      secrets
    };

    // Step 9: Write backup file
    console.log('💾 Writing SUPER_FULL_BACKUP.json...');
    const backupPath = '/d/n8n/basket-lviv/SUPER_FULL_BACKUP.json';
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Written ${sizeMB} MB\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUPER_FULL_BACKUP.json created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Backup statistics:`);
    console.log(`   - File size: ${sizeMB} MB`);
    console.log(`   - Code files: ${Object.keys(structure).length}`);
    console.log(`   - Media files: ${mediaRegistry.total_files}`);
    console.log(`   - GitHub tree items: ${tree.length}`);
    console.log(`   - Secrets: ${Object.keys(secrets).length}`);
    console.log(`   - Teams: ${(dbData.teams || []).length}`);
    console.log(`   - Players: ${(dbData.players || []).length}`);
    console.log(`   - Games: ${(dbData.games || []).length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createBackup();
