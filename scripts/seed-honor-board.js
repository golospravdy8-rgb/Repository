#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const season = await prisma.season.findFirst({
      where: { isActive: true, ageGroup: 'younger' },
    });

    if (!season) {
      console.log('❌ No active season found');
      return;
    }

    // Get FINAL games
    const games = await prisma.game.findMany({
      where: { seasonId: season.id, status: 'FINAL' },
      include: { homeTeam: true, awayTeam: true },
    });

    if (games.length === 0) {
      console.log('❌ No FINAL games found');
      return;
    }

    console.log(`📊 Found ${games.length} FINAL games`);

    // Get all players for both teams
    const players = await prisma.player.findMany({
      where: {
        OR: [
          { teamId: games[0]?.homeTeamId },
          { teamId: games[0]?.awayTeamId },
        ],
      },
      take: 50,
    });

    if (players.length === 0) {
      console.log('❌ No players found');
      return;
    }

    console.log(`👥 Found ${players.length} players`);

    // Delete existing box scores for these games to avoid dupes
    await prisma.boxScore.deleteMany({
      where: {
        gameId: { in: games.map((g) => g.id) },
      },
    });

    // Create mock box scores for each game
    let created = 0;
    for (const game of games) {
      console.log(
        `\n📝 Creating stats for game: ${game.homeTeam.name} vs ${game.awayTeam.name}`
      );

      // Get players from both teams
      const homeTeamPlayers = players.filter((p) => p.teamId === game.homeTeamId);
      const awayTeamPlayers = players.filter((p) => p.teamId === game.awayTeamId);

      // Create box scores for home team
      for (const player of homeTeamPlayers.slice(0, 12)) {
        const points = Math.floor(Math.random() * 25) + 2; // 2-27 points
        await prisma.boxScore.create({
          data: {
            gameId: game.id,
            playerId: player.id,
            teamId: player.teamId,
            points,
            assists: Math.floor(Math.random() * 8),
            rebounds: Math.floor(Math.random() * 12),
            steals: Math.floor(Math.random() * 3),
            blocks: Math.floor(Math.random() * 3),
            fouls: Math.floor(Math.random() * 5),
            minutes: 20 + Math.floor(Math.random() * 20),
            isStarter: Math.random() > 0.5,
          },
        });
        created++;
      }

      // Create box scores for away team
      for (const player of awayTeamPlayers.slice(0, 12)) {
        const points = Math.floor(Math.random() * 25) + 2;
        await prisma.boxScore.create({
          data: {
            gameId: game.id,
            playerId: player.id,
            teamId: player.teamId,
            points,
            assists: Math.floor(Math.random() * 8),
            rebounds: Math.floor(Math.random() * 12),
            steals: Math.floor(Math.random() * 3),
            blocks: Math.floor(Math.random() * 3),
            fouls: Math.floor(Math.random() * 5),
            minutes: 20 + Math.floor(Math.random() * 20),
            isStarter: Math.random() > 0.5,
          },
        });
        created++;
      }
    }

    console.log(`\n✅ Created ${created} box score records`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
