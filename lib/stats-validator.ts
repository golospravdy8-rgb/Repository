import { prisma } from "@/lib/prisma";

export async function validateGameCompletion(gameId: number) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      boxScores: true,
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  });

  if (!game) throw new Error(`Game ${gameId} not found`);

  const rosterCount = game.homeTeam.players.length + game.awayTeam.players.length;
  const statsCount = game.boxScores.length;

  if (statsCount < rosterCount) {
    const missing = rosterCount - statsCount;
    throw new Error(
      `Cannot complete game: ${statsCount} players with stats, ${rosterCount} expected. Missing: ${missing}`
    );
  }

  // Check for NULL fields
  const incomplete = game.boxScores.filter(
    (bs) => bs.points === null || bs.rebounds === null
  );

  if (incomplete.length > 0) {
    throw new Error(
      `Game ${gameId}: ${incomplete.length} players have NULL stat fields`
    );
  }

  return {
    valid: true,
    rosterCount,
    statsCount,
    message: `All ${rosterCount} players have statistics recorded`,
  };
}
