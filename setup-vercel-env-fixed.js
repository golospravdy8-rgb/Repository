#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup via API (FIXED)
 * Updates existing public variables with correct type
 */

const https = require('https');

const VERCEL_TOKEN = 'vcp_5nG3a3TEqKaRJgW9JTRmxtrCN67KKh4HBNvOee6bPT5KFTMdm52xDf3v';
const PROJECT_SLUG = 'basket-lviv';

const PUBLIC_VARS = {
  NEXT_PUBLIC_MONOBANK_JAR_ID: '6Wm6ypKDNBz7vZ8E3kPq4m',
  NEXT_PUBLIC_SUPABASE_URL: 'https://dzsvgyetmdgykmujmxuu.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_086iusJsMoX5QOr6FxqKFA_WBM1LMdB',
};

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

function log(type, msg) {
  const ts = new Date().toLocaleTimeString();
  if (type === 'info') console.log(`${BLUE}[${ts}] ℹ️  ${msg}${RESET}`);
  if (type === 'ok') console.log(`${GREEN}[${ts}] ✅ ${msg}${RESET}`);
  if (type === 'err') console.log(`${RED}[${ts}] ❌ ${msg}${RESET}`);
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

async function updatePublicVariables() {
  console.log('\n📝 Updating public environment variables...\n');

  let success = 0;
  let failed = 0;

  for (const [key, value] of Object.entries(PUBLIC_VARS)) {
    const displayValue = value.length > 30 ? `${value.substring(0, 25)}...` : value;
    log('info', `Updating ${key} = ${displayValue}`);

    try {
      // PATCH endpoint untuk update
      const updatePath = `/v9/projects/${PROJECT_SLUG}/env/${key}`;
      const payload = {
        value: value,
        target: ['production', 'preview', 'development'],
        type: 'plain', // untuk public vars, gunakan 'plain'
      };

      const result = await httpsRequest('PATCH', updatePath, payload);

      if (result.status === 200) {
        log('ok', `Updated ${key}`);
        success++;
      } else {
        log('err', `Failed to update ${key} (${result.status})`);
        if (result.data.error) console.log(`   ${result.data.error.message}`);
        failed++;
      }
    } catch (error) {
      log('err', `Exception: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${GREEN}✅ Updated: ${success}${RESET}`);
  if (failed > 0) {
    console.log(`${RED}❌ Failed: ${failed}${RESET}`);
  }
  console.log('');
}

async function verifyAllVariables() {
  console.log('📋 Fetching all environment variables...\n');

  try {
    const path = `/v9/projects/${PROJECT_SLUG}/env`;
    const result = await httpsRequest('GET', path);

    if (result.status === 200 && result.data.envs) {
      const envs = result.data.envs;
      console.log(`✅ Found ${envs.length} environment variables:\n`);

      const categories = {
        'Auth': ['NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'AUTH_SECRET', 'AUTH_PORT', 'JWT_SECRET'],
        'Chat': ['CHAT_ADMIN_SECRET', 'CHAT_SERVER_URL'],
        'Payment': ['NEXT_PUBLIC_MONOBANK_JAR_ID'],
        'Telegram': ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ADMIN_CHAT_ID', 'TELEGRAM_CHANNEL_ID'],
        'Supabase': ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
        'Admin': ['ADMIN_ACTIVATION_SECRET'],
        'Database': envs.filter(e => e.key.includes('DATABASE') || e.key.includes('POSTGRES') || e.key.includes('NEON')).map(e => e.key),
      };

      for (const [category, keys] of Object.entries(categories)) {
        console.log(`\n${BLUE}${category}:${RESET}`);
        const categoryEnvs = typeof keys[0] === 'string'
          ? envs.filter(e => keys.includes(e.key))
          : keys;

        categoryEnvs.forEach(env => {
          const key = typeof env === 'string' ? env : env.key;
          const exists = envs.find(e => e.key === key);
          const icon = exists ? '✅' : '❌';
          const targets = exists ? exists.target.join(', ') : 'N/A';
          console.log(`  ${icon} ${key.padEnd(30)} [${targets}]`);
        });
      }
    } else {
      log('err', 'Failed to fetch variables');
    }
  } catch (error) {
    log('err', `Exception: ${error.message}`);
  }

  console.log('\n');
}

async function main() {
  try {
    await updatePublicVariables();
    await verifyAllVariables();
  } catch (error) {
    log('err', `Fatal: ${error.message}`);
    process.exit(1);
  }
}

main();
