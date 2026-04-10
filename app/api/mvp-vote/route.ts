import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

interface PlayerRow {
  id: number;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  position: string | null;
  teamName: string | null;
}

interface MvpPlayer {
  id: number;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  position: string | null;
  team: { name: string };
}

function toMvpPlayer(r: PlayerRow): MvpPlayer {
  return {
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    photoUrl: r.photoUrl,
    position: r.position,
    team: { name: r.teamName ?? "" },
  };
}

async function getPlayerById(id: number): Promise<MvpPlayer | null> {
  const rows = await prisma.$queryRawUnsafe<PlayerRow[]>(
    `SELECT p.id, p."firstName", p."lastName", p."photoUrl", p.position, t.name as "teamName"
     FROM "Player" p LEFT JOIN "Team" t ON t.id = p."teamId"
     WHERE p.id = $1 LIMIT 1`,
    id
  );
  return rows.length > 0 ? toMvpPlayer(rows[0]) : null;
}

async function getPlayersByIds(ids: number[]): Promise<MvpPlayer[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const rows = await prisma.$queryRawUnsafe<PlayerRow[]>(
    `SELECT p.id, p."firstName", p."lastName", p."photoUrl", p.position, t.name as "teamName"
     FROM "Player" p LEFT JOIN "Team" t ON t.id = p."teamId"
     WHERE p.id IN (${placeholders})`,
    ...ids
  );
  return rows.map(toMvpPlayer);
}

async function buildLeader(month: string) {
  const voteCounts = await prisma.$queryRawUnsafe<{ player_id: number; cnt: string }[]>(
    `SELECT "playerId" as player_id, COUNT(*) as cnt FROM "ChatMvpVote" WHERE month = $1 GROUP BY "playerId" ORDER BY cnt DESC LIMIT 1`,
    month
  );

  if (voteCounts.length === 0) return null;

  const topId = Number(voteCounts[0].player_id);
  const player = await getPlayerById(topId);
  if (!player) return null;

  const breakdown = await prisma.$queryRawUnsafe<{ chat_tab: string; cnt: string }[]>(
    `SELECT "chatTab" as chat_tab, COUNT(*) as cnt FROM "ChatMvpVote" WHERE month = $1 AND "playerId" = $2 GROUP BY "chatTab"`,
    month, topId
  );
  const votesByChat = { balacka: 0, batky: 0 };
  for (const b of breakdown) {
    if (b.chat_tab === "balacka") votesByChat.balacka = Number(b.cnt);
    if (b.chat_tab === "batky") votesByChat.batky = Number(b.cnt);
  }

  return {
    player,
    totalVotes: Number(voteCounts[0].cnt),
    votesByChat,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const month = searchParams.get("month") || currentMonth;
  const phone = searchParams.get("phone") || null;

  const isActive = month === currentMonth;

  const currentLeader = await buildLeader(month);

  const voteCounts = await prisma.$queryRawUnsafe<{ player_id: number; cnt: string }[]>(
    `SELECT "playerId" as player_id, COUNT(*) as cnt FROM "ChatMvpVote" WHERE month = $1 GROUP BY "playerId" ORDER BY cnt DESC LIMIT 10`,
    month
  );

  const playerIds = voteCounts.map((v) => Number(v.player_id));
  const playersArr = await getPlayersByIds(playerIds);
  const playersMap = new Map(playersArr.map((p) => [p.id, p]));

  const allResults = voteCounts
    .filter((v) => playersMap.has(Number(v.player_id)))
    .map((v) => ({
      player: playersMap.get(Number(v.player_id))!,
      votes: Number(v.cnt),
    }));

  let userVote: number | null = null;
  if (phone) {
    const rows = await prisma.$queryRawUnsafe<{ player_id: number }[]>(
      `SELECT "playerId" as player_id FROM "ChatMvpVote" WHERE "voterPhone" = $1 AND month = $2 LIMIT 1`,
      phone, month
    );
    userVote = rows.length > 0 ? Number(rows[0].player_id) : null;
  }

  return NextResponse.json({ currentLeader, allResults, userVote, isActive, month });
}

export async function POST(req: NextRequest) {
  try {
    let body: { playerId?: number; phone?: string; chatTab?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { playerId, phone, chatTab } = body;

    if (!playerId || !phone || !chatTab) {
      return NextResponse.json({ error: "playerId, phone, chatTab required" }, { status: 400 });
    }

    const validTabs = ["balacka", "batky"];
    if (!validTabs.includes(chatTab)) {
      return NextResponse.json({ error: "chatTab must be balacka or batky" }, { status: 400 });
    }

    const month = new Date().toISOString().slice(0, 7);

    const existing = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM "ChatMvpVote" WHERE "voterPhone" = $1 AND month = $2 LIMIT 1`,
      phone, month
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: "Ви вже проголосували цього місяця", alreadyVoted: true }, { status: 409 });
    }

    const playerCheck = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM "Player" WHERE id = $1 LIMIT 1`, Number(playerId)
    );
    if (playerCheck.length === 0) {
      return NextResponse.json({ error: "Гравця не знайдено" }, { status: 404 });
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ChatMvpVote" ("voterPhone", "playerId", month, "chatTab", "createdAt") VALUES ($1, $2, $3, $4, NOW())`,
      phone, Number(playerId), month, chatTab
    );

    const leader = await buildLeader(month);
    return NextResponse.json({ success: true, leader });
  } catch (err) {
    console.error("[POST /api/mvp-vote]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
