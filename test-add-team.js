#!/usr/bin/env node

/**
 * Test POST request to add a team
 */

const http = require('http');

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';

console.log(`\n${BLUE}═══════════════════════════════════════════${RESET}`);
console.log(`${BLUE}  ADD TEAM TEST REQUEST${RESET}`);
console.log(`${BLUE}═══════════════════════════════════════════${RESET}\n`);

const teamData = {
  name: 'Test Team',
  description: 'Testing Supabase connection',
  photoUrl: null,
};

console.log('📤 Sending POST request to /api/teams/add\n');
console.log(`Request body:`);
console.log(JSON.stringify(teamData, null, 2));
console.log();

const postData = JSON.stringify(teamData);

const options = {
  hostname: 'localhost',
  port: 3006,
  path: '/api/teams/add',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`\n📥 Response received:\n`);
    console.log(`Status Code: ${res.statusCode}\n`);

    try {
      const response = JSON.parse(data);
      console.log('Response Body:');
      console.log(JSON.stringify(response, null, 2));

      if (res.statusCode === 201) {
        console.log(`\n${GREEN}✅ SUCCESS - Team added to Supabase!${RESET}`);
        if (response.data) {
          console.log(`\nTeam Details:`);
          console.log(`  ID: ${response.data.id}`);
          console.log(`  Name: ${response.data.name}`);
          console.log(`  Created: ${response.data.created_at}`);
        }
      } else if (res.statusCode === 400) {
        console.log(`\n${RED}❌ Validation Error${RESET}`);
        console.log('Check request body format');
      } else if (res.statusCode === 500) {
        console.log(`\n${RED}❌ Server Error${RESET}`);
        console.log('Check if Supabase connection is working');
      } else {
        console.log(`\n${YELLOW}⚠️  Status ${res.statusCode}${RESET}`);
      }
    } catch (error) {
      console.log(`${RED}Error parsing response:${RESET}`);
      console.log(data);
    }

    process.exit(res.statusCode === 201 ? 0 : 1);
  });
});

req.on('error', (error) => {
  console.log(
    `${RED}❌ Connection Error: ${error.message}${RESET}`
  );
  console.log('\nMake sure dev server is running: npm run dev:safe');
  process.exit(1);
});

req.write(postData);
req.end();
