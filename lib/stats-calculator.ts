import type { BoxScore, Game, Standing } from "@prisma/client";

export type LeaderStats = {
  playerId: number;
  firstName: string;
  lastName: string;
  teamName: string;
  teamShortName: string;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  val: number;
  gamesPlayed: number;
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
  player: { firstName: string; lastName: string };
  team: { name: string; shortName: string };
};

export function calculateLeaderStats(boxScores: BoxScoreWithPlayer[]): LeaderStats[] {
  const playerMap = new Map<number, {
    firstName: string;
    lastName: string;
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
    stats.push({
      playerId,
      firstName: data.firstName,
      lastName: data.lastName,
      teamName: data.teamName,
      teamShortName: data.teamShortName,
      ppg: Math.round((data.points / g) * 10) / 10,
      rpg: Math.round((data.rebounds / g) * 10) / 10,
      apg: Math.round((data.assists / g) * 10) / 10,
      spg: Math.round((data.steals / g) * 10) / 10,
      bpg: Math.round((data.blocks / g) * 10) / 10,
      val: Math.round(((data.points + data.rebounds + data.assists + data.steals + data.blocks - data.fouls) / g) * 10) / 10,
      gamesPlayed: data.games,
    });
  }

  return stats;
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

  return Array.from(map.values()).sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);
}
