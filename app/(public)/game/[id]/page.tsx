import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import GamePdfButton from "@/components/public/GamePdfButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function gameTimeToSeconds(gameTime: string | null): number {
  if (!gameTime) return 0;
  const [min, sec] = gameTime.split(":").map(Number);
  return (min || 0) * 60 + (sec || 0);
}

function calcPlayerMinutes(
  playerId: number,
  teamId: number,
  substitutions: { playerId: number; teamId: number; action: string; gameTime: string | null; quarter?: number | null }[],
  isStarter: boolean
): string {
  const playerSubs = substitutions
    .filter((s) => s.playerId === playerId && s.teamId === teamId)
    .sort((a, b) => gameTimeToSeconds(a.gameTime) - gameTimeToSeconds(b.gameTime));

  let totalSeconds = 0;
  let entryTime: number | null = isStarter ? 0 : null;

  for (const sub of playerSubs) {
    const eventTime = gameTimeToSeconds(sub.gameTime);

    if (sub.action === "in") {
      entryTime = eventTime;
    } else if (sub.action === "out" && entryTime !== null) {
      totalSeconds += eventTime - entryTime;
      entryTime = null;
    }
  }

  // Якщо гравець залишився на майданчику (не замінений) — рахуй до кінця гри
  if (entryTime !== null) {
    totalSeconds += 600 - entryTime; // 600 = 10 хвилин на чверть (середній чемпіонат)
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function calcTeamStats(
  events: { type: string; teamId: number; playerId?: number | null; points?: number | null; quarter?: number }[],
  teamId: number
): {
  ptsOffTurnovers: number;
  ptsFastBreak: number;
  ptsSecondChance: number;
  ptsAfterSubs: number;
  maxLead: number;
  maxRun: number;
} {
  return {
    ptsOffTurnovers: 0,
    ptsFastBreak: 0,
    ptsSecondChance: 0,
    ptsAfterSubs: 0,
    maxLead: 0,
    maxRun: 0,
  };
}

function calcPlayerStats(
  events: { type: string; points?: number | null; playerId?: number | null; teamId: number; quarter: number }[],
  playerId: number
) {
  const pe = events.filter((e) => e.playerId === playerId);
  const fg2Made = pe.filter((e) => e.type === "POINTS" && e.points === 2).length;
  const fg2Miss = pe.filter((e) => e.type === "MISS_2P").length;
  const fg3Made = pe.filter((e) => e.type === "POINTS" && e.points === 3).length;
  const fg3Miss = pe.filter((e) => e.type === "MISS_3P").length;
  const ftMade = pe.filter((e) => e.type === "POINTS" && e.points === 1).length;
  const ftMiss = pe.filter((e) => e.type === "MISS_FT").length;
  const fg2Att = fg2Made + fg2Miss;
  const fg3Att = fg3Made + fg3Miss;
  const ftAtt = ftMade + ftMiss;
  const fgMade = fg2Made + fg3Made;
  const fgAtt = fg2Att + fg3Att;
  const points = fg2Made * 2 + fg3Made * 3 + ftMade;
  const reboundsOff = pe.filter((e) => e.type === "REBOUND_OFF").length;
  const reboundsDef = pe.filter((e) => e.type === "REBOUND_DEF" || e.type === "REBOUND").length;
  const rebounds = reboundsOff + reboundsDef;
  const assists = pe.filter((e) => e.type === "ASSIST").length;
  const steals = pe.filter((e) => e.type === "STEAL").length;
  const blocks = pe.filter((e) => e.type === "BLOCK").length;
  const turnovers = pe.filter((e) => e.type === "TURNOVER").length;
  const fouls = pe.filter((e) => ["FOUL", "FOUL_TECHNICAL", "FOUL_UNSPORTSMANLIKE"].includes(e.type)).length;
  const pct = (m: number, a: number) => (a > 0 ? `${Math.round((m / a) * 100)}%` : "-");

  // Calculate efficiency: (pts + reb + ast + stl + blk) - (fg_miss + ft_miss + tov)
  const fgMiss = pe.filter((e) => e.type === "MISS_2P" || e.type === "MISS_3P").length;
  const efficiency = (points + rebounds + assists + steals + blocks) - (fgMiss + ftMiss + turnovers);

  return {
    points, fg2Made, fg2Att, fg3Made, fg3Att, ftMade, ftAtt, fgMade, fgAtt,
    reboundsOff, reboundsDef, rebounds, assists, steals, blocks, turnovers, fouls,
    efficiency,
    fmtFg: fg2Att + fg3Att > 0 ? `${fgMade}-${fgAtt}` : "-",
    fmtFg2: fg2Att > 0 ? `${fg2Made}-${fg2Att}` : "-",
    fmtFg3: fg3Att > 0 ? `${fg3Made}-${fg3Att}` : "-",
    fmtFt: ftAtt > 0 ? `${ftMade}-${ftAtt}` : "-",
    pctFg: pct(fgMade, fgAtt),
    pctFg2: pct(fg2Made, fg2Att),
    pctFg3: pct(fg3Made, fg3Att),
    pctFt: pct(ftMade, ftAtt),
  };
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Next.js 15+: params is a Promise, need to await it
  const resolvedParams = await Promise.resolve(params);

  try {
    const gameId = parseInt(resolvedParams.id);
    if (isNaN(gameId)) {
      console.error(`[GamePage] Invalid game ID: ${resolvedParams.id}`);
      notFound();
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: true,
        awayTeam: true,
        events: {
          include: { player: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        boxScores: {
          include: { player: true, team: true },
        },
        substitutions: true,
      },
    }).catch(() => null);

    if (!game) notFound();

  const isLive = game.status === "LIVE";
  const isFinal = game.status === "FINAL";
  const isScheduled = game.status === "SCHEDULED";
  const hasScore = isFinal || isLive;

  // Quarter scores from events
  const quarterScores = [1, 2, 3, 4].map((q) => {
    const qPts = game.events.filter((e) => e.type === "POINTS" && e.quarter === q);
    return {
      quarter: q,
      home: qPts.filter((e) => e.teamId === game.homeTeamId).reduce((s, e) => s + (e.points ?? 0), 0),
      away: qPts.filter((e) => e.teamId === game.awayTeamId).reduce((s, e) => s + (e.points ?? 0), 0),
    };
  });

  type PlayerRow = { id: number; number: number; firstName: string; lastName: string; position: string | null; teamId: number; photoUrl: string | null };
  // Player rosters for SCHEDULED games
  const [homePlayers, awayPlayers]: [PlayerRow[], PlayerRow[]] = isScheduled
    ? await Promise.all([
        prisma.player.findMany({ where: { teamId: game.homeTeamId }, orderBy: { number: "asc" } }),
        prisma.player.findMany({ where: { teamId: game.awayTeamId }, orderBy: { number: "asc" } }),
      ])
    : [[], []];

  // Build per-player stats from events for LIVE/FINAL
  const g = game!;
  const buildTeamBoxScore = (teamId: number) => {
    const players = g.boxScores
      .filter((bs) => bs.teamId === teamId)
      .map((bs) => {
        const stats = calcPlayerStats(g.events, bs.playerId);
        // Fallback to stored box score values if no event-based stats
        const pts = stats.points > 0 ? stats.points : bs.points;
        const minutes = calcPlayerMinutes(bs.playerId, teamId, g.substitutions, bs.isStarter);
        return {
          bs,
          stats: { ...stats, points: pts },
          isStarter: bs.isStarter,
          minutes,
        };
      })
      .sort((a, b) => {
        if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
        return a.bs.player.number - b.bs.player.number;
      });

    const totals = players.reduce(
      (acc, { stats }) => ({
        points: acc.points + stats.points,
        fgMade: acc.fgMade + stats.fgMade,
        fgAtt: acc.fgAtt + stats.fgAtt,
        fg2Made: acc.fg2Made + stats.fg2Made,
        fg2Att: acc.fg2Att + stats.fg2Att,
        fg3Made: acc.fg3Made + stats.fg3Made,
        fg3Att: acc.fg3Att + stats.fg3Att,
        ftMade: acc.ftMade + stats.ftMade,
        ftAtt: acc.ftAtt + stats.ftAtt,
        reboundsOff: acc.reboundsOff + stats.reboundsOff,
        reboundsDef: acc.reboundsDef + stats.reboundsDef,
        rebounds: acc.rebounds + stats.rebounds,
        assists: acc.assists + stats.assists,
        steals: acc.steals + stats.steals,
        blocks: acc.blocks + stats.blocks,
        turnovers: acc.turnovers + stats.turnovers,
        fouls: acc.fouls + stats.fouls,
      }),
      { points: 0, fgMade: 0, fgAtt: 0, fg2Made: 0, fg2Att: 0, fg3Made: 0, fg3Att: 0, ftMade: 0, ftAtt: 0, reboundsOff: 0, reboundsDef: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 }
    );
    const p = (m: number, a: number) => a > 0 ? `${Math.round((m / a) * 100)}%` : "-";
    const teamStats = calcTeamStats(g.events, teamId);
    return {
      players,
      totals: {
        ...totals,
        fmtFg: `${totals.fgMade}-${totals.fgAtt}`,
        fmtFg2: `${totals.fg2Made}-${totals.fg2Att}`,
        fmtFg3: `${totals.fg3Made}-${totals.fg3Att}`,
        fmtFt: `${totals.ftMade}-${totals.ftAtt}`,
        pctFg: p(totals.fgMade, totals.fgAtt),
        pctFg2: p(totals.fg2Made, totals.fg2Att),
        pctFg3: p(totals.fg3Made, totals.fg3Att),
        pctFt: p(totals.ftMade, totals.ftAtt),
      },
      teamStats,
    };
  };

  const homeBox = hasScore ? buildTeamBoxScore(game.homeTeamId) : null;
  const awayBox = hasScore ? buildTeamBoxScore(game.awayTeamId) : null;

  const homeWins = hasScore && game.homeScore > game.awayScore;
  const awayWins = hasScore && game.awayScore > game.homeScore;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Score header */}
      <div className="bg-white rounded-xl shadow overflow-hidden mb-3">
        <div
          className="px-4 py-2 flex items-center justify-between text-white text-xs"
          style={{ backgroundColor: "#1a2744" }}
        >
          <span className="font-semibold">
            {new Date(game.scheduledAt).toLocaleDateString("uk-UA", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {isScheduled && (
              <span className="ml-2 opacity-75">
                {new Date(game.scheduledAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                LIVE • Q{game.quarter}
              </span>
            )}
            {isFinal && (
              <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">ФІНАЛ</span>
            )}
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <div
                className="font-black text-base leading-tight"
                style={{ color: homeWins ? "#f97316" : "#1f2937" }}
              >
                {game.homeTeam.name}
              </div>
              <div className="text-gray-400 text-xs mt-0.5">{game.homeTeam.shortName}</div>
            </div>
            <div className="text-center flex-shrink-0">
              {hasScore ? (
                <div className="text-3xl font-black leading-none" style={{ color: "#1a2744" }}>
                  {game.homeScore} : {game.awayScore}
                </div>
              ) : (
                <div className="text-xl font-bold text-gray-300">VS</div>
              )}
              {isLive && (
                <div className="text-xs text-gray-500 mt-1">Чверть {game.quarter}</div>
              )}
              {isFinal && (
                <div className="text-xs text-gray-400 mt-0.5">ФІНАЛ</div>
              )}
            </div>
            <div className="flex-1 text-center">
              <div
                className="font-black text-base leading-tight"
                style={{ color: awayWins ? "#f97316" : "#1f2937" }}
              >
                {game.awayTeam.name}
              </div>
              <div className="text-gray-400 text-xs mt-0.5">{game.awayTeam.shortName}</div>
            </div>
          </div>

          {/* Quarter scores */}
          {hasScore && quarterScores.some((q) => q.home > 0 || q.away > 0) && (
            <div className="mt-2 flex justify-center gap-1.5 flex-wrap">
              {quarterScores.filter((q) => q.home > 0 || q.away > 0).map((q) => (
                <div
                  key={q.quarter}
                  className="text-xs bg-gray-50 border border-gray-100 rounded px-2 py-1 text-center"
                >
                  <span className="text-gray-400 font-medium">Q{q.quarter} </span>
                  <span className="font-bold text-gray-700">{q.home}–{q.away}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF Download button */}
      {hasScore && homeBox && awayBox && (
        <div className="flex justify-center gap-3 mb-3 flex-wrap">
          <GamePdfButton
            data={{
              id: game.id,
              scheduledAt: game.scheduledAt.toISOString(),
              homeScore: game.homeScore,
              awayScore: game.awayScore,
              status: game.status,
              homeTeam: { name: game.homeTeam.name, shortName: game.homeTeam.shortName, coachName: game.homeTeam.coachName ?? undefined, assistantCoach: game.homeTeam.assistantCoach ?? undefined },
              awayTeam: { name: game.awayTeam.name, shortName: game.awayTeam.shortName, coachName: game.awayTeam.coachName ?? undefined, assistantCoach: game.awayTeam.assistantCoach ?? undefined },
              homeBox: {
                players: homeBox.players.map(({ bs, stats, isStarter, minutes }) => ({
                  number: bs.player.number,
                  lastName: bs.player.lastName,
                  firstName: bs.player.firstName,
                  position: bs.player.position ?? null,
                  isStarter,
                  minutes,
                  stats,
                })),
                totals: homeBox.totals,
              },
              awayBox: {
                players: awayBox.players.map(({ bs, stats, isStarter, minutes }) => ({
                  number: bs.player.number,
                  lastName: bs.player.lastName,
                  firstName: bs.player.firstName,
                  position: bs.player.position ?? null,
                  isStarter,
                  minutes,
                  stats,
                })),
                totals: awayBox.totals,
              },
              homeStats: homeBox.teamStats,
              awayStats: awayBox.teamStats,
              commissioner: game.commissioner ?? undefined,
              referee1: game.referee1 ?? undefined,
              referee2: game.referee2 ?? undefined,
              referee3: game.referee3 ?? undefined,
              venue: game.venue ?? undefined,
              round: game.round ?? undefined,
              quarterScores,
            }}
          />
          <a
            href={`/game/${game.id}/secretarial-protocol`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition"
          >
            📋 Протокол ФБУ
          </a>
        </div>
      )}

      {/* SCHEDULED: show rosters */}
      {isScheduled && (homePlayers.length > 0 || awayPlayers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {[
            { team: game.homeTeam, players: homePlayers },
            { team: game.awayTeam, players: awayPlayers },
          ].map(({ team, players }) => (
            <div key={team.id} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-4 py-3 font-bold text-white text-sm" style={{ backgroundColor: "#1a2744" }}>
                {team.name}
              </div>
              {players.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {players.map((p) => (
                    <div key={p.id} className="px-4 py-2 flex items-center gap-3 text-sm">
                      <span className="w-8 text-center text-gray-400 font-bold">#{p.number}</span>
                      <span className="flex-1 font-medium text-gray-800">{p.firstName} {p.lastName}</span>
                      {p.position && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{p.position}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">Склад не заповнено</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LIVE / FINAL: Full Box Score */}
      {hasScore && homeBox && awayBox && (
        <div className="space-y-3 mb-3">
          {[
            { team: game.homeTeam, box: homeBox, score: game.homeScore, wins: homeWins },
            { team: game.awayTeam, box: awayBox, score: game.awayScore, wins: awayWins },
          ].map(({ team, box, wins }) => (
            <div key={team.id} className="bg-white rounded-xl shadow overflow-hidden">
              <div
                className="px-3 py-1.5 font-bold text-white text-xs flex items-center gap-2"
                style={{ backgroundColor: "#1a2744" }}
              >
                <span>{team.name}</span>
                {wins && <span className="ml-auto text-xs bg-orange-500 px-1.5 py-0.5 rounded-full">Переможець</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontSize: "11px" }}>
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-gray-500 uppercase" style={{ fontSize: "10px" }}>
                      <th className="px-1.5 py-1 text-left w-6">№</th>
                      <th className="px-1.5 py-1 text-left">Гравець</th>
                      <th className="px-1.5 py-1 text-center">Поз</th>
                      <th className="px-1.5 py-1 text-center">Хв</th>
                      <th className="px-1.5 py-1 text-center font-black text-gray-700">Оч</th>
                      <th className="px-1.5 py-1 text-center">КП</th>
                      <th className="px-1.5 py-1 text-center text-gray-400">%</th>
                      <th className="px-1.5 py-1 text-center">2О</th>
                      <th className="px-1.5 py-1 text-center text-gray-400">%</th>
                      <th className="px-1.5 py-1 text-center">3О</th>
                      <th className="px-1.5 py-1 text-center text-gray-400">%</th>
                      <th className="px-1.5 py-1 text-center">ШТ</th>
                      <th className="px-1.5 py-1 text-center text-gray-400">%</th>
                      <th className="px-1.5 py-1 text-center">НПД</th>
                      <th className="px-1.5 py-1 text-center">ЗПД</th>
                      <th className="px-1.5 py-1 text-center">ПДБ</th>
                      <th className="px-1.5 py-1 text-center">ПЕР</th>
                      <th className="px-1.5 py-1 text-center">ВТ</th>
                      <th className="px-1.5 py-1 text-center">БЛК</th>
                      <th className="px-1.5 py-1 text-center">ФОЛ</th>
                      <th className="px-1.5 py-1 text-center font-bold text-blue-600">ЕФК</th>
                      <th className="px-1.5 py-1 text-center font-bold text-orange-600">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {box.players.flatMap(({ bs, stats, isStarter }, i) => {
                      const prevIsStarter = i > 0 ? box.players[i - 1].isStarter : true;
                      const showBench = !isStarter && prevIsStarter;
                      const rows = [];

                      if (showBench) {
                        rows.push(
                          <tr key={`bench-${bs.id}`} className="bg-gray-50">
                            <td colSpan={20} className="px-2 py-0.5 text-gray-400 font-semibold uppercase tracking-wider" style={{ fontSize: "9px" }}>
                              Лавка
                            </td>
                          </tr>
                        );
                      }

                      rows.push(
                        <tr key={bs.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-1.5 py-1 text-gray-400 font-medium">
                            {isStarter && <span className="text-orange-400 mr-0.5">*</span>}
                            {bs.player.number}
                          </td>
                          <td className="px-1.5 py-1 font-semibold text-gray-800 whitespace-nowrap">
                            {bs.player.lastName} {bs.player.firstName[0]}.
                          </td>
                          <td className="px-1.5 py-1 text-center text-gray-400">{bs.player.position ?? "-"}</td>
                          <td className="px-1.5 py-1 text-center text-gray-400">{bs.minutes || "-"}</td>
                          <td className="px-1.5 py-1 text-center font-black" style={{ color: "#1a2744" }}>{stats.points}</td>
                          <td className="px-1.5 py-1 text-center text-gray-600">{stats.fmtFg}</td>
                          <td className="px-1.5 py-1 text-center text-gray-400">{stats.pctFg}</td>
                          <td className="px-1.5 py-1 text-center text-gray-600">{stats.fmtFg2}</td>
                          <td className="px-1.5 py-1 text-center text-gray-400">{stats.pctFg2}</td>
                          <td className="px-1.5 py-1 text-center text-gray-600">{stats.fmtFg3}</td>
                          <td className="px-1.5 py-1 text-center text-gray-400">{stats.pctFg3}</td>
                          <td className="px-1.5 py-1 text-center text-gray-600">{stats.fmtFt}</td>
                          <td className="px-1.5 py-1 text-center text-gray-400">{stats.pctFt}</td>
                          <td className="px-1.5 py-1 text-center text-gray-600">{stats.reboundsOff || "-"}</td>
                          <td className="px-1.5 py-1 text-center text-gray-600">{stats.reboundsDef || "-"}</td>
                          <td className="px-1.5 py-1 text-center text-gray-600">{stats.rebounds || "-"}</td>
                          <td className="px-1.5 py-1 text-center text-gray-600">{stats.assists || "-"}</td>
                          <td className="px-1.5 py-1 text-center text-gray-600">{stats.turnovers || "-"}</td>
                          <td className="px-1.5 py-1 text-center text-gray-600">{stats.blocks || "-"}</td>
                          <td className="px-1.5 py-1 text-center text-red-500">{stats.fouls || "-"}</td>
                          <td className="px-1.5 py-1 text-center font-bold text-blue-600">{stats.efficiency || "0"}</td>
                          <td className="px-1.5 py-1 text-center font-bold text-orange-600">{bs.plusMinus >= 0 ? "+" : ""}{bs.plusMinus || "0"}</td>
                        </tr>
                      );

                      return rows;
                    })}
                    {/* Totals row */}
                    <tr className="bg-slate-50 font-bold border-t border-gray-200">
                      <td className="px-1.5 py-1 text-gray-500">Σ</td>
                      <td className="px-1.5 py-1 text-gray-700 uppercase">Разом</td>
                      <td></td>
                      <td></td>
                      <td className="px-1.5 py-1 text-center font-black" style={{ color: "#1a2744" }}>{box.totals.points}</td>
                      <td className="px-1.5 py-1 text-center text-gray-600">{box.totals.fmtFg}</td>
                      <td className="px-1.5 py-1 text-center text-gray-500">{box.totals.pctFg}</td>
                      <td className="px-1.5 py-1 text-center text-gray-600">{box.totals.fmtFg2}</td>
                      <td className="px-1.5 py-1 text-center text-gray-500">{box.totals.pctFg2}</td>
                      <td className="px-1.5 py-1 text-center text-gray-600">{box.totals.fmtFg3}</td>
                      <td className="px-1.5 py-1 text-center text-gray-500">{box.totals.pctFg3}</td>
                      <td className="px-1.5 py-1 text-center text-gray-600">{box.totals.fmtFt}</td>
                      <td className="px-1.5 py-1 text-center text-gray-500">{box.totals.pctFt}</td>
                      <td className="px-1.5 py-1 text-center text-gray-700">{box.totals.reboundsOff}</td>
                      <td className="px-1.5 py-1 text-center text-gray-700">{box.totals.reboundsDef}</td>
                      <td className="px-1.5 py-1 text-center text-gray-700">{box.totals.rebounds}</td>
                      <td className="px-1.5 py-1 text-center text-gray-700">{box.totals.assists}</td>
                      <td className="px-1.5 py-1 text-center text-gray-700">{box.totals.turnovers}</td>
                      <td className="px-1.5 py-1 text-center text-gray-700">{box.totals.blocks}</td>
                      <td className="px-1.5 py-1 text-center text-red-500">{box.totals.fouls}</td>
                      <td className="px-1.5 py-1 text-center text-gray-600">—</td>
                      <td className="px-1.5 py-1 text-center text-gray-600">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Team Advanced Statistics Section */}
          <div className="space-y-3 mb-3">
            {[
              { team: game.homeTeam, stats: game, isHome: true },
              { team: game.awayTeam, stats: game, isHome: false },
            ].map(({ team, stats, isHome }) => (
              <div key={team.id} className="bg-white rounded-xl shadow overflow-hidden">
                <div
                  className="px-3 py-1.5 font-bold text-white text-xs flex items-center gap-2"
                  style={{ backgroundColor: "#1a2744" }}
                >
                  <span>РОЗШИРЕНА СТАТИСТИКА · {team.name}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3" style={{ fontSize: "12px" }}>
                  <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                    <div className="text-gray-500 text-xs font-semibold uppercase leading-tight mb-1">Очки після втрат</div>
                    <div className="font-black text-lg" style={{ color: "#1a2744" }}>
                      {isHome ? stats.ptsOffTurnovers : stats.awayPtsOffTurnovers}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                    <div className="text-gray-500 text-xs font-semibold uppercase leading-tight mb-1">Відриву</div>
                    <div className="font-black text-lg text-green-600">
                      {isHome ? stats.ptsFastBreak : stats.awayPtsFastBreak}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                    <div className="text-gray-500 text-xs font-semibold uppercase leading-tight mb-1">Другий шанс</div>
                    <div className="font-black text-lg text-amber-600">
                      {isHome ? stats.ptsSecondChance : stats.awayPtsSecondChance}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                    <div className="text-gray-500 text-xs font-semibold uppercase leading-tight mb-1">Після замін</div>
                    <div className="font-black text-lg text-blue-600">
                      {isHome ? stats.ptsAfterSubstitutions : stats.awayPtsAfterSubstitutions}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                    <div className="text-gray-500 text-xs font-semibold uppercase leading-tight mb-1">Найбільша переваги</div>
                    <div className="font-black text-lg text-orange-600">
                      +{isHome ? stats.biggestLead : stats.awayBiggestLead}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                    <div className="text-gray-500 text-xs font-semibold uppercase leading-tight mb-1">Найдовший забіг</div>
                    <div className="font-black text-lg text-purple-600">
                      {isHome ? stats.biggestRun : stats.awayBiggestRun}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="text-gray-400 px-1 leading-relaxed" style={{ fontSize: "10px" }}>
            КП — кидки з поля | 2О — двоочкові | 3О — триочкові |
            ШТ — штрафні | НПД — підбір напад | ЗПД — підбір захист |
            ПДБ — підбори | ПЕР — передачі | ВТ — втрати | БЛК — блоки | ФОЛ — фоли | ЕФК — ефективність | +/- — плюс/мінус | * — стартовий
          </div>
        </div>
      )}

      {/* Events log */}
      {game.events.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden mb-3">
          <div className="px-4 py-2 text-white font-bold text-xs" style={{ backgroundColor: "#1a2744" }}>
            Протокол подій
          </div>
          <div className="divide-y max-h-56 overflow-y-auto">
            {game.events.map((event) => (
              <div key={event.id} className="px-4 py-1.5 flex items-center gap-2 text-xs">
                <span className="text-gray-400 w-6 flex-shrink-0">Q{event.quarter}</span>
                {event.type === "POINTS" && (
                  <span
                    className="font-bold px-2 py-0.5 rounded text-white text-xs"
                    style={{ backgroundColor: event.points === 3 ? "#1a2744" : event.points === 2 ? "#f97316" : "#3b82f6" }}
                  >
                    +{event.points}
                  </span>
                )}
                {event.type === "FOUL" && <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded text-xs">ФОЛ</span>}
                {event.type === "FOUL_TECHNICAL" && <span className="bg-red-200 text-red-700 font-bold px-2 py-0.5 rounded text-xs">ТЕХН.ФОЛ</span>}
                {event.type === "FOUL_UNSPORTSMANLIKE" && <span className="bg-red-300 text-red-800 font-bold px-2 py-0.5 rounded text-xs">НЕСПОРТ.</span>}
                {event.type === "REBOUND_OFF" && <span className="bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded text-xs">НПД</span>}
                {event.type === "REBOUND_DEF" && <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-xs">ЗПД</span>}
                {event.type === "REBOUND" && <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-xs">ПДБ</span>}
                {event.type === "TURNOVER" && <span className="bg-pink-100 text-pink-600 font-bold px-2 py-0.5 rounded text-xs">ВТРАТА</span>}
                {event.type === "ASSIST" && <span className="bg-green-100 text-green-600 font-bold px-2 py-0.5 rounded text-xs">ПЕР</span>}
                {event.type === "STEAL" && <span className="bg-purple-100 text-purple-600 font-bold px-2 py-0.5 rounded text-xs">ПЕРЕХВАТ</span>}
                {event.type === "BLOCK" && <span className="bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded text-xs">БЛК</span>}
                {event.type === "MISS_2P" && <span className="bg-gray-100 text-gray-400 font-bold px-2 py-0.5 rounded text-xs">×2О</span>}
                {event.type === "MISS_3P" && <span className="bg-gray-100 text-gray-400 font-bold px-2 py-0.5 rounded text-xs">×3О</span>}
                {event.type === "MISS_FT" && <span className="bg-gray-100 text-gray-400 font-bold px-2 py-0.5 rounded text-xs">×ШТ</span>}
                {event.type === "TIMEOUT" && <span className="bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded text-xs">ТАЙМ-АУТ</span>}
                {event.type === "QUARTER_END" && <span className="bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded text-xs">КІНЕЦЬ ЧВЕРТІ</span>}
                {event.player && (
                  <span className="text-gray-700 font-medium">
                    #{event.player.number} {event.player.firstName} {event.player.lastName}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
  } catch (error) {
    const gameId = typeof resolvedParams?.id === 'string' ? resolvedParams.id : 'unknown';
    console.error(`[GamePage] Error loading game ${gameId}:`, {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : null,
    });
    notFound();
  }
}
