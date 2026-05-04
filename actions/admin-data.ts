"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

// ===== TEAMS =====

export async function getTeams() {
  return prisma.team.findMany({
    where: {
      season: { isActive: true },
    },
    include: { _count: { select: { players: true } } },
    orderBy: [{ ageGroup: "asc" }, { name: "asc" }],
  });
}

export async function createTeam(data: { name: string; shortName: string; logoUrl?: string; ageGroup?: string }) {
  await requireAuth();
  const ag = data.ageGroup || "younger";
  let season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } });
  if (!season) {
    // auto-create season for this age group
    const baseSeason = await prisma.season.findFirst({ where: { isActive: true } });
    season = await prisma.season.create({
      data: { name: baseSeason?.name ?? "2025-2026", isActive: true, ageGroup: ag },
    });
  }
  const team = await prisma.team.create({
    data: { name: data.name, shortName: data.shortName, seasonId: season.id, logoUrl: data.logoUrl || null, ageGroup: ag },
  });
  await prisma.standing.create({
    data: { teamId: team.id, seasonId: season.id, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, gamesPlayed: 0 },
  });
  revalidatePath("/admin/site-editor");
  revalidatePath("/команди");
  revalidatePath("/standings");
  return team;
}

export async function updateTeam(id: number, data: { name: string; shortName: string; logoUrl?: string; ageGroup?: string }) {
  await requireAuth();
  await prisma.team.update({ where: { id }, data: { name: data.name, shortName: data.shortName, logoUrl: data.logoUrl ?? null, ageGroup: data.ageGroup ?? "younger" } });
  revalidatePath("/admin/site-editor");
  revalidatePath("/команди");
}

export async function deleteTeam(id: number) {
  await requireAuth();
  await prisma.standing.deleteMany({ where: { teamId: id } });
  await prisma.boxScore.deleteMany({ where: { teamId: id } });
  await prisma.gameEvent.deleteMany({ where: { teamId: id } });
  await prisma.game.deleteMany({ where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] } });
  await prisma.player.deleteMany({ where: { teamId: id } });
  await prisma.team.delete({ where: { id } });
  revalidatePath("/admin/site-editor");
  revalidatePath("/команди");
  revalidatePath("/standings");
}

// ===== PLAYERS =====

export async function getPlayers() {
  return prisma.player.findMany({
    include: { team: { select: { name: true, shortName: true } } },
    orderBy: [{ teamId: "asc" }, { lastName: "asc" }],
  });
}

export async function createPlayer(data: {
  firstName: string;
  lastName: string;
  number: number;
  position: string;
  teamId: number;
  photoUrl?: string;
}) {
  await requireAuth();
  await prisma.player.create({ data: { ...data, photoUrl: data.photoUrl || null } });
  revalidatePath("/admin/site-editor");
  revalidatePath("/гравці");
  revalidatePath("/players");
}

export async function updatePlayer(
  id: number,
  data: { firstName: string; lastName: string; number: number; position: string; teamId: number; photoUrl?: string }
) {
  await requireAuth();
  await prisma.player.update({ where: { id }, data: { ...data, photoUrl: data.photoUrl ?? null } });
  revalidatePath("/admin/site-editor");
  revalidatePath("/гравці");
  revalidatePath("/players");
}

export async function deletePlayer(id: number) {
  await requireAuth();
  await prisma.boxScore.deleteMany({ where: { playerId: id } });
  await prisma.gameEvent.deleteMany({ where: { playerId: id } });
  await prisma.player.delete({ where: { id } });
  revalidatePath("/admin/site-editor");
  revalidatePath("/гравці");
}

// ===== GAMES (Schedule) =====

export async function getGames() {
  return prisma.game.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function createGame(data: {
  homeTeamId: number;
  awayTeamId: number;
  scheduledAt: string;
  status: string;
  homeScore: number;
  awayScore: number;
  ageGroup?: string;
  tourId?: number | null;
  stage?: string | null;
  sourceA?: string | null;
  sourceB?: string | null;
}) {
  await requireAuth();
  const ag = data.ageGroup ?? "younger";
  let season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } });
  if (!season) {
    const baseSeason = await prisma.season.findFirst({ where: { isActive: true } });
    season = await prisma.season.create({
      data: { name: baseSeason?.name ?? "2025-2026", isActive: true, ageGroup: ag },
    });
  }
  await prisma.game.create({
    data: {
      seasonId: season.id,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      scheduledAt: new Date(data.scheduledAt),
      status: data.status,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      quarter: data.status === "FINAL" ? 4 : 1,
      tourId: data.tourId ? Number(data.tourId) : null,
      stage: data.stage || null,
      sourceA: data.sourceA || null,
      sourceB: data.sourceB || null,
    },
  });
  if (data.status === "FINAL") await recalcStandings();
  revalidatePath("/admin/site-editor");
  revalidatePath("/розклад");
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function updateGame(
  id: number,
  data: {
    homeTeamId: number;
    awayTeamId: number;
    scheduledAt: string;
    status: string;
    homeScore: number;
    awayScore: number;
    ageGroup?: string;
    tourId?: number | null;
    stage?: string | null;
    sourceA?: string | null;
    sourceB?: string | null;
    playoffTeamA?: string | null;
    playoffTeamB?: string | null;
    playoffScoreA?: number | null;
    playoffScoreB?: number | null;
  }
) {
  await requireAuth();
  await prisma.game.update({
    where: { id },
    data: {
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      scheduledAt: new Date(data.scheduledAt),
      status: data.status,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      quarter: data.status === "FINAL" ? 4 : 1,
      tourId: data.tourId ? Number(data.tourId) : null,
      stage: data.stage || null,
      sourceA: data.sourceA || null,
      sourceB: data.sourceB || null,
      playoffTeamA: data.playoffTeamA || null,
      playoffTeamB: data.playoffTeamB || null,
      playoffScoreA: data.playoffScoreA || null,
      playoffScoreB: data.playoffScoreB || null,
    },
  });
  await recalcStandings();
  revalidatePath("/admin/site-editor");
  revalidatePath("/розклад");
  revalidatePath("/schedule");
  revalidatePath("/standings");
  revalidatePath("/змагання");
  revalidatePath("/");
}

export async function deleteGame(id: number) {
  await requireAuth();
  await prisma.boxScore.deleteMany({ where: { gameId: id } });
  await prisma.gameEvent.deleteMany({ where: { gameId: id } });
  await prisma.game.delete({ where: { id } });
  await recalcStandings();
  revalidatePath("/admin/site-editor");
  revalidatePath("/розклад");
  revalidatePath("/schedule");
  revalidatePath("/standings");
  revalidatePath("/");
}

async function recalcStandings() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  if (!season) return;
  const games = await prisma.game.findMany({
    where: { seasonId: season.id, status: "FINAL" },
  });
  const standings = await prisma.standing.findMany({ where: { seasonId: season.id } });

  const statsMap: Record<number, { wins: number; losses: number; pf: number; pa: number; gp: number }> = {};
  standings.forEach((s) => {
    statsMap[s.teamId] = { wins: 0, losses: 0, pf: 0, pa: 0, gp: 0 };
  });

  for (const g of games) {
    if (!statsMap[g.homeTeamId]) statsMap[g.homeTeamId] = { wins: 0, losses: 0, pf: 0, pa: 0, gp: 0 };
    if (!statsMap[g.awayTeamId]) statsMap[g.awayTeamId] = { wins: 0, losses: 0, pf: 0, pa: 0, gp: 0 };
    statsMap[g.homeTeamId].pf += g.homeScore;
    statsMap[g.homeTeamId].pa += g.awayScore;
    statsMap[g.homeTeamId].gp += 1;
    statsMap[g.awayTeamId].pf += g.awayScore;
    statsMap[g.awayTeamId].pa += g.homeScore;
    statsMap[g.awayTeamId].gp += 1;
    if (g.homeScore > g.awayScore) {
      statsMap[g.homeTeamId].wins += 1;
      statsMap[g.awayTeamId].losses += 1;
    } else {
      statsMap[g.awayTeamId].wins += 1;
      statsMap[g.homeTeamId].losses += 1;
    }
  }

  const sorted = Object.entries(statsMap).sort(([, a], [, b]) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pf - b.pa - (a.pf - a.pa);
  });

  for (let i = 0; i < sorted.length; i++) {
    const [teamIdStr, s] = sorted[i];
    const teamId = Number(teamIdStr);
    await prisma.standing.upsert({
      where: { teamId },
      update: { wins: s.wins, losses: s.losses, pointsFor: s.pf, pointsAgainst: s.pa, gamesPlayed: s.gp, rank: i + 1 },
      create: { teamId, seasonId: season.id, wins: s.wins, losses: s.losses, pointsFor: s.pf, pointsAgainst: s.pa, gamesPlayed: s.gp, rank: i + 1 },
    });
  }
}

// ===== NEWS =====

export async function getNews() {
  return prisma.news.findMany({ orderBy: { publishedAt: "desc" } });
}

export async function createNews(data: {
  title: string;
  slug: string;
  content: string;
  category: string;
  isPublished: boolean;
  imageUrl?: string;
}) {
  await requireAuth();
  try {
    console.log("[createNews] Creating new news");
    console.log("[createNews] Data:", { ...data, content: data.content.substring(0, 100) + "..." });

    const result = await prisma.news.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        category: data.category,
        isPublished: data.isPublished,
        imageUrl: data.imageUrl || null,
      },
    });

    console.log("[createNews] ✅ News created successfully:", result.id);
    revalidatePath("/admin/site-editor");
    revalidatePath("/news");
    revalidatePath("/");
  } catch (error: any) {
    console.error("[createNews] ❌ ERROR:");
    console.error("  Message:", error.message);
    console.error("  Code:", error.code);
    console.error("  Meta:", error.meta);
    console.error("  Full error:", error);
    throw error;
  }
}

export async function updateNews(
  id: number,
  data: { title: string; slug: string; content: string; category: string; isPublished: boolean; imageUrl?: string }
) {
  await requireAuth();
  try {
    console.log("[updateNews] Updating news ID:", id);
    console.log("[updateNews] Data:", { ...data, content: data.content.substring(0, 100) + "..." });

    const result = await prisma.news.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        category: data.category,
        isPublished: data.isPublished,
        imageUrl: data.imageUrl ?? null,
      },
    });

    console.log("[updateNews] ✅ News saved successfully:", result.id);
    revalidatePath("/admin/site-editor");
    revalidatePath("/news");
    revalidatePath("/");
  } catch (error: any) {
    console.error("[updateNews] ❌ ERROR:");
    console.error("  Message:", error.message);
    console.error("  Code:", error.code);
    console.error("  Meta:", error.meta);
    console.error("  Full error:", error);
    throw error;
  }
}

export async function deleteNews(id: number) {
  await requireAuth();
  await prisma.news.delete({ where: { id } });
  revalidatePath("/admin/site-editor");
  revalidatePath("/новини");
  revalidatePath("/");
}

// ===== SHOP PRODUCTS =====

export type ShopProductInput = {
  name: string;
  description: string;
  price: number;
  oldPrice?: number | null;
  category: string;
  emoji: string;
  badge?: string | null;
  imageUrl?: string | null;
  sizes?: string | null;
  inStock: boolean;
  sortOrder: number;
};

export async function getShopProducts() {
  return prisma.shopProduct.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function createShopProduct(data: ShopProductInput) {
  await requireAuth();
  await prisma.shopProduct.create({ data });
  revalidatePath("/admin/site-editor");
}

export async function updateShopProduct(id: number, data: Partial<ShopProductInput>) {
  await requireAuth();
  await prisma.shopProduct.update({ where: { id }, data });
  revalidatePath("/admin/site-editor");
}

export async function updateShopProductChatSettings(id: number, data: { showInChat?: boolean; chatPriority?: boolean; emoji?: string }) {
  await requireAuth();
  await prisma.shopProduct.update({ where: { id }, data });
  revalidatePath("/admin/site-editor");
}

export async function deleteShopProduct(id: number) {
  await requireAuth();
  await prisma.shopProduct.delete({ where: { id } });
  revalidatePath("/admin/site-editor");
}
