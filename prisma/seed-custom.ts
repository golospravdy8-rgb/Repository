import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// CUSTOMIZE THIS SECTION WITH YOUR TEAMS
// ============================================

// YOUR U-14 TEAMS (6 teams)
// Example:
// { name: 'Львівський БК', shortName: 'ЛБК' }
const U14_TEAMS: any[] = [];

// YOUR U-16 TEAMS (5 teams)
// Example:
// { name: 'Динамо U-16', shortName: 'ДИН' }
const U16_TEAMS: any[] = [];

// YOUR PLAYERS BY TEAM (optional - leave empty if you'll add manually)
// Structure: [
//   [ /* team 1 players */ ],
//   [ /* team 2 players */ ],
//   [ /* team 3 players */ ],
//   etc...
// ]
// Player example: { number: 1, firstName: 'Іван', lastName: 'Петренко', position: 'PG' }
const TEAM_PLAYERS: any[] = [];

// ============================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('SEEDING BASKET-LVIV WITH YOUR CUSTOM TEAMS');
  console.log('='.repeat(80) + '\n');

  try {
    // Get or create seasons
    console.log('[1/3] Creating/verifying seasons...');
    const seasonU14 = await prisma.season.upsert({
      where: { id: 1 },
      update: { name: 'Сезон U-14 2024/2025' },
      create: {
        id: 1,
        name: 'Сезон U-14 2024/2025',
        isActive: true,
        ageGroup: 'younger',
      },
    });

    const seasonU16 = await prisma.season.upsert({
      where: { id: 2 },
      update: { name: 'Сезон U-16 2024/2025' },
      create: {
        id: 2,
        name: 'Сезон U-16 2024/2025',
        isActive: true,
        ageGroup: 'older',
      },
    });

    console.log('  ✓ Season U-14: ' + seasonU14.name);
    console.log('  ✓ Season U-16: ' + seasonU16.name + '\n');

    // Create U-14 teams
    console.log('[2/3] Creating U-14 teams (' + U14_TEAMS.length + ')...');
    const u14Teams = [];
    for (let i = 0; i < U14_TEAMS.length; i++) {
      const teamData = U14_TEAMS[i];
      const team = await prisma.team.create({
        data: {
          name: teamData.name,
          shortName: teamData.shortName,
          seasonId: seasonU14.id,
          ageGroup: 'younger',
        },
      });
      u14Teams.push(team);
      console.log('    ✓ ' + team.name + ' (' + team.shortName + ')');

      // Add players if defined
      const playerList = TEAM_PLAYERS[i] || [];
      if (playerList.length > 0) {
        for (const playerData of playerList) {
          await prisma.player.create({
            data: {
              ...playerData,
              teamId: team.id,
            },
          });
        }
        console.log('      → Added ' + playerList.length + ' players');
      }

      // Create standings record
      await prisma.standing.create({
        data: {
          teamId: team.id,
          seasonId: seasonU14.id,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          gamesPlayed: 0,
        },
      });
    }
    console.log();

    // Create U-16 teams (optional)
    console.log('[3/3] Creating U-16 teams (' + U16_TEAMS.length + ')...');
    const u16Teams = [];
    for (let i = 0; i < U16_TEAMS.length; i++) {
      const teamData = U16_TEAMS[i];
      const team = await prisma.team.create({
        data: {
          name: teamData.name,
          shortName: teamData.shortName,
          seasonId: seasonU16.id,
          ageGroup: 'older',
        },
      });
      u16Teams.push(team);
      console.log('    ✓ ' + team.name + ' (' + team.shortName + ')');

      // Create standings record
      await prisma.standing.create({
        data: {
          teamId: team.id,
          seasonId: seasonU16.id,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          gamesPlayed: 0,
        },
      });
    }
    console.log();

    // Summary
    console.log('='.repeat(80));
    console.log('SEEDING COMPLETE');
    console.log('='.repeat(80));
    console.log('\nDatabase now contains:');
    console.log('  ✓ Seasons: 2 (U-14, U-16)');
    console.log('  ✓ Teams: ' + (u14Teams.length + u16Teams.length) + ' (' + u14Teams.length + ' U-14 + ' + u16Teams.length + ' U-16)');
    console.log('  ✓ Standing records: ' + (u14Teams.length + u16Teams.length));
    console.log('\nNext steps:');
    console.log('  1. Refresh your browser: http://localhost:3006');
    console.log('  2. Check /standings and /teams pages');
    console.log('  3. Use admin panel to add more players and games');
    console.log('  4. Or edit TEAM_PLAYERS in prisma/seed-custom.ts and re-run\n');

  } catch (error) {
    console.error('ERROR:', (error as any)?.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
