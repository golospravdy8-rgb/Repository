#!/usr/bin/env node

/**
 * Vercel Deployment Configuration Script
 *
 * Automatically configures environment variables in Vercel
 * and prepares the project for production deployment
 *
 * Requirements:
 * - Vercel CLI installed (npm install -g vercel)
 * - Authenticated with Vercel (vercel login)
 * - Project linked to Vercel
 *
 * Usage:
 *   node deploy-to-vercel.js --add-vars
 *   node deploy-to-vercel.js --verify
 *   node deploy-to-vercel.js --deploy
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

// Environment variables to configure
const ENV_VARS = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: 'https://dzsvgyetmdgykmujmxuu.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_086iusJsMoX5QOr6FxqKFA_WBM1LMdB',

  // Auth (from existing .env.local)
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'ldbl-dev-secret-32-chars-ok-2025!',
  NEXTAUTH_URL: 'https://basketball.lviv.ua',
  AUTH_SECRET: process.env.AUTH_SECRET || 'ldbl-dev-secret-32-chars-ok-2025!',

  // Database (Neon)
  DATABASE_URL: process.env.DATABASE_URL || '',
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED || '',
  PRISMA_DATABASE_URL: process.env.PRISMA_DATABASE_URL || '',

  // Monobank
  NEXT_PUBLIC_MONOBANK_JAR_ID: process.env.NEXT_PUBLIC_MONOBANK_JAR_ID || '6Wm6ypKDNBz7vZ8E3kPq4m',

  // Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
  TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID || '',

  // Admin
  ADMIN_PHONE_NUMBER: process.env.ADMIN_PHONE_NUMBER || '',
  ADMIN_ACTIVATION_SECRET: process.env.ADMIN_ACTIVATION_SECRET || 'vip_activate_2026_secure_token_basket',
};

function log(type, message) {
  const timestamp = new Date().toLocaleTimeString();
  if (type === 'info') console.log(`${BLUE}[${timestamp}] ℹ️  ${message}${RESET}`);
  if (type === 'success') console.log(`${GREEN}[${timestamp}] ✅ ${message}${RESET}`);
  if (type === 'error') console.log(`${RED}[${timestamp}] ❌ ${message}${RESET}`);
  if (type === 'warn') console.log(`${YELLOW}[${timestamp}] ⚠️  ${message}${RESET}`);
  if (type === 'section') console.log(`\n${CYAN}═══ ${message} ═══${RESET}\n`);
}

async function checkVercelCLI() {
  try {
    await execAsync('vercel --version');
    log('success', 'Vercel CLI is installed');
    return true;
  } catch {
    log('error', 'Vercel CLI not found. Install with: npm install -g vercel');
    return false;
  }
}

async function checkVercelLogin() {
  try {
    const { stdout } = await execAsync('vercel whoami');
    log('success', `Logged in as: ${stdout.trim()}`);
    return true;
  } catch {
    log('error', 'Not logged in to Vercel. Run: vercel login');
    return false;
  }
}

async function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    log('warn', '.env.local not found');
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  return env;
}

async function addEnvironmentVariables() {
  log('section', 'ADDING ENVIRONMENT VARIABLES TO VERCEL');

  const localEnv = await loadEnvLocal();

  // Merge local env with our defined vars
  const finalEnv = { ...ENV_VARS };

  // Override with local values if they exist and are not empty
  Object.keys(localEnv).forEach(key => {
    if (localEnv[key]) {
      finalEnv[key] = localEnv[key];
    }
  });

  let successCount = 0;
  let errorCount = 0;

  for (const [key, value] of Object.entries(finalEnv)) {
    if (!value) {
      log('warn', `Skipping ${key} (empty value)`);
      continue;
    }

    try {
      // For NEXT_PUBLIC_* vars, add to all environments
      // For secret vars, only production
      const isPublic = key.startsWith('NEXT_PUBLIC_');
      const environments = isPublic
        ? 'production,preview,development'
        : 'production';

      const displayValue = key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET') || key.includes('PASSWORD')
        ? value.substring(0, 20) + '...'
        : value;

      log('info', `Adding ${key}=${displayValue}`);

      // Using Vercel CLI to set env var
      await execAsync(
        `vercel env add ${key} ${value} --confirm`,
        { stdio: 'pipe' }
      );

      log('success', `${key} added`);
      successCount++;
    } catch (error) {
      log('error', `Failed to add ${key}: ${error.message.substring(0, 100)}`);
      errorCount++;
    }
  }

  log('section', 'ENVIRONMENT VARIABLES SUMMARY');
  console.log(`${GREEN}✅ Added: ${successCount}${RESET}`);
  console.log(`${RED}❌ Failed: ${errorCount}${RESET}`);

  return errorCount === 0;
}

async function verifyEndpoints() {
  log('section', 'VERIFYING API ENDPOINTS');

  const endpointsToCheck = [
    '/api/teams/add',
    '/api/admin/check',
    '/api/chat/leaderboard',
  ];

  log('info', 'Checking that endpoints exist in codebase...\n');

  for (const endpoint of endpointsToCheck) {
    const filePath = endpoint.replace('/api/', 'app/api/').split('/').slice(0, -1).join('/');
    const routePath = path.join(__dirname, filePath, 'route.ts');

    if (fs.existsSync(routePath)) {
      log('success', `${endpoint} exists`);
    } else {
      log('warn', `${endpoint} might not exist at ${routePath}`);
    }
  }
}

async function verifySupabaseConfig() {
  log('section', 'VERIFYING SUPABASE CONFIGURATION');

  const mainRoute = path.join(__dirname, 'app/api/teams/add/route.ts');

  if (!fs.existsSync(mainRoute)) {
    log('error', 'API route not found');
    return false;
  }

  const content = fs.readFileSync(mainRoute, 'utf-8');

  if (content.includes('from(\'@/lib/supabase\')')) {
    log('success', 'API uses Supabase client correctly');
  }

  if (content.includes('.from(\'teams\')')) {
    log('success', 'API targets "teams" table');
  }

  if (content.includes('insert')) {
    log('success', 'API supports INSERT operations');
  }

  return true;
}

async function verifyComponent() {
  log('section', 'VERIFYING REACT COMPONENT');

  const componentPath = path.join(__dirname, 'components/AddTeam.tsx');

  if (!fs.existsSync(componentPath)) {
    log('error', 'AddTeam component not found');
    return false;
  }

  const content = fs.readFileSync(componentPath, 'utf-8');

  if (content.includes("'use client'")) {
    log('success', 'Component is Client Component');
  }

  if (content.includes('/api/teams/add')) {
    log('success', 'Component uses correct API endpoint');
  }

  if (content.includes('fetch')) {
    log('success', 'Component has API integration');
  }

  return true;
}

async function createDeploymentGuide() {
  log('section', 'CREATING DEPLOYMENT GUIDE');

  const guide = `
# 🚀 VERCEL DEPLOYMENT CHECKLIST

## Pre-Deployment (Local)

✅ **Step 1: Build Verification**
\`\`\`bash
npm run build
\`\`\`
Expected: "✓ Compiled successfully"

✅ **Step 2: Local Test**
\`\`\`bash
npm run dev:safe
curl -X POST http://localhost:3006/api/teams/add \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Test"}'
\`\`\`
Expected: 201 Created with team data

✅ **Step 3: Git Status**
\`\`\`bash
git status
git add .
git commit -m "feat: configure Supabase and Vercel deployment"
\`\`\`

## Deployment (Vercel)

✅ **Step 4: Deploy to Vercel**
\`\`\`bash
# Option A: Via git push (if CI/CD is configured)
git push origin main

# Option B: Via Vercel CLI
vercel deploy --prod
\`\`\`

## Post-Deployment (Verify Production)

✅ **Step 5: Verify Production API**
\`\`\`bash
curl -X POST https://basketball.lviv.ua/api/teams/add \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Production Test"}'
\`\`\`
Expected: 201 Created

✅ **Step 6: Check Supabase Dashboard**
- Navigate to https://app.supabase.com
- Check "teams" table
- Verify new record appears

✅ **Step 7: Monitor Vercel Logs**
- Go to https://vercel.com/dashboard
- Select basketball.lviv.ua
- Check Deployments and Logs
- Verify no errors

## Rollback (If Needed)

❌ **If Something Breaks:**
\`\`\`bash
# Option A: Revert git
git revert HEAD
git push origin main

# Option B: Promote previous deployment
# In Vercel Dashboard → Deployments → Select previous → Promote
\`\`\`

## Environment Variables Configured

The following variables have been set in Vercel:

**Supabase (Production):**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

**Auth:**
- NEXTAUTH_SECRET
- NEXTAUTH_URL (updated to https://basketball.lviv.ua)
- AUTH_SECRET

**Database:**
- DATABASE_URL
- DATABASE_URL_UNPOOLED
- PRISMA_DATABASE_URL

**Payment & Services:**
- NEXT_PUBLIC_MONOBANK_JAR_ID
- TELEGRAM_BOT_TOKEN
- TELEGRAM_ADMIN_CHAT_ID
- TELEGRAM_CHANNEL_ID

**Admin:**
- ADMIN_PHONE_NUMBER
- ADMIN_ACTIVATION_SECRET

## Quick Commands

\`\`\`bash
# Check Vercel status
vercel status

# View current deployments
vercel deployments list

# View production URL
vercel domains

# Check env vars
vercel env list

# Redeploy from git
git push origin main

# Deploy via CLI
vercel deploy --prod

# View logs
vercel logs

# Open in browser
vercel open
\`\`\`

## Success Indicators

✅ Vercel build completes without errors
✅ /api/teams/add endpoint responds 200 (GET)
✅ POST to /api/teams/add returns 201 with data
✅ New teams appear in Supabase dashboard
✅ No errors in Vercel runtime logs
✅ https://basketball.lviv.ua loads successfully

## Support

If deployment fails:
1. Check Vercel logs for errors
2. Verify environment variables in Vercel Dashboard
3. Ensure DATABASE_URL is correct (Neon)
4. Check Supabase status
5. Review git history: \`git log --oneline\`
`;

  const filePath = path.join(__dirname, 'VERCEL_DEPLOYMENT_CHECKLIST.md');
  fs.writeFileSync(filePath, guide);
  log('success', `Deployment guide created: ${filePath}`);
}

async function main() {
  const command = process.argv[2];

  console.log(`\n${CYAN}╔════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║  VERCEL DEPLOYMENT AUTOMATION TOOL    ║${RESET}`);
  console.log(`${CYAN}╚════════════════════════════════════════╝${RESET}\n`);

  // Check prerequisites
  if (!(await checkVercelCLI())) process.exit(1);
  if (!(await checkVercelLogin())) process.exit(1);

  // Run requested command
  switch (command) {
    case '--add-vars':
      await addEnvironmentVariables();
      break;

    case '--verify':
      await verifyEndpoints();
      await verifySupabaseConfig();
      await verifyComponent();
      break;

    case '--deploy':
      log('section', 'DEPLOYMENT PROCESS');
      log('info', 'Run the following commands:');
      console.log(`
${YELLOW}1. Verify build locally:${RESET}
   npm run build

${YELLOW}2. Commit changes:${RESET}
   git add .
   git commit -m "feat: configure Supabase and Vercel deployment"

${YELLOW}3. Deploy to Vercel:${RESET}
   git push origin main
   # or
   vercel deploy --prod

${YELLOW}4. Monitor deployment:${RESET}
   vercel logs --follow
`);
      break;

    case '--full':
      await verifyEndpoints();
      await verifySupabaseConfig();
      await verifyComponent();
      await createDeploymentGuide();
      log('info', 'Run: node deploy-to-vercel.js --add-vars (to add env vars)');
      log('info', 'Then: node deploy-to-vercel.js --deploy (for deployment steps)');
      break;

    default:
      console.log(`${YELLOW}Usage:${RESET}
  node deploy-to-vercel.js --verify    # Verify configuration
  node deploy-to-vercel.js --add-vars  # Add environment variables to Vercel
  node deploy-to-vercel.js --full      # Run all checks
  node deploy-to-vercel.js --deploy    # Show deployment steps
`);
  }
}

main().catch(error => {
  log('error', `Fatal error: ${error.message}`);
  process.exit(1);
});
