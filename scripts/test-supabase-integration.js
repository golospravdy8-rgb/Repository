#!/usr/bin/env node

/**
 * Automated Supabase Integration Test
 * Tests API endpoint, component functionality, and import script
 *
 * Prerequisites:
 * - npm run dev:safe must be running on port 3006
 * - Supabase credentials set in .env.local
 * - teams table must exist in Supabase
 *
 * Usage:
 *   node scripts/test-supabase-integration.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3006';
const API_ENDPOINT = '/api/teams/add';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

let testsPassed = 0;
let testsFailed = 0;

function log(type, message) {
  const timestamp = new Date().toLocaleTimeString();
  if (type === 'info') console.log(`${BLUE}[${timestamp}] ℹ️  ${message}${RESET}`);
  if (type === 'success') {
    console.log(`${GREEN}[${timestamp}] ✅ ${message}${RESET}`);
    testsPassed++;
  }
  if (type === 'error') {
    console.log(`${RED}[${timestamp}] ❌ ${message}${RESET}`);
    testsFailed++;
  }
  if (type === 'warn') console.log(`${YELLOW}[${timestamp}] ⚠️  ${message}${RESET}`);
  if (type === 'section')
    console.log(`\n${CYAN}${message}${RESET}\n${'─'.repeat(60)}`);
}

function makeRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + endpoint);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 3006,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testAPIConnectivity() {
  log('section', '1. API CONNECTIVITY TEST');

  try {
    const response = await makeRequest('GET', API_ENDPOINT);
    if (response.status === 200) {
      log('success', `API is accessible on ${API_URL}${API_ENDPOINT}`);
      if (response.body?.endpoint === API_ENDPOINT) {
        log('success', 'API endpoint is properly configured');
      }
    } else {
      log('error', `API returned status ${response.status}`);
    }
  } catch (error) {
    log(
      'error',
      `Cannot connect to API. Is dev server running? Error: ${error.message}`
    );
    return false;
  }
  return true;
}

async function testAddTeamValidation() {
  log('section', '2. INPUT VALIDATION TESTS');

  // Test: Empty name should fail
  log('info', 'Testing empty name validation...');
  try {
    const response = await makeRequest('POST', API_ENDPOINT, {
      name: '',
    });
    if (response.status === 400) {
      log('success', 'Empty name validation works (400 returned)');
    } else {
      log('error', `Expected 400, got ${response.status}`);
    }
  } catch (error) {
    log('error', `Validation test failed: ${error.message}`);
  }

  // Test: Name too long should fail
  log('info', 'Testing max length validation...');
  try {
    const longName = 'A'.repeat(101);
    const response = await makeRequest('POST', API_ENDPOINT, {
      name: longName,
    });
    if (response.status === 400) {
      log('success', 'Max length validation works (400 returned)');
    } else {
      log('error', `Expected 400, got ${response.status}`);
    }
  } catch (error) {
    log('error', `Length validation test failed: ${error.message}`);
  }

  // Test: Valid minimal request
  log('info', 'Testing valid minimal request (name only)...');
  try {
    const response = await makeRequest('POST', API_ENDPOINT, {
      name: `Test Team ${Date.now()}`,
    });
    if (response.status === 201) {
      log('success', 'Minimal valid request accepted (201 Created)');
      if (response.body?.data?.id) {
        log('success', `Team created with ID: ${response.body.data.id}`);
        return response.body.data;
      }
    } else {
      log('error', `Expected 201, got ${response.status}`);
      log('info', `Response: ${JSON.stringify(response.body)}`);
    }
  } catch (error) {
    log('error', `Valid request test failed: ${error.message}`);
  }
}

async function testAddTeamWithAllFields() {
  log('section', '3. FULL FEATURE TEST (All fields)');

  const testTeam = {
    name: `Full Test Team ${Date.now()}`,
    description: 'This is a comprehensive test team',
    photoUrl: 'https://example.com/photo.jpg',
  };

  log('info', `Adding team: ${testTeam.name}`);

  try {
    const response = await makeRequest('POST', API_ENDPOINT, testTeam);

    if (response.status === 201) {
      log('success', 'Team with all fields added successfully (201)');

      const { data } = response.body;
      if (data?.name === testTeam.name) {
        log('success', `Name field matches: "${data.name}"`);
      }
      if (data?.description === testTeam.description) {
        log('success', `Description field matches`);
      }
      if (data?.photo_url === testTeam.photoUrl) {
        log('success', `Photo URL field matches`);
      }
      if (data?.id) {
        log('success', `Team ID assigned: ${data.id}`);
      }
      if (data?.created_at) {
        log('success', `Timestamp recorded: ${data.created_at}`);
      }

      return data;
    } else {
      log('error', `Expected 201, got ${response.status}`);
      log('info', `Response: ${JSON.stringify(response.body)}`);
    }
  } catch (error) {
    log('error', `Full feature test failed: ${error.message}`);
  }
}

async function testImportScript() {
  log('section', '4. IMPORT SCRIPT TEST');

  const teamsFilePath = path.join(__dirname, '../teams.json');

  if (!fs.existsSync(teamsFilePath)) {
    log('warn', 'teams.json not found. Skipping import test.');
    log('info', 'Create teams.json using: cp teams.example.json teams.json');
    return;
  }

  try {
    const content = fs.readFileSync(teamsFilePath, 'utf-8');
    const teams = JSON.parse(content);

    if (!Array.isArray(teams)) {
      log('error', 'teams.json must be an array');
      return;
    }

    log('success', `teams.json is valid with ${teams.length} teams`);

    // Try to import first team as a test
    if (teams.length > 0) {
      log('info', `Testing import of first team: "${teams[0].name}"`);

      const response = await makeRequest('POST', API_ENDPOINT, {
        name: `${teams[0].name} (Import Test ${Date.now()})`,
        description: teams[0].description,
        photoUrl: teams[0].photoUrl,
      });

      if (response.status === 201) {
        log('success', `Import test successful - team added via API`);
      } else {
        log('error', `Import test failed with status ${response.status}`);
      }
    }
  } catch (error) {
    log('error', `Import script test failed: ${error.message}`);
  }
}

async function testErrorHandling() {
  log('section', '5. ERROR HANDLING TEST');

  // Test: Malformed JSON
  log('info', 'Testing malformed request handling...');
  try {
    const response = await makeRequest('POST', API_ENDPOINT, null);
    if (response.status >= 400) {
      log('success', 'API properly handles malformed requests');
    }
  } catch (error) {
    log('success', 'API properly rejects invalid requests');
  }

  // Test: Missing required field
  log('info', 'Testing missing required field...');
  try {
    const response = await makeRequest('POST', API_ENDPOINT, {
      description: 'No name provided',
    });
    if (response.status === 400) {
      log('success', 'API validates required fields (400 returned)');
    }
  } catch (error) {
    log('error', `Error handling test failed: ${error.message}`);
  }
}

async function runAllTests() {
  console.log(`\n${CYAN}╔════════════════════════════════════════╗${RESET}`);
  console.log(
    `${CYAN}║  SUPABASE INTEGRATION TEST SUITE      ║${RESET}`
  );
  console.log(`${CYAN}╚════════════════════════════════════════╝${RESET}\n`);

  log('info', 'Starting test suite...\n');

  // Check if dev server is running
  try {
    await makeRequest('GET', API_ENDPOINT);
  } catch (error) {
    log('error', 'Dev server is not running on http://localhost:3006');
    log('info', 'Start it with: npm run dev:safe');
    process.exit(1);
  }

  // Run tests
  const connected = await testAPIConnectivity();
  if (!connected) process.exit(1);

  await testAddTeamValidation();
  await testAddTeamWithAllFields();
  await testImportScript();
  await testErrorHandling();

  // Summary
  log('section', 'TEST SUMMARY');
  const total = testsPassed + testsFailed;
  const percentage = total === 0 ? 0 : Math.round((testsPassed / total) * 100);

  console.log(`${BLUE}Passed: ${testsPassed}/${total} tests (${percentage}%)${RESET}`);

  if (testsFailed === 0 && testsPassed > 0) {
    console.log(
      `\n${GREEN}✅ ALL TESTS PASSED - Integration is working!${RESET}`
    );
    process.exit(0);
  } else if (testsFailed > 0) {
    console.log(`\n${RED}❌ Some tests failed - See errors above${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${YELLOW}⚠️  No tests were executed${RESET}`);
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error(`${RED}Fatal error: ${error.message}${RESET}`);
  process.exit(1);
});
