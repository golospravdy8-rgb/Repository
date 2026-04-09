#!/usr/bin/env node

/**
 * Diagnostic script for Supabase integration
 * Checks:
 * 1. Environment variables
 * 2. File existence
 * 3. API connectivity
 * 4. Supabase credentials validity
 */

const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

console.log(`\n${CYAN}╔════════════════════════════════════════════╗${RESET}`);
console.log(`${CYAN}║   SUPABASE INTEGRATION DIAGNOSTIC TOOL   ║${RESET}`);
console.log(`${CYAN}╚════════════════════════════════════════════╝${RESET}\n`);

const checks = {
  envVars: false,
  supabaseFile: false,
  apiRoute: false,
  component: false,
  importScript: false,
  exampleJson: false,
  supabaseURL: false,
  supabaseKey: false,
};

// Helper functions
function check(condition, message) {
  if (condition) {
    console.log(`${GREEN}✅${RESET} ${message}`);
    return true;
  } else {
    console.log(`${RED}❌${RESET} ${message}`);
    return false;
  }
}

function warn(message) {
  console.log(`${YELLOW}⚠️ ${RESET} ${message}`);
}

function info(message) {
  console.log(`${BLUE}ℹ️ ${RESET} ${message}`);
}

function section(title) {
  console.log(`\n${CYAN}${title}${RESET}`);
  console.log(`${CYAN}${'─'.repeat(50)}${RESET}`);
}

// 1. Check environment variables
section('1. ENVIRONMENT VARIABLES');

const envPath = path.join(__dirname, '../.env.local');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
  checks.envVars = check(true, '.env.local file exists');
} else {
  checks.envVars = check(false, '.env.local file exists');
  warn('.env.local not found. Create it with Supabase credentials.');
}

if (supabaseUrl) {
  checks.supabaseURL = check(true, 'NEXT_PUBLIC_SUPABASE_URL is set');
  console.log(`   URL: ${supabaseUrl.substring(0, 50)}...`);
} else {
  checks.supabaseURL = check(
    false,
    'NEXT_PUBLIC_SUPABASE_URL is set (MISSING)'
  );
  warn('Add NEXT_PUBLIC_SUPABASE_URL to .env.local');
}

if (supabaseKey) {
  const keyPreview = supabaseKey.substring(0, 20);
  checks.supabaseKey = check(true, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is set');
  console.log(`   Key: ${keyPreview}...`);
} else {
  checks.supabaseKey = check(
    false,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY is set (MISSING)'
  );
  warn('Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
}

// 2. Check files exist
section('2. PROJECT FILES');

const files = [
  { path: 'lib/supabase.js', check: 'supabaseFile' },
  { path: 'app/api/teams/add/route.ts', check: 'apiRoute' },
  { path: 'components/AddTeam.tsx', check: 'component' },
  { path: 'scripts/import-teams.js', check: 'importScript' },
  { path: 'teams.example.json', check: 'exampleJson' },
];

files.forEach(({ path: filePath, check: checkKey }) => {
  const fullPath = path.join(__dirname, '../' + filePath);
  const exists = fs.existsSync(fullPath);
  checks[checkKey] = check(exists, `${filePath} exists`);

  if (exists) {
    const stats = fs.statSync(fullPath);
    console.log(`   Size: ${stats.size} bytes`);
  }
});

// 3. Check file contents
section('3. FILE VALIDATION');

// Check supabase.js exports
try {
  const supabaseContent = fs.readFileSync(
    path.join(__dirname, '../lib/supabase.js'),
    'utf-8'
  );
  if (supabaseContent.includes('export const supabase')) {
    check(true, 'lib/supabase.js exports supabase client');
  } else {
    check(false, 'lib/supabase.js exports supabase client');
  }
} catch (error) {
  check(false, 'lib/supabase.js is readable');
}

// Check API route has POST
try {
  const apiContent = fs.readFileSync(
    path.join(__dirname, '../app/api/teams/add/route.ts'),
    'utf-8'
  );
  if (apiContent.includes('export async function POST')) {
    check(true, 'API route exports POST function');
  } else {
    check(false, 'API route exports POST function');
  }
} catch (error) {
  check(false, 'API route is readable');
}

// Check component is client
try {
  const componentContent = fs.readFileSync(
    path.join(__dirname, '../components/AddTeam.tsx'),
    'utf-8'
  );
  if (componentContent.includes("'use client'")) {
    check(true, "Component has 'use client' directive");
  } else {
    check(false, "Component has 'use client' directive");
  }
} catch (error) {
  check(false, 'Component is readable');
}

// 4. Summary
section('4. SUMMARY');

const passedChecks = Object.values(checks).filter((v) => v === true).length;
const totalChecks = Object.keys(checks).length;
const percentage = Math.round((passedChecks / totalChecks) * 100);

console.log(`${BLUE}Passed: ${passedChecks}/${totalChecks} checks (${percentage}%)${RESET}`);

if (percentage === 100) {
  console.log(`\n${GREEN}✅ ALL CHECKS PASSED!${RESET}`);
  console.log('Your Supabase integration is properly configured.');
  console.log(
    'You can now start the dev server: npm run dev:safe'
  );
  process.exit(0);
} else if (percentage >= 80) {
  console.log(`\n${YELLOW}⚠️  SOME CHECKS FAILED${RESET}`);
  console.log('Most components are ready, but you need to:');
  if (!checks.supabaseURL || !checks.supabaseKey) {
    console.log('  1. Add Supabase credentials to .env.local');
  }
  if (!checks.envVars) {
    console.log('  2. Create .env.local file');
  }
  process.exit(1);
} else {
  console.log(`\n${RED}❌ CRITICAL CHECKS FAILED${RESET}`);
  console.log('Setup is incomplete. Check errors above and fix them.');
  process.exit(1);
}
