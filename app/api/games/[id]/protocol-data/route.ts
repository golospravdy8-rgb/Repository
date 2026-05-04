import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EventEntry {
  id: number;
  type: string;
  playerId: number | null;
  teamId: number | null;
  points: number | null;
  quarter: number;
  createdAt: Date;
}

interface PlayerProtocol {
  playerId: number;
  number: number;
  firstName: string;
  lastName: string;
  isStarter: boolean;
  fouls: number;
  foulsByType: { P: number; U: number; T: number; D: number };
  foulTypes: string[];
  pointsByQuarter: Record<number, number>;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
}

interface TeamInfo {
  id: number;
  name: string;
  coachName: string | null;
  assistantCoach: string | null;
}

interface ProtocolData {
  game: {
    id: number;
    scheduledAt: string;
    status: string;
    homeScore: number;
    awayScore: number;
    quarter: number;
    venue: string | null;
    round: string | null;
    gameNumber: string | null;
    commissioner: string | null;
    referee: string | null;
    umpire1: string | null;
    umpire2: string | null;
    scorer: string | null;
    assistantScorer: string | null;
    timer: string | null;
    shotClockOperator: string | null;
    protest: boolean;
    protestNote: string | null;
  };
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homePlayers: PlayerProtocol[];
  awayPlayers: PlayerProtocol[];
  events: EventEntry[];
  quarterScores: { quarter: number; home: number; away: number }[];
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gameId = parseInt(params.id);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        events: { orderBy: { createdAt: "asc" } },
        boxScores: { include: { player: true } },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Helper to count fouls by type
    const getFoulsByType = (playerId: number): { P: number; U: number; T: number; D: number } => {
      return {
        P: game.events.filter(e => e.playerId === playerId && e.type === "FOUL").length,
        U: game.events.filter(e => e.playerId === playerId && e.type === "FOUL_UNSPORTSMANLIKE").length,
        T: game.events.filter(e => e.playerId === playerId && e.type === "FOUL_TECHNICAL").length,
        D: game.events.filter(e => e.playerId === playerId && e.type === "FOUL_DISQUALIFYING").length,
      };
    };

    // Get foul types in order (for scoresheet)
    const getFoulTypes = (playerId: number): string[] => {
      return game.events
        .filter(e => e.playerId === playerId &&
          ["FOUL","FOUL_UNSPORTSMANLIKE","FOUL_TECHNICAL","FOUL_DISQUALIFYING"].includes(e.type))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map(e => e.type);
    };

    // Get points by quarter
    const getPointsByQuarter = (playerId: number): Record<number, number> => {
      const pq: Record<number, number> = {};
      game.events.forEach(e => {
        if (e.playerId === playerId && e.type === "POINTS" && e.points) {
          pq[e.quarter] = (pq[e.quarter] || 0) + e.points;
        }
      });
      return pq;
    };

    const homePlayers: PlayerProtocol[] = (game.homeTeam.players as any[]).map((p: any) => {
      const boxScore = game.boxScores.find(bs => bs.playerId === p.id);
      const pointsByQuarter = getPointsByQuarter(p.id);
      const totalPoints = Object.values(pointsByQuarter).reduce((a, b) => a + b, 0);
      return {
        playerId: p.id,
        number: p.number,
        firstName: p.firstName,
        lastName: p.lastName,
        isStarter: boxScore?.isStarter ?? false,
        fouls: boxScore?.fouls ?? 0,
        foulsByType: getFoulsByType(p.id),
        foulTypes: getFoulTypes(p.id),
        pointsByQuarter,
        points: totalPoints,
        rebounds: boxScore?.rebounds ?? 0,
        assists: boxScore?.assists ?? 0,
        steals: boxScore?.steals ?? 0,
        blocks: boxScore?.blocks ?? 0,
      };
    });

    const awayPlayers: PlayerProtocol[] = (game.awayTeam.players as any[]).map((p: any) => {
      const boxScore = game.boxScores.find(bs => bs.playerId === p.id);
      const pointsByQuarter = getPointsByQuarter(p.id);
      const totalPoints = Object.values(pointsByQuarter).reduce((a, b) => a + b, 0);
      return {
        playerId: p.id,
        number: p.number,
        firstName: p.firstName,
        lastName: p.lastName,
        isStarter: boxScore?.isStarter ?? false,
        fouls: boxScore?.fouls ?? 0,
        foulsByType: getFoulsByType(p.id),
        foulTypes: getFoulTypes(p.id),
        pointsByQuarter,
        points: totalPoints,
        rebounds: boxScore?.rebounds ?? 0,
        assists: boxScore?.assists ?? 0,
        steals: boxScore?.steals ?? 0,
        blocks: boxScore?.blocks ?? 0,
      };
    });

    // Compute quarter scores from POINTS events
    const quarterScores: { quarter: number; home: number; away: number }[] = [];
    const scoreByQuarter: Record<number, { home: number; away: number }> = {};

    game.events.forEach(e => {
      if (e.type === "POINTS" && e.points) {
        if (!scoreByQuarter[e.quarter]) {
          scoreByQuarter[e.quarter] = { home: 0, away: 0 };
        }
        if (e.teamId === game.homeTeamId) {
          scoreByQuarter[e.quarter].home += e.points;
        } else {
          scoreByQuarter[e.quarter].away += e.points;
        }
      }
    });

    for (let q = 1; q <= 4; q++) {
      quarterScores.push({
        quarter: q,
        home: scoreByQuarter[q]?.home ?? 0,
        away: scoreByQuarter[q]?.away ?? 0,
      });
    }

    const data: ProtocolData = {
      game: {
        id: game.id,
        scheduledAt: game.scheduledAt.toISOString(),
        status: game.status,
        homeScore: quarterScores.reduce((sum, q) => sum + q.home, 0),
        awayScore: quarterScores.reduce((sum, q) => sum + q.away, 0),
        quarter: game.quarter,
        venue: game.venue,
        round: game.round,
        gameNumber: game.gameNumber,
        commissioner: game.commissioner,
        referee: game.referee,
        umpire1: game.umpire1,
        umpire2: game.umpire2,
        scorer: game.scorer,
        assistantScorer: game.assistantScorer,
        timer: game.timer,
        shotClockOperator: game.shotClockOperator,
        protest: game.protest,
        protestNote: game.protestNote,
      },
      homeTeam: {
        id: game.homeTeam.id,
        name: game.homeTeam.name,
        coachName: game.homeTeam.coachName,
        assistantCoach: game.homeTeam.assistantCoach,
      },
      awayTeam: {
        id: game.awayTeam.id,
        name: game.awayTeam.name,
        coachName: game.awayTeam.coachName,
        assistantCoach: game.awayTeam.assistantCoach,
      },
      homePlayers,
      awayPlayers,
      events: game.events,
      quarterScores,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("[protocol-data]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
