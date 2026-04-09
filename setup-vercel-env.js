#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup via API
 * Adds/updates all environment variables for Production & Preview
 * Using Vercel REST API directly (не зависит от CLI)
 */

const https = require('https');
const path = require('path');

// ═════════════════════════════════════════════════════════════
// CONFIG
// ═════════════════════════════════════════════════════════════

const VERCEL_TOKEN = 'vcp_5nG3a3TEqKaRJgW9JTRmxtrCN67KKh4HBNvOee6bPT5KFTMdm52xDf3v';
const VERCEL_TEAM_ID = 'basketball.lviv'; // или team slug
const PROJECT_SLUG = 'basket-lviv'; // название проекта в Vercel

const ENV_VARS = {
  // === Auth ===
  NEXTAUTH_SECRET: 'ldbl-dev-secret-32-chars-ok-2025!',
  NEXTAUTH_URL: 'https://basketball.lviv.ua',
  AUTH_SECRET: 'ldbl-dev-secret-32-chars-ok-2025!',
  AUTH_PORT: '3012',
  JWT_SECRET: 'ldbl_super_secret_2025',

  // === Chat ===
  CHAT_ADMIN_SECRET: 'ldbl-chat-admin-secret',
  CHAT_SERVER_URL: 'https://basketball.lviv.ua',

  // === Payment ===
  NEXT_PUBLIC_MONOBANK_JAR_ID: '6Wm6ypKDNBz7vZ8E3kPq4m',

  // === Telegram ===
  TELEGRAM_BOT_TOKEN: '7685937167:AAFfSNWb98RIshlHtOn9sId6M5DvH0FoV54',
  TELEGRAM_ADMIN_CHAT_ID: '7685937167',
  TELEGRAM_CHANNEL_ID: '-1003522476963',

  // === Supabase ===
  NEXT_PUBLIC_SUPABASE_URL: 'https://dzsvgyetmdgykmujmxuu.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_086iusJsMoX5QOr6FxqKFA_WBM1LMdB',

  // === Admin ===
  ADMIN_PHONE_NUMBER: '',
  ADMIN_ACTIVATION_SECRET: 'vip_activate_2026_secure_token_basket',

  // === Database (Neon) ===
  DATABASE_URL: 'postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require',
  DATABASE_URL_UNPOOLED: 'postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
  PRISMA_DATABASE_URL: 'postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
  NEON_PROJECT_ID: 'super-flower-12396396',
  PGDATABASE: 'neondb',
  PGHOST: 'ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech',
  PGHOST_UNPOOLED: 'ep-still-frost-an4xb137.c-6.us-east-1.aws.neon.tech',
  PGPASSWORD: 'npg_wW3lIbDUcx9g',
  PGUSER: 'neondb_owner',
  POSTGRES_DATABASE: 'neondb',
  POSTGRES_HOST: 'ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech',
  POSTGRES_PASSWORD: 'npg_wW3lIbDUcx9g',
  POSTGRES_PRISMA_URL: 'postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&connect_timeout=15&sslmode=require',
  POSTGRES_URL: 'postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require',
  POSTGRES_URL_NON_POOLING: 'postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require',
  POSTGRES_URL_NO_SSL: 'postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech/neondb',
  POSTGRES_USER: 'neondb_owner',
};

// ═════════════════════════════════════════════════════════════
// API HELPERS
// ═════════════════════════════════════════════════════════════

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

function log(type, msg) {
  const ts = new Date().toLocaleTimeString();
  if (type === 'info') console.log(`${BLUE}[${ts}] ℹ️  ${msg}${RESET}`);
  if (type === 'ok') console.log(`${GREEN}[${ts}] ✅ ${msg}${RESET}`);
  if (type === 'err') console.log(`${RED}[${ts}] ❌ ${msg}${RESET}`);
  if (type === 'warn') console.log(`${YELLOW}[${ts}] ⚠️  ${msg}${RESET}`);
  if (type === 'section') console.log(`\n${CYAN}═══ ${msg} ═══${RESET}\n`);
}

function httpsRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : {},
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: { raw: body },
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// ═════════════════════════════════════════════════════════════
// MAIN SETUP
// ═════════════════════════════════════════════════════════════

async function setupEnvironmentVariables() {
  log('section', 'VERCEL ENVIRONMENT VARIABLES SETUP');

  console.log(`${CYAN}Project:${RESET} ${PROJECT_SLUG}`);
  console.log(`${CYAN}Team:${RESET} ${VERCEL_TEAM_ID}`);
  console.log(`${CYAN}Variables to add:${RESET} ${Object.keys(ENV_VARS).length}`);
  console.log('');

  let success = 0;
  let failed = 0;

  for (const [key, value] of Object.entries(ENV_VARS)) {
    if (!value) {
      log('warn', `Skipping ${key} (empty value)`);
      continue;
    }

    const isPublic = key.startsWith('NEXT_PUBLIC_');
    const envs = isPublic ? ['production', 'preview', 'development'] : ['production', 'preview'];
    const type = isPublic ? 'public' : 'secret';

    // Скрываем длинные значения в логе
    const displayValue = value.length > 40 ? `${value.substring(0, 30)}...` : value;
    log('info', `${key} = ${displayValue} (${type})`);

    try {
      // Vercel API: POST /v9/projects/{projectId}/env
      const payload = {
        key: key,
        value: value,
        target: envs,
        type: type === 'public' ? 'string' : 'encrypted',
      };

      const apiPath = `/v9/projects/${PROJECT_SLUG}/env`;
      const result = await httpsRequest('POST', apiPath, payload);

      if (result.status === 200 || result.status === 201) {
        log('ok', `Added ${key}`);
        success++;
      } else if (result.status === 409) {
        // Already exists - update instead
        log('warn', `${key} already exists, updating...`);
        const updatePath = `/v9/projects/${PROJECT_SLUG}/env/${key}`;
        const updateResult = await httpsRequest('PATCH', updatePath, { value: value, target: envs });

        if (updateResult.status === 200) {
          log('ok', `Updated ${key}`);
          success++;
        } else {
          log('err', `Failed to update ${key}: ${updateResult.status}`);
          failed++;
        }
      } else {
        log('err', `Failed to add ${key} (${result.status})`);
        if (result.data.error) console.log(`   Error: ${result.data.error.message}`);
        failed++;
      }
    } catch (error) {
      log('err', `Exception for ${key}: ${error.message}`);
      failed++;
    }
  }

  log('section', 'SETUP SUMMARY');
  console.log(`${GREEN}✅ Added/Updated: ${success}${RESET}`);
  console.log(`${RED}❌ Failed: ${failed}${RESET}`);
  console.log('');

  return failed === 0;
}

// ═════════════════════════════════════════════════════════════
// RUN
// ═════════════════════════════════════════════════════════════

async function main() {
  try {
    const success = await setupEnvironmentVariables();

    log('section', 'NEXT STEPS');
    console.log(`${YELLOW}1. Verify variables in Vercel Dashboard:${RESET}`);
    console.log('   https://vercel.com/dashboard/basket-lviv/settings/environment-variables');
    console.log('');
    console.log(`${YELLOW}2. Verify via CLI:${RESET}`);
    console.log('   vercel env list');
    console.log('');
    console.log(`${YELLOW}3. After verification, deploy:${RESET}`);
    console.log('   git push origin main');
    console.log('   # or');
    console.log('   vercel deploy --prod');
    console.log('');

    if (!success) {
      log('warn', 'Some variables failed. Check Vercel Dashboard manually.');
      process.exit(1);
    }
  } catch (error) {
    log('err', `Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
