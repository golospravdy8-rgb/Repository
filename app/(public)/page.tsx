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

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: { ag?: string } }) {
  const ag = searchParams.ag === "older" ? "older" : "younger";
  const [season, settings] = await Promise.all([
    prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } }).catch(() => null),
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
  ]);

  const navy = settings["colors.text.heading"] || settings["colors.navy"] || "#1a2744";
  const orange = settings["colors.text.accent"] || settings["colors.orange"] || "#f97316";
  const heroBg = settings["images.heroBg"] || "";
  const heroBgColor = settings["colors.heroBg"] || "#f1f5f9";
  const heroTextColor = settings["colors.heroText"] || "#1e293b";
  const heroTitleColor = settings["colors.heroTitle"] || orange;
  const heroSubtitleColor = settings["colors.heroSubtitle"] || "#64748b";
  const heroButtonBg = settings["colors.btnHero"] || settings["colors.heroButtonBg"] || orange;
  const heroButtonText = settings["colors.heroButtonText"] || "#ffffff";
  const btnSchedule = settings["colors.btnSchedule"] || "#3b82f6";
  const btnDonate = settings["colors.btnDonate"] || orange;
  const btnChat = settings["colors.btnChat"] || "#1e293b";
  const tableBg = settings["colors.tableBg"] || navy;
  const tableHeaderText = settings["colors.tableHeaderText"] || "#ffffff";
  const tableRowOdd = settings["colors.tableRowOdd"] || "";
  const tableRowEven = settings["colors.tableRowEven"] || "";
  const showLive = settings["home.showLive"] !== "false";
  const showStandings = settings["home.showStandings"] !== "false";
  const showNews = settings["home.showNews"] !== "false";
  const liveLimit = parseInt(settings["home.liveLimit"] || "4", 10);
  const standingsLimit = parseInt(settings["home.standingsLimit"] || "6", 10);
  const newsLimit = parseInt(settings["home.newsLimit"] || "3", 10);

  // ── Дошка пошани: top-3 by avg points this month ─────────────────────────
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const honorPlayers = season
    ? await prisma.boxScore.groupBy({
        by: ["playerId"],
        where: { game: { seasonId: season.id, scheduledAt: { gte: monthStart }, status: "FINAL" } },
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

  // Fetch upcoming + recent finished games: next N scheduled/live + last 2 final
  const liveOrUpcoming = showLive && season
    ? await (async () => {
        const [upcoming, recent] = await Promise.all([
          prisma.game.findMany({
            where: { seasonId: season.id, OR: [{ status: "LIVE" }, { status: "SCHEDULED" }] },
            include: { homeTeam: true, awayTeam: true, season: true },
            orderBy: { scheduledAt: "asc" },
            take: liveLimit,
          }).catch(() => []),
          prisma.game.findMany({
            where: { seasonId: season.id, status: "FINAL" },
            include: { homeTeam: true, awayTeam: true, season: true },
            orderBy: { scheduledAt: "desc" },
            take: 2,
          }).catch(() => []),
        ]);
        // Combine: recent final (reversed to asc) + upcoming, deduplicate by id
        const combined = [...recent.reverse(), ...upcoming];
        const seen = new Set<number>();
        return combined.filter((g) => { if (seen.has(g.id)) return false; seen.add(g.id); return true; });
      })()
    : [];

  const news = showNews
    ? await prisma.news.findMany({
        where: { isPublished: true },
        orderBy: { publishedAt: "desc" },
        take: newsLimit,
      }).catch(() => [])
    : [];

  const heroStyle: React.CSSProperties = heroBg
    ? { backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: heroBgColor };

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative py-4 px-4 overflow-hidden" style={{ ...heroStyle, color: heroTextColor }}>
        <div className="relative max-w-7xl mx-auto text-center">
          <div
            className="inline-block text-white text-xs font-bold px-3 py-0.5 rounded-full mb-2 uppercase tracking-wider"
            style={{ backgroundColor: orange }}
          >
            {settings["hero.badge"] || "Сезон 2025-2026"}
          </div>
          <h1 className="text-xl md:text-2xl font-black mb-1.5 tracking-tight" style={{ color: heroTitleColor }}>
            {settings["hero.title"] || "ЛІГА ESCULAB"}
          </h1>
          <p className="text-sm mb-3 max-w-xl mx-auto leading-snug" style={{ color: heroSubtitleColor }}>
            {settings["hero.subtitle"] || "Офіційний сайт баскетбольної ліги Львова. Матчі, статистика та новини."}
          </p>
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            <Link
              href={`/schedule?ag=${ag}`}
              className="px-4 py-1.5 rounded-lg font-bold text-sm transition-colors"
              style={{ backgroundColor: btnSchedule, color: "white" }}
            >
              {settings["hero.ctaPrimary"] || "Переглянути розклад"}
            </Link>
            <Link
              href={`/standings?ag=${ag}`}
              className="px-4 py-1.5 rounded-lg font-bold text-sm transition-colors"
              style={{ backgroundColor: btnSchedule, color: "white" }}
            >
              {settings["hero.ctaSecondary"] || "Таблиця змагань"}
            </Link>
          </div>
          <HeroButtons buttonBg={heroButtonBg} buttonText={heroButtonText} chatBg={btnChat} donateBg={btnDonate} />
          <div className="mt-2 flex justify-center">
            <DonateButton
              cardNumber={settings["donate.cardNumber"] ?? ""}
              cardName={settings["donate.cardName"] ?? ""}
              cardBank={settings["donate.cardBank"] ?? ""}
              donateLabel={settings["donate.label"] ?? "Допомогти клубу Donate"}
              buttonBg={btnDonate}
            />
          </div>
        </div>
      </section>

      {/* Scoreboard strip — flush below hero, full width, white bg */}
      {showLive && (
        <div style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>

          {/* Cards strip — full width, no top padding, horizontal scroll */}
          {liveOrUpcoming.length > 0 && (
          <div style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
            {liveOrUpcoming.map((g) => {
              const isFinal = g.status === "FINAL";
              const isLive  = g.status === "LIVE";
              const hasScore = isFinal || isLive;
              const homeWins = hasScore && g.homeScore > g.awayScore;
              const awayWins = hasScore && g.awayScore > g.homeScore;
              const ageLabel = g.season?.ageGroup === "older" ? "U-16" : "U-14";
              const seasonLabel = g.season?.name ? `${ageLabel} ${g.season.name}` : ageLabel;
              const statusLabel = isLive ? `● LIVE Q${g.quarter}` : isFinal ? "ФІНАЛ" : "ЗАПЛАНОВАНО";
              const statusColor = isLive ? "#fca5a5" : isFinal ? "#fde68a" : "#bfdbfe";
              const dateShort = new Date(g.scheduledAt).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });
              return (
                <Link key={g.id} href={`/game/${g.id}`} style={{ textDecoration: "none", flexShrink: 0, display: "block" }}>
                  <div style={{ background: "#fff", borderRight: "1px solid #e2e8f0", width: 200, cursor: "pointer" }}>

                    {/* Зона 1 — СІРА смуга, БІЛИЙ текст */}
                    <div style={{ background: "#6b7280", padding: "5px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 9, color: "#ffffff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 115 }}>
                        {seasonLabel}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: statusColor, flexShrink: 0, marginLeft: 4 }}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Зона 2 — БІЛА: команди + рахунок */}
                    <div style={{ background: "#fff", padding: "10px 12px" }}>
                      {/* Home */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #e2e8f0", overflow: "hidden", flexShrink: 0, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {g.homeTeam.logoUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={g.homeTeam.logoUrl} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                              : <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>{g.homeTeam.name[0]}</span>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: homeWins ? 700 : 500, color: homeWins ? "#0f172a" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {(g.homeTeam.name.charAt(0).toUpperCase() + g.homeTeam.name.slice(1, 3))}
                          </span>
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 800, color: homeWins ? "#0f172a" : "#94a3b8", minWidth: 30, textAlign: "right", lineHeight: 1 }}>
                          {hasScore ? g.homeScore : ""}
                        </span>
                      </div>
                      {/* Away */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #e2e8f0", overflow: "hidden", flexShrink: 0, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {g.awayTeam.logoUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={g.awayTeam.logoUrl} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                              : <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>{g.awayTeam.name[0]}</span>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: awayWins ? 700 : 500, color: awayWins ? "#f97316" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {(g.awayTeam.name.charAt(0).toUpperCase() + g.awayTeam.name.slice(1, 3))}
                          </span>
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 800, color: awayWins ? "#f97316" : "#94a3b8", minWidth: 30, textAlign: "right", lineHeight: 1 }}>
                          {hasScore ? g.awayScore : ""}
                        </span>
                      </div>
                      {!hasScore && (
                        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginTop: 4 }}>VS</div>
                      )}
                    </div>

                    {/* Зона 3 — ЧОРНА: дата */}
                    <div style={{ background: "#0f172a", padding: "4px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#cbd5e1", fontWeight: 500 }}>{dateShort}</span>
                      <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{ageLabel}</span>
                    </div>

                  </div>
                </Link>
              );
            })}
          </div>
          )}

          {/* Кнопки U-14/U-16 — під карточками, зліва */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px" }}>
            <Suspense fallback={null}>
              <AgeGroupTabs variant="light" />
            </Suspense>
            <Link href={`/schedule?ag=${ag}`} style={{ color: "#f97316", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Всі ігри →
            </Link>
          </div>

        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Age group switcher (only when showLive is false) */}
        {!showLive && (
          <Suspense>
            <AgeGroupTabs />
          </Suspense>
        )}

        {/* YouTube Live Stream */}
        {settings["stream.showOnHome"] !== "false" && (
          <LiveStreamWidget
            config={{
              title: settings["stream.title"] || "",
              description: settings["stream.description"] || "",
              scheduledAt: settings["stream.scheduledAt"] || "",
              pollIntervalSeconds: parseInt(settings["stream.pollIntervalSeconds"] || "30", 10),
              countdownThresholdMinutes: parseInt(settings["stream.countdownThresholdMinutes"] || "60", 10),
              channelId: settings["stream.youtubeChannelId"] || "",
              pollingEnabled: settings["stream.enabled"] === "true",
            }}
          />
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
            <StandingsTable limit={standingsLimit} ageGroup={ag} tableBg={tableBg} tableHeaderText={tableHeaderText} tableRowOdd={tableRowOdd} tableRowEven={tableRowEven} />
          </section>
        )}

        {/* Дошка пошани */}
        {honorTop3.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black" style={{ color: navy }}>
                🏅 Дошка пошани — Гравці місяця
              </h2>
              <Link href={`/players?ag=${ag}`} className="text-sm font-semibold hover:opacity-80" style={{ color: orange }}>
                Всі гравці →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {honorTop3.map(({ player, avgPts, games }, i) => {
                if (!player) return null;
                const medals = ["🥇", "🥈", "🥉"];
                const medalColors = ["#b8860b", "#708090", "#8B4513"];
                const medalBg = ["linear-gradient(135deg,#fffbe6,#ffd700,#fffbe6)", "linear-gradient(135deg,#f8f8f8,#c0c0c0,#f8f8f8)", "linear-gradient(135deg,#fdf6ec,#cd7f32,#fdf6ec)"];
                return (
                  <Link key={player.id} href={`/players/${player.id}`} style={{ textDecoration: "none" }}>
                    <div className="rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105"
                      style={{ background: medalBg[i], border: `2px solid ${medalColors[i]}` }}>
                      <div className="relative w-full h-72 flex items-center justify-center overflow-hidden">
                        {player.photoUrl ? (
                          <img src={player.photoUrl} alt={`${player.firstName} ${player.lastName}`}
                            className="w-full h-full object-contain object-center" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl"
                            style={{ background: `linear-gradient(135deg,${navy},${orange})` }}>
                            🏀
                          </div>
                        )}
                        <div className="absolute top-3 left-3 text-3xl">{medals[i]}</div>
                        <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-black text-white"
                          style={{ background: medalColors[i] }}>
                          #{i + 1} місце
                        </div>
                      </div>
                      <div className="p-4" style={{ color: "#1e293b" }}>
                        <div className="font-black text-lg leading-tight">
                          {player.firstName} {player.lastName}
                        </div>
                        <div className="text-sm opacity-70 mb-3">{player.team?.name}{player.position ? ` · ${player.position}` : ""}</div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-3xl font-black" style={{ color: medalColors[i] }}>{avgPts}</div>
                            <div className="text-xs opacity-60 font-semibold">очок / гра</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{games}</div>
                            <div className="text-xs opacity-60">ігор</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
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
