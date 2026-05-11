import type { BoxScore, Game, Standing } from "@prisma/client";
import { getRatingTier as getAchievementTier } from "@/lib/achievements";
import { getRatingTier, calculateRating, calculateKKD, computeLeaderMetrics } from "@/lib/leaders/calculations";
import type { LeaderStats } from "@/lib/leaders/types";

export type { LeaderStats } from "@/lib/leaders/types";

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
  team: { name: string; shortName: string; id: number };
};

export function calculateLeaderStats(boxScores: BoxScoreWithPlayer[]): LeaderStats[] {
  const playerMap = new Map<number, {
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    teamName: string;
    teamShortName: string;
    teamId: number;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    fouls: number;
    turnovers: number;
    fg2Made: number;
    fg2Attempted: number;
    fg3Made: number;
    fg3Attempted: number;
    ftMade: number;
    ftAttempted: number;
    timeOnCourtSeconds: number;
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
      existing.fouls += bs.foulsPersonal;
      existing.turnovers += bs.turnovers;
      existing.fg2Made += bs.fg2Made;
      existing.fg2Attempted += bs.fg2Attempted;
      existing.fg3Made += bs.fg3Made;
      existing.fg3Attempted += bs.fg3Attempted;
      existing.ftMade += bs.ftMade;
      existing.ftAttempted += bs.ftAttempted;
      existing.timeOnCourtSeconds += bs.timeOnCourtSeconds;
      existing.games += 1;
    } else {
      playerMap.set(bs.playerId, {
        firstName: bs.player.firstName,
        lastName: bs.player.lastName,
        photoUrl: bs.player.photoUrl,
        teamName: bs.team.name,
        teamShortName: bs.team.shortName,
        teamId: bs.team.id,
        points: bs.points,
        rebounds: bs.rebounds,
        assists: bs.assists,
        steals: bs.steals,
        blocks: bs.blocks,
        fouls: bs.foulsPersonal,
        turnovers: bs.turnovers,
        fg2Made: bs.fg2Made,
        fg2Attempted: bs.fg2Attempted,
        fg3Made: bs.fg3Made,
        fg3Attempted: bs.fg3Attempted,
        ftMade: bs.ftMade,
        ftAttempted: bs.ftAttempted,
        timeOnCourtSeconds: bs.timeOnCourtSeconds,
        games: 1,
      });
    }
  }

  const stats: LeaderStats[] = [];
  for (const [playerId, data] of Array.from(playerMap.entries())) {
    const metrics = computeLeaderMetrics({
      points: data.points,
      rebounds: data.rebounds,
      assists: data.assists,
      steals: data.steals,
      blocks: data.blocks,
      fouls: data.fouls,
      fg2Made: data.fg2Made,
      fg2Attempted: data.fg2Attempted,
      fg3Made: data.fg3Made,
      fg3Attempted: data.fg3Attempted,
      ftMade: data.ftMade,
      ftAttempted: data.ftAttempted,
      timeOnCourtSeconds: data.timeOnCourtSeconds,
      games: data.games,
    });

    stats.push({
      playerId,
      firstName: data.firstName,
      lastName: data.lastName,
      teamName: data.teamName,
      teamShortName: data.teamShortName,
      teamId: data.teamId,
      photoUrl: data.photoUrl,
      ...metrics,
      gamesPlayed: data.games,
      seasonId: 0, // буде заповнено на сторінці
    });
  }

  // Sort by rating (descending), then by ККД (descending) for tie-breaking
  return stats.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.kkd - a.kkd;
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
