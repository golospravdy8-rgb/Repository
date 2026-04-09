#!/usr/bin/env node

/**
 * Check what columns exist in Supabase teams table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';

console.log(`\n${BLUE}═══════════════════════════════════════════${RESET}`);
console.log(`${BLUE}  SUPABASE TABLE STRUCTURE CHECK${RESET}`);
console.log(`${BLUE}═══════════════════════════════════════════${RESET}\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  try {
    console.log('Attempting to read from "teams" table...\n');

    // Try to read with limit 0 - just to check structure
    const { data, error, status } = await supabase
      .from('teams')
      .select('*')
      .limit(0);

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`${RED}❌ Table "teams" does not exist${RESET}`);
        console.log(`\n${YELLOW}Solution:${RESET}`);
        console.log('Create the table with SQL in Supabase Dashboard:\n');
        console.log(`${BLUE}CREATE TABLE IF NOT EXISTS teams (${RESET}`);
        console.log(`${BLUE}  id BIGSERIAL PRIMARY KEY,${RESET}`);
        console.log(`${BLUE}  name VARCHAR(100) NOT NULL,${RESET}`);
        console.log(`${BLUE}  description TEXT,${RESET}`);
        console.log(`${BLUE}  photo_url VARCHAR(255),${RESET}`);
        console.log(`${BLUE}  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP${RESET}`);
        console.log(`${BLUE});${RESET}\n`);
      } else {
        console.log(`${RED}❌ Error: ${error.message}${RESET}`);
        console.log(`Code: ${error.code}`);
      }
      return false;
    }

    console.log(`${GREEN}✅ Table "teams" exists${RESET}\n`);
    console.log('Columns detected from schema:');

    // Get more detailed info by trying to insert and catching field errors
    const { error: insertError } = await supabase.from('teams').insert([
      {
        name: '__test__',
        description: '__test__',
        photo_url: '__test__',
        created_at: new Date().toISOString(),
      },
    ]);

    if (insertError) {
      console.log(`\n${YELLOW}Test insert result:${RESET}`);
      console.log(`${insertError.message}`);

      // Check specific fields
      const fieldTests = [
        { field: 'name', value: '__test__' },
        { field: 'description', value: '__test__' },
        { field: 'photo_url', value: '__test__' },
        { field: 'created_at', value: new Date().toISOString() },
      ];

      console.log(`\n${BLUE}Checking which fields exist:${RESET}`);
      for (const test of fieldTests) {
        const msg = insertError.message;
        if (msg.includes(`'${test.field}'`)) {
          console.log(`  ${YELLOW}⚠️  ${test.field}${RESET} - might not exist or have wrong type`);
        }
      }
    } else {
      console.log(`${GREEN}✅ All fields are writable${RESET}`);

      // Clean up test record
      await supabase.from('teams').delete().eq('name', '__test__');
    }

    // Try simpler insert with just name
    console.log(`\n${BLUE}Testing minimal insert (name only):${RESET}`);
    const { data: minData, error: minError } = await supabase
      .from('teams')
      .insert([{ name: '__test_min__' }])
      .select();

    if (minError) {
      console.log(`${RED}❌ Error: ${minError.message}${RESET}`);
    } else {
      console.log(`${GREEN}✅ Minimal insert works!${RESET}`);
      if (minData && minData[0]) {
        console.log(`Created team:`);
        console.log(JSON.stringify(minData[0], null, 2));
      }

      // Clean up
      await supabase.from('teams').delete().eq('name', '__test_min__');
    }
  } catch (err) {
    console.log(`${RED}❌ Fatal error: ${err.message}${RESET}`);
  }
}

checkTable();
