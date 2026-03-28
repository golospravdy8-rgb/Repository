import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/site-settings";
import GameCard from "@/components/public/GameCard";
import StandingsTable from "@/components/public/StandingsTable";
import NewsCard from "@/components/public/NewsCard";
import HeroButtons from "@/components/public/HeroButtons";
import DonateButton from "@/components/public/DonateButton";
import AgeGroupTabs from "@/components/public/AgeGroupTabs";
import LiveStreamWidget from "@/components/public/LiveStreamWidget";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: { ag?: string } }) {
  const ag = searchParams.ag === "older" ? "older" : "younger";
  const [season, settings] = await Promise.all([
    prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } }),
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
      "colors.heroButtonBg",
      "colors.heroButtonText",
      "colors.tableBg",
      "colors.tableHeaderText",
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
  ]);

  const navy = settings["colors.text.heading"] || settings["colors.navy"] || "#1a2744";
  const orange = settings["colors.text.accent"] || settings["colors.orange"] || "#f97316";
  const heroBg = settings["images.heroBg"] || "";
  const heroBgColor = settings["colors.heroBg"] || "#3b82f6";
  const heroTextColor = settings["colors.heroText"] || "#ffffff";
  const heroButtonBg = settings["colors.heroButtonBg"] || orange;
  const heroButtonText = settings["colors.heroButtonText"] || "#ffffff";
  const tableBg = settings["colors.tableBg"] || navy;
  const tableHeaderText = settings["colors.tableHeaderText"] || "#ffffff";
  const showLive = settings["home.showLive"] !== "false";
  const showStandings = settings["home.showStandings"] !== "false";
  const showNews = settings["home.showNews"] !== "false";
  const liveLimit = parseInt(settings["home.liveLimit"] || "4", 10);
  const standingsLimit = parseInt(settings["home.standingsLimit"] || "6", 10);
  const newsLimit = parseInt(settings["home.newsLimit"] || "3", 10);

  const liveOrUpcoming = showLive && season
    ? await prisma.game.findMany({
        where: {
          seasonId: season.id,
          OR: [{ status: "LIVE" }, { status: "SCHEDULED" }],
        },
        include: { homeTeam: true, awayTeam: true },
        orderBy: { scheduledAt: "asc" },
        take: liveLimit,
      })
    : [];

  const news = showNews
    ? await prisma.news.findMany({
        where: { isPublished: true },
        orderBy: { publishedAt: "desc" },
        take: newsLimit,
      })
    : [];

  const heroStyle: React.CSSProperties = heroBg
    ? { backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: heroBgColor };

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative py-12 px-4 overflow-hidden" style={{ ...heroStyle, color: heroTextColor }}>
        {!heroBg && (
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-40 h-40 border-4 border-white rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-60 h-60 border-4 border-white rounded-full"></div>
          </div>
        )}
        <div className="relative max-w-7xl mx-auto text-center">
          <div
            className="inline-block text-white text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider"
            style={{ backgroundColor: orange }}
          >
            {settings["hero.badge"] || "Сезон 2025-2026"}
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">
            {settings["hero.title"] || "ЛІГА ESCULAB"}
          </h1>
          <p className="text-2xl text-gray-300 mb-6 max-w-xl mx-auto">
            {settings["hero.subtitle"] || "Офіційний сайт баскетбольної ліги Львова. Матчі, статистика та новини."}
          </p>
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <Link
              href={`/schedule?ag=${ag}`}
              className="px-6 py-3 rounded-lg font-bold text-2xl transition-colors"
              style={{ backgroundColor: orange, color: "white" }}
            >
              {settings["hero.ctaPrimary"] || "Переглянути розклад"}
            </Link>
            <Link
              href={`/standings?ag=${ag}`}
              className="px-6 py-3 rounded-lg font-bold text-2xl border-2 border-white/30 hover:border-white transition-colors"
            >
              {settings["hero.ctaSecondary"] || "Таблиця змагань"}
            </Link>
          </div>
          <HeroButtons buttonBg={heroButtonBg} buttonText={heroButtonText} />
          <div className="mt-4 flex justify-center">
            <DonateButton
              cardNumber={settings["donate.cardNumber"] ?? ""}
              cardName={settings["donate.cardName"] ?? ""}
              cardBank={settings["donate.cardBank"] ?? ""}
              donateLabel={settings["donate.label"] ?? "Допомогти клубу Donate"}
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Age group switcher */}
        <Suspense>
          <AgeGroupTabs />
        </Suspense>

        {/* YouTube Live Stream — shown between tabs and games */}
        {settings["stream.enabled"] === "true" && settings["stream.showOnHome"] !== "false" && (
          <LiveStreamWidget
            config={{
              title: settings["stream.title"] || "",
              description: settings["stream.description"] || "",
              scheduledAt: settings["stream.scheduledAt"] || "",
              pollIntervalSeconds: parseInt(settings["stream.pollIntervalSeconds"] || "30", 10),
              countdownThresholdMinutes: parseInt(settings["stream.countdownThresholdMinutes"] || "60", 10),
              channelId: settings["stream.youtubeChannelId"] || "",
            }}
          />
        )}

        {/* Live / Upcoming */}
        {showLive && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black" style={{ color: navy }}>
                {liveOrUpcoming.some((g) => g.status === "LIVE")
                  ? `Live & ${settings["home.liveTitle"] || "Найближчі матчі"}`
                  : settings["home.liveTitle"] || "Найближчі матчі"}
              </h2>
              <Link href={`/schedule?ag=${ag}`} className="text-sm font-semibold hover:opacity-80" style={{ color: orange }}>
                Всі матчі →
              </Link>
            </div>
            {liveOrUpcoming.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {liveOrUpcoming.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                Найближчі матчі відсутні
              </div>
            )}
          </section>
        )}

        {/* Standings */}
        {showStandings && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black" style={{ color: navy }}>
                {settings["home.standingsTitle"] || "Таблиця сезону"}
              </h2>
              <Link href={`/standings?ag=${ag}`} className="text-sm font-semibold hover:opacity-80" style={{ color: orange }}>
                Повна таблиця →
              </Link>
            </div>
            <StandingsTable limit={standingsLimit} ageGroup={ag} tableBg={tableBg} tableHeaderText={tableHeaderText} />
          </section>
        )}

        {/* News */}
        {showNews && news.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black" style={{ color: navy }}>
                {settings["home.newsTitle"] || "Останні новини"}
              </h2>
              <Link href="/news" className="text-sm font-semibold hover:opacity-80" style={{ color: orange }}>
                Всі новини →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {news.map((item) => (
                <NewsCard key={item.id} news={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
