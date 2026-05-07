import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SecretarialProtocol from "@/components/SecretarialProtocol";
import ProtocolPdfButton from "@/components/ProtocolPdfButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SecretarialProtocolPage({ params }: { params: { id: string } }) {
  const gameId = parseInt(params.id);
  if (isNaN(gameId)) notFound();

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
      events: { orderBy: { createdAt: "asc" } },
      boxScores: { include: { player: true } },
    },
  });

  // Ensure all FIBA protocol fields are present (they should be from schema)
  if (game) {
    game.commissioner = game.commissioner || "";
    game.referee = game.referee || "";
    game.umpire1 = game.umpire1 || "";
    game.umpire2 = game.umpire2 || "";
    game.scorer = game.scorer || "";
    game.assistantScorer = game.assistantScorer || "";
    game.timer = game.timer || "";
    game.shotClockOperator = game.shotClockOperator || "";
    game.gameNumber = game.gameNumber || "";
    game.venue = game.venue || "";
    game.round = game.round || "";
    game.protestNote = game.protestNote || "";
  }

  if (!game) notFound();

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

  // Build player lists
  const homePlayers = (game.homeTeam.players as any[]).map(p => {
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

  const awayPlayers = (game.awayTeam.players as any[]).map(p => {
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

  // Compute quarter scores
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

  const protocolData = {
    game: {
      id: game.id,
      scheduledAt: game.scheduledAt.toISOString(),
      status: game.status,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-4 flex gap-2 justify-center">
          <ProtocolPdfButton data={protocolData} />
        </div>
        <SecretarialProtocol data={protocolData} gameId={gameId} />
      </div>
    </div>
  );
}
