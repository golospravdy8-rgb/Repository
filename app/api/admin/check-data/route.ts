import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
  try {
    const [players, games, boxScores, events, vipParents, admins] = await Promise.all([
      prisma.player.findMany({ take: 5, include: { team: true } }),
      prisma.game.findMany({ take: 5, include: { homeTeam: true, awayTeam: true } }),
      prisma.boxScore.findMany({ take: 5, include: { player: true } }),
      prisma.gameEvent.findMany({ take: 5, include: { player: true } }),
      prisma.guestContact.findMany({ where: { role: "vip" }, take: 3 }),
      prisma.guestContact.findMany({ where: { role: "admin" }, take: 3 }),
    ]);

    return NextResponse.json({
      playersCount: players.length,
      players: players.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, number: p.number, team: p.team.name })),
      gamesCount: games.length,
      games: games.map((g) => ({ id: g.id, home: g.homeTeam.shortName, away: g.awayTeam.shortName, score: `${g.homeScore}:${g.awayScore}` })),
      boxScoresCount: boxScores.length,
      boxScores: boxScores.map((bs) => ({ playerId: bs.playerId, playerName: bs.player.firstName, points: bs.points, rebounds: bs.rebounds, assists: bs.assists })),
      eventsCount: events.length,
      vipParentsCount: vipParents.length,
      vipParents: vipParents.map((p) => ({ phone: p.phone, name: `${p.firstName} ${p.lastName}`, role: p.role })),
      adminsCount: admins.length,
      admins: admins.map((a) => ({ phone: a.phone, name: `${a.firstName} ${a.lastName}`, id: a.id })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
