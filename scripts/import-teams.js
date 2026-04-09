#!/usr/bin/env node

/**
 * Script to import teams from JSON file to Supabase via API
 *
 * Usage:
 *   node scripts/import-teams.js [path-to-teams.json]
 *
 * Default path: ./teams.json
 *
 * Expected JSON format:
 * [
 *   {
 *     "name": "Team Name",
 *     "description": "Optional description",
 *     "photoUrl": "https://example.com/image.jpg"
 *   },
 *   ...
 * ]
 */

const fs = require('fs');
const path = require('path');

const TEAMS_FILE = process.argv[2] || path.join(__dirname, '../teams.json');
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006';
const TEAMS_ENDPOINT = `${API_URL}/api/teams/add`;

async function importTeams() {
  console.log('🏀 Starting team import...\n');

  // Check if file exists
  if (!fs.existsSync(TEAMS_FILE)) {
    console.error(`❌ File not found: ${TEAMS_FILE}`);
    console.log(`\nCreate a teams.json file with the following format:\n`);
    console.log(JSON.stringify(
      [
        {
          name: 'Team Name',
          description: 'Optional description',
          photoUrl: 'https://example.com/image.jpg',
        },
      ],
      null,
      2
    ));
    process.exit(1);
  }

  // Read and parse JSON
  let teams;
  try {
    const fileContent = fs.readFileSync(TEAMS_FILE, 'utf-8');
    teams = JSON.parse(fileContent);

    if (!Array.isArray(teams)) {
      throw new Error('JSON must be an array of teams');
    }

    console.log(`📄 Found ${teams.length} teams in ${TEAMS_FILE}\n`);
  } catch (error) {
    console.error(`❌ Error parsing JSON: ${error.message}`);
    process.exit(1);
  }

  // Validate teams
  const validTeams = [];
  teams.forEach((team, index) => {
    if (!team.name || typeof team.name !== 'string') {
      console.warn(`⚠️  Team #${index + 1}: missing or invalid 'name' field`);
      return;
    }
    validTeams.push(team);
  });

  console.log(`✅ Valid teams: ${validTeams.length}\n`);

  if (validTeams.length === 0) {
    console.error('❌ No valid teams to import');
    process.exit(1);
  }

  // Import teams
  let successful = 0;
  let failed = 0;

  for (const team of validTeams) {
    try {
      const response = await fetch(TEAMS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: team.name,
          description: team.description || null,
          photoUrl: team.photoUrl || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ ${team.name} (ID: ${result.data.id})`);
        successful++;
      } else {
        console.error(`❌ ${team.name}: ${result.details || result.error}`);
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${team.name}: ${error.message}`);
      failed++;
    }
  }

  // Summary
  console.log(`\n📊 Import Summary:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total: ${successful + failed}\n`);

  if (failed === 0) {
    console.log('🎉 All teams imported successfully!');
    process.exit(0);
  } else {
    console.log('⚠️  Some teams failed to import. Check the errors above.');
    process.exit(1);
  }
}

// Check if running
if (require.main === module) {
  importTeams().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { importTeams };
