#!/usr/bin/env node

/**
 * Supabase Connection Test
 * Tests if environment variables are loaded and API is accessible
 */

require('dotenv').config({ path: '.env.local' });

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

console.log(`\n${BLUE}═══════════════════════════════════════════${RESET}`);
console.log(`${BLUE}  SUPABASE CONNECTION TEST${RESET}`);
console.log(`${BLUE}═══════════════════════════════════════════${RESET}\n`);

// Check env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('1️⃣  Checking environment variables...\n');

if (supabaseUrl) {
  console.log(`${GREEN}✅${RESET} NEXT_PUBLIC_SUPABASE_URL loaded`);
  console.log(`   URL: ${supabaseUrl}`);
} else {
  console.log(`${RED}❌${RESET} NEXT_PUBLIC_SUPABASE_URL not found`);
  process.exit(1);
}

if (supabaseKey) {
  console.log(`${GREEN}✅${RESET} NEXT_PUBLIC_SUPABASE_ANON_KEY loaded`);
  console.log(`   Key: ${supabaseKey.substring(0, 30)}...`);
} else {
  console.log(`${RED}❌${RESET} NEXT_PUBLIC_SUPABASE_ANON_KEY not found`);
  process.exit(1);
}

console.log('\n2️⃣  Checking Supabase client...\n');

try {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log(`${GREEN}✅${RESET} Supabase client created successfully`);
} catch (error) {
  console.log(`${RED}❌${RESET} Error creating client: ${error.message}`);
  process.exit(1);
}

console.log('\n3️⃣  Testing API endpoint availability...\n');

const http = require('http');

function testAPI() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3006,
      path: '/api/teams/add',
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(
            `${GREEN}✅${RESET} API endpoint /api/teams/add is accessible`
          );
          console.log(`   Status: ${res.statusCode}`);

          try {
            const response = JSON.parse(data);
            console.log(
              `   Method: ${response.method} (${response.endpoint})`
            );
          } catch (e) {
            console.log(`   Response: ${data.substring(0, 100)}`);
          }
          resolve(true);
        } else {
          console.log(`${RED}❌${RESET} API returned ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(
        `${YELLOW}⚠️ ${RESET} Cannot connect to dev server on localhost:3006`
      );
      console.log(`   Error: ${error.message}`);
      console.log(`   Make sure to run: npm run dev:safe`);
      resolve(false);
    });

    req.end();
  });
}

testAPI().then((apiOk) => {
  console.log('\n' + '═'.repeat(45));

  if (supabaseUrl && supabaseKey && apiOk) {
    console.log(`${GREEN}✅ CONFIGURATION SUCCESSFUL${RESET}`);
    console.log('\nNext step: Test POST request to add a team\n');
    process.exit(0);
  } else if (supabaseUrl && supabaseKey) {
    console.log(`${YELLOW}⚠️  PARTIAL SUCCESS${RESET}`);
    console.log('Env vars loaded, but dev server not responding.');
    console.log('Start the dev server with: npm run dev:safe\n');
    process.exit(0);
  } else {
    console.log(`${RED}❌ CONFIGURATION FAILED${RESET}`);
    console.log('Check error messages above\n');
    process.exit(1);
  }
});
