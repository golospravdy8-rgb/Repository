import type { BoxScore, Game, Standing } from "@prisma/client";
import { getRatingTier } from "@/lib/achievements";

export type LeaderStats = {
  playerId: number;
  firstName: string;
  lastName: string;
  teamName: string;
  teamShortName: string;
  photoUrl: string | null;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  val: number;
  gamesPlayed: number;
  rating: number;
  tier: "gold" | "silver" | "bronze";
};

export function calculateVAL(boxScore: BoxScore): number {
  return (
    boxScore.points +
    boxScore.rebounds +
    boxScore.assists +
    boxScore.steals +
    boxScore.blocks -
    boxScore.fouls
  );
}

type BoxScoreWithPlayer = BoxScore & {
  player: { firstName: string; lastName: string; photoUrl: string | null };
  team: { name: string; shortName: string };
};

export function calculateLeaderStats(boxScores: BoxScoreWithPlayer[]): LeaderStats[] {
  const playerMap = new Map<number, {
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    teamName: string;
    teamShortName: string;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    fouls: number;
    games: number;
  }>();

  for (const bs of boxScores) {
    const existing = playerMap.get(bs.playerId);
    if (existing) {
      existing.points += bs.points;
      existing.rebounds += bs.rebounds;
      existing.assists += bs.assists;
      existing.steals += bs.steals;
      existing.blocks += bs.blocks;
      existing.fouls += bs.fouls;
      existing.games += 1;
    } else {
      playerMap.set(bs.playerId, {
        firstName: bs.player.firstName,
        lastName: bs.player.lastName,
        photoUrl: bs.player.photoUrl,
        teamName: bs.team.name,
        teamShortName: bs.team.shortName,
        points: bs.points,
        rebounds: bs.rebounds,
        assists: bs.assists,
        steals: bs.steals,
        blocks: bs.blocks,
        fouls: bs.fouls,
        games: 1,
      });
    }
  }

  const stats: LeaderStats[] = [];
  for (const [playerId, data] of Array.from(playerMap.entries())) {
    const g = data.games || 1;
    const ppg = data.points / g;
    const rpg = data.rebounds / g;
    const apg = data.assists / g;
    const spg = data.steals / g;
    const bpg = data.blocks / g;

    // Rating formula: base 50 + weighted stats
    // ppg: 1.8x, rpg: 1.2x, apg: 1.5x, spg: 2.0x, bpg: 1.8x
    const rating = Math.min(99, Math.round(50 + ppg * 1.8 + rpg * 1.2 + apg * 1.5 + spg * 2.0 + bpg * 1.8));
    const tier = getRatingTier(rating);

    // VAL (Value) = PTS + REB + AST + STL + BLK - FOULS (per game)
    const val = Math.round(((data.points + data.rebounds + data.assists + data.steals + data.blocks - data.fouls) / g) * 10) / 10;

    stats.push({
      playerId,
      firstName: data.firstName,
      lastName: data.lastName,
      teamName: data.teamName,
      teamShortName: data.teamShortName,
      photoUrl: data.photoUrl,
      ppg: Math.round(ppg * 10) / 10,
      rpg: Math.round(rpg * 10) / 10,
      apg: Math.round(apg * 10) / 10,
      spg: Math.round(spg * 10) / 10,
      bpg: Math.round(bpg * 10) / 10,
      val,
      gamesPlayed: data.games,
      rating,
      tier,
    });
  }

  // Sort by rating (descending), then by VAL (descending) for tie-breaking
  return stats.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.val - a.val;
  });
}

type GameWithTeams = Game & {
  homeTeam: { id: number };
  awayTeam: { id: number };
};

export function calculateStandings(
  games: GameWithTeams[],
  teamIds: number[],
  seasonId: number
): Omit<Standing, "id">[] {
  const map = new Map<number, Omit<Standing, "id">>();

  for (const teamId of teamIds) {
    map.set(teamId, {
      teamId,
      seasonId,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      gamesPlayed: 0,
      rank: null,
    });
  }

  for (const game of games) {
    if (game.status !== "FINAL") continue;

    const home = map.get(game.homeTeamId);
    const away = map.get(game.awayTeamId);

    if (home) {
      home.gamesPlayed++;
      home.pointsFor += game.homeScore;
      home.pointsAgainst += game.awayScore;
      if (game.homeScore > game.awayScore) home.wins++;
      else home.losses++;
    }

    if (away) {
      away.gamesPlayed++;
      away.pointsFor += game.awayScore;
      away.pointsAgainst += game.homeScore;
      if (game.awayScore > game.homeScore) away.wins++;
      else away.losses++;
    }
  }

  const standings = Array.from(map.values());

  return standings.sort((a, b) => {
    // 1. Спочатку за % перемог
    const winPctA = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
    const winPctB = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
    if (Math.abs(winPctB - winPctA) > 0.0001) return winPctB - winPctA;

    // 2. Якщо однакові % — за кількістю перемог
    if (b.wins !== a.wins) return b.wins - a.wins;

    // 3. Якщо однакові перемоги — за різницею очок
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    return diffB - diffA;
  });
}
