const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create game with DIFFERENT teams/results than game/159
  const game = await prisma.game.create({
    data: {
      seasonId: 2,
      homeTeamId: 7,
      awayTeamId: 11,
      scheduledAt: new Date('2026-03-15'),
      status: 'FINAL',
      stage: 'group',
      homeScore: 65,
      awayScore: 54,
      quarter: 4,
    }
  });
  console.log('Created game:', game.id);

  // Get players
  const homePlayers = await prisma.player.findMany({ where: { teamId: 7 }, take: 8 });
  const awayPlayers = await prisma.player.findMany({ where: { teamId: 11 }, take: 8 });

  // Create DIFFERENT stats per player (not uniform)
  const statsVariations = [
    { points: 18, rebounds: 7, assists: 2, steals: 3, blocks: 1, fouls: 2 },
    { points: 14, rebounds: 3, assists: 5, steals: 1, blocks: 0, fouls: 3 },
    { points: 12, rebounds: 8, assists: 1, steals: 2, blocks: 2, fouls: 1 },
    { points: 8,  rebounds: 2, assists: 8, steals: 0, blocks: 0, fouls: 4 },
    { points: 7,  rebounds: 4, assists: 3, steals: 1, blocks: 1, fouls: 2 },
    { points: 4,  rebounds: 1, assists: 1, steals: 2, blocks: 0, fouls: 3 },
    { points: 2,  rebounds: 3, assists: 2, steals: 0, blocks: 1, fouls: 1 },
    { points: 0,  rebounds: 0, assists: 0, steals: 0, blocks: 0, fouls: 0 },
  ];

  for (let i = 0; i < Math.min(homePlayers.length, 8); i++) {
    const stats = statsVariations[i];
    await prisma.boxScore.create({
      data: {
        gameId: game.id,
        playerId: homePlayers[i].id,
        teamId: 7,
        ...stats
      }
    });
  }

  // Away players with different stats
  const awayStats = [
    { points: 15, rebounds: 5, assists: 3, steals: 2, blocks: 0, fouls: 3 },
    { points: 11, rebounds: 4, assists: 6, steals: 1, blocks: 1, fouls: 2 },
    { points: 10, rebounds: 6, assists: 2, steals: 3, blocks: 2, fouls: 4 },
    { points: 9,  rebounds: 2, assists: 4, steals: 0, blocks: 0, fouls: 1 },
    { points: 5,  rebounds: 3, assists: 1, steals: 1, blocks: 1, fouls: 2 },
    { points: 3,  rebounds: 1, assists: 2, steals: 0, blocks: 0, fouls: 3 },
    { points: 1,  rebounds: 2, assists: 1, steals: 1, blocks: 0, fouls: 2 },
    { points: 0,  rebounds: 0, assists: 0, steals: 0, blocks: 0, fouls: 1 },
  ];

  for (let i = 0; i < Math.min(awayPlayers.length, 8); i++) {
    await prisma.boxScore.create({
      data: {
        gameId: game.id,
        playerId: awayPlayers[i].id,
        teamId: 11,
        ...awayStats[i]
      }
    });
  }

  console.log('Created BoxScore for', homePlayers.length + awayPlayers.length, 'players');
  console.log('Game ID:', game.id, '— save this for next steps');
}

main().catch(console.error).finally(() => prisma.$disconnect());
