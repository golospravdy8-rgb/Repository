import { prisma } from "@/lib/prisma";
import { calculateLeaderStats } from "@/lib/stats-calculator";
import Link from "next/link";
import { Suspense } from "react";
import AgeGroupTabs from "./AgeGroupTabs";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: { ag?: string } }) {
  await requireAuth();
  const ag = searchParams.ag === "older" ? "older" : "younger";

  const [season, gamesCount, teamsCount, playersCount] = await Promise.all([
    prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } }),
    prisma.game.count(),
    prisma.team.count(),
    prisma.player.count(),
  ]);

  const recentGames = season
    ? await prisma.game.findMany({
        where: { seasonId: season.id },
        include: { homeTeam: true, awayTeam: true },
        orderBy: { scheduledAt: "desc" },
        take: 10,
      })
    : [];

  const liveGames = recentGames.filter((g) => g.status === "LIVE");

  // Top-5 leaders by points
  const seasonBoxScores = season
    ? await prisma.boxScore.findMany({
        where: { game: { seasonId: season.id, status: "FINAL" } },
        include: {
          player: { select: { firstName: true, lastName: true } },
          team: { select: { name: true, shortName: true } },
        },
      })
    : [];
  const allLeaders = calculateLeaderStats(seasonBoxScores);
  const top5Leaders = [...allLeaders].sort((a, b) => b.ppg - a.ppg).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "#1a2744" }}>
          Дашборд
        </h1>
        <p className="text-gray-500 text-sm mt-1">Сезон: {season?.name ?? "—"}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Матчів", value: gamesCount, color: "#1a2744" },
          { label: "Команд", value: teamsCount, color: "#f97316" },
          { label: "Гравців", value: playersCount, color: "#3b82f6" },
          { label: "Live зараз", value: liveGames.length, color: "#ef4444" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow p-5">
            <div className="text-3xl font-black" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Live games */}
      {liveGames.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3" style={{ color: "#1a2744" }}>
            Live матчі
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveGames.map((game) => (
              <Link key={game.id} href={`/admin/games/${game.id}`}>
                <div className="bg-white rounded-xl shadow border-l-4 border-red-500 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-800 text-sm">
                      {game.homeTeam.shortName} vs {game.awayTeam.shortName}
                    </div>
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                      LIVE
                    </span>
                  </div>
                  <div className="text-2xl font-black mt-2" style={{ color: "#1a2744" }}>
                    {game.homeScore} : {game.awayScore}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Q{game.quarter}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent games */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: "#1a2744" }}>
            Усі матчі <span className="text-sm font-normal text-gray-400">({ag === "older" ? "U-16" : "U-14"})</span>
          </h2>
          <Suspense fallback={null}>
            <AgeGroupTabs />
          </Suspense>
        </div>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#1a2744" }} className="text-white">
                <th className="px-4 py-3 text-left">Дата</th>
                <th className="px-4 py-3 text-left">Матч</th>
                <th className="px-4 py-3 text-center">Рахунок</th>
                <th className="px-4 py-3 text-center">Статус</th>
                <th className="px-4 py-3 text-center">Дії</th>
              </tr>
            </thead>
            <tbody>
              {recentGames.map((game) => (
                <tr key={game.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(game.scheduledAt).toLocaleDateString("uk-UA", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs">
                    {game.homeTeam.name} — {game.awayTeam.name}
                  </td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: "#1a2744" }}>
                    {game.status !== "SCHEDULED" ? `${game.homeScore}:${game.awayScore}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {game.status === "LIVE" && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">LIVE</span>
                    )}
                    {game.status === "FINAL" && (
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">Фінал</span>
                    )}
                    {game.status === "SCHEDULED" && (
                      <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">Запл.</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/admin/games/${game.id}`}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: "#f97316" }}
                    >
                      Відкрити
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top-5 Leaders */}
      {top5Leaders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold" style={{ color: "#1a2744" }}>
              Лідери сезону (Топ-5 за очками)
            </h2>
            <Link href="/leaders" className="text-xs font-semibold hover:underline" style={{ color: "#f97316" }}>
              Всі лідери →
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#1a2744" }} className="text-white">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Гравець</th>
                  <th className="px-4 py-3 text-left">Команда</th>
                  <th className="px-4 py-3 text-center">Ігри</th>
                  <th className="px-4 py-3 text-center">Оч/гру</th>
                  <th className="px-4 py-3 text-center">Пд/гру</th>
                  <th className="px-4 py-3 text-center">Пе/гру</th>
                </tr>
              </thead>
              <tbody>
                {top5Leaders.map((player, i) => (
                  <tr key={player.playerId} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 font-medium">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {player.firstName} {player.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{player.teamShortName}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{player.gamesPlayed}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: i === 0 ? "#f97316" : "#1a2744" }}>
                      {player.ppg}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{player.rpg}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{player.apg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
