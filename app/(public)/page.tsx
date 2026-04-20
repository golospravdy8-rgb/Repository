import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/site-settings";
import StandingsTable from "@/components/public/StandingsTable";
import NewsCard from "@/components/public/NewsCard";
import HeroButtons from "@/components/public/HeroButtons";
import DonateButton from "@/components/public/DonateButton";
import AgeGroupTabs from "@/components/public/AgeGroupTabs";
import LiveStreamWidget from "@/components/public/LiveStreamWidget";
import HomePageNeon from "@/components/public/HomePageNeon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getLatestNews() {
  // Ensure we always get fresh data from DB
  const result = await prisma.news.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: 6,
  }).catch(() => []);

  return result;
}

export default async function HomePage({ searchParams }: { searchParams: { ag?: string } }) {
  const ag = searchParams.ag === "older" ? "older" : "younger";
  const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } }).catch(() => null);

  const [settings, games, news, standings] = await Promise.all([
    getSettings([
      "hero.badge",
      "hero.title",
      "hero.subtitle",
      "hero.ctaPrimary",
      "hero.ctaSecondary",
      "colors.navy",
      "colors.orange",
      "colors.text.heading",
      "colors.text.accent",
      "colors.heroBg",
      "colors.heroText",
      "colors.heroTitle",
      "colors.heroSubtitle",
      "colors.heroButtonBg",
      "colors.heroButtonText",
      "colors.btnHero",
      "colors.btnChat",
      "colors.btnDonate",
      "colors.btnSchedule",
      "colors.tableBg",
      "colors.tableHeaderText",
      "colors.tableRowOdd",
      "colors.tableRowEven",
      "images.heroBg",
      "home.showLive",
      "home.showStandings",
      "home.showNews",
      "home.liveLimit",
      "home.standingsLimit",
      "home.newsLimit",
      "home.liveTitle",
      "home.standingsTitle",
      "home.newsTitle",
      "donate.cardNumber",
      "donate.cardName",
      "donate.cardBank",
      "donate.label",
      "stream.enabled",
      "stream.showOnHome",
      "stream.title",
      "stream.description",
      "stream.scheduledAt",
      "stream.pollIntervalSeconds",
      "stream.countdownThresholdMinutes",
      "stream.youtubeChannelId",
    ]),
    season
      ? prisma.game.findMany({
          where: { seasonId: season.id },
          orderBy: { scheduledAt: "asc" },
          include: { homeTeam: true, awayTeam: true, season: true },
          take: 16,
        }).catch(() => [])
      : Promise.resolve([]),
    getLatestNews(),
    season
      ? prisma.standing.findMany({
          where: { seasonId: season.id },
          include: { team: true },
          orderBy: [{ wins: "desc" }, { pointsFor: "desc" }],
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  // ── Дошка пошани: top-3 by avg points this month ─────────────────────────
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const honorPlayers = season
    ? await prisma.boxScore.groupBy({
        by: ["playerId"],
        where: { game: { seasonId: season.id, scheduledAt: { gte: monthStart }, status: { in: ["FINAL", "FINISHED", "COMPLETED", "LIVE"] } } },
        _sum: { points: true },
        _count: { gameId: true },
        orderBy: { _sum: { points: "desc" } },
        take: 10,
      }).catch(() => [])
    : [];

  const honorTop3 = await Promise.all(
    honorPlayers
      .map((r) => ({ playerId: r.playerId, total: r._sum.points ?? 0, games: r._count.gameId }))
      .filter((r) => r.games > 0)
      .sort((a, b) => b.total / b.games - a.total / a.games)
      .slice(0, 3)
      .map(async (r) => {
        const p = await prisma.player.findUnique({
          where: { id: r.playerId },
          select: { id: true, firstName: true, lastName: true, photoUrl: true, position: true, team: { select: { name: true } } },
        });
        return { player: p, avgPts: Math.round((r.total / r.games) * 10) / 10, games: r.games };
      })
  );

  // Render neon homepage instead of traditional layout
  return (
    <HomePageNeon season={season} standings={standings} players={honorTop3} ag={ag} games={games} news={news} settings={settings} />
  );
}

