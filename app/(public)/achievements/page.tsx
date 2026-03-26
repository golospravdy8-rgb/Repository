import { prisma } from "@/lib/prisma";

export const metadata = { title: "Досягнення — ЛДБЛ" };
export const dynamic = "force-dynamic";

const BADGES = [
  { id: "top-scorer", name: "Снайпер", icon: "🏹", description: "Набрав 20+ очок в одній грі", color: "#ffd700", check: (stats: {points:number;rebounds:number;assists:number;steals:number;blocks:number}[]) => stats.some((g) => g.points >= 20) },
  { id: "triple-double", name: "Трипл-дабл", icon: "⭐", description: "10+ очок, підбирань та передач в одній грі", color: "#f46f10", check: (stats: {points:number;rebounds:number;assists:number;steals:number;blocks:number}[]) => stats.some((g) => g.points >= 10 && g.rebounds >= 10 && g.assists >= 10) },
  { id: "iron-defense", name: "Залізний захист", icon: "🛡️", description: "5+ блок-шотів в одній грі", color: "#4a90d9", check: (stats: {points:number;rebounds:number;assists:number;steals:number;blocks:number}[]) => stats.some((g) => g.blocks >= 5) },
  { id: "playmaker", name: "Розігруючий", icon: "🎯", description: "7+ передач в одній грі", color: "#7c3aed", check: (stats: {points:number;rebounds:number;assists:number;steals:number;blocks:number}[]) => stats.some((g) => g.assists >= 7) },
  { id: "rebounder", name: "Король підбирань", icon: "💪", description: "10+ підбирань в одній грі", color: "#059669", check: (stats: {points:number;rebounds:number;assists:number;steals:number;blocks:number}[]) => stats.some((g) => g.rebounds >= 10) },
  {
    id: "consistent", name: "Стабільний", icon: "📈", description: "10+ очок у 3 іграх поспіль", color: "#d97706",
    check: (stats: {points:number;rebounds:number;assists:number;steals:number;blocks:number}[]) => {
      let streak = 0;
      for (const g of stats) { if (g.points >= 10) { streak++; if (streak >= 3) return true; } else streak = 0; }
      return false;
    },
  },
  { id: "team-player", name: "Командний гравець", icon: "🤝", description: "Середнє 5+ передач за сезон", color: "#0891b2", check: (stats: {points:number;rebounds:number;assists:number;steals:number;blocks:number}[]) => stats.length > 0 && stats.reduce((s, g) => s + g.assists, 0) / stats.length >= 5 },
  { id: "mvp", name: "MVP сезону", icon: "👑", description: "Найвищий рейтинг серед всіх гравців", color: "#dc2626", check: () => false, special: true },
];

function calculateRating(games: { points: number; rebounds: number; assists: number; steals: number; blocks: number }[]) {
  if (!games.length) return 60;
  const n = games.length;
  const avg = {
    pts: games.reduce((s, g) => s + g.points, 0) / n,
    reb: games.reduce((s, g) => s + g.rebounds, 0) / n,
    ast: games.reduce((s, g) => s + g.assists, 0) / n,
    stl: games.reduce((s, g) => s + g.steals, 0) / n,
    blk: games.reduce((s, g) => s + g.blocks, 0) / n,
  };
  return Math.min(99, Math.round(50 + avg.pts * 1.8 + avg.reb * 1.2 + avg.ast * 1.5 + avg.stl * 2.0 + avg.blk * 1.8));
}

export default async function AchievementsPage() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  const players = season
    ? await prisma.player.findMany({
        where: { team: { seasonId: season.id } },
        include: {
          team: true,
          boxScores: { select: { points: true, rebounds: true, assists: true, steals: true, blocks: true } },
        },
      })
    : [];

  const playersWithData = players.map((p) => ({
    ...p,
    rating: calculateRating(p.boxScores),
    badges: BADGES.filter((b) => !b.special && b.check(p.boxScores)).map((b) => b.id),
  })).sort((a, b) => b.rating - a.rating);

  const mvpId = playersWithData[0]?.id;

  // Leaderboard by badge count
  const leaderboard = [...playersWithData].sort((a, b) => b.badges.length - a.badges.length).slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-xl font-black mb-1" style={{ color: "#1e2a4a" }}>Досягнення та бейджі</h1>
      <p className="text-gray-500 mb-8">Спеціальні нагороди гравців ЛДБЛ за сезон 2025-2026</p>

      {/* Badge catalog */}
      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="font-black text-xl mb-6" style={{ color: "#1e2a4a" }}>Каталог бейджів</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {BADGES.map((badge) => {
            const holders = badge.special
              ? (mvpId ? playersWithData.filter((p) => p.id === mvpId) : [])
              : playersWithData.filter((p) => badge.check(p.boxScores));
            return (
              <div key={badge.id} className="rounded-xl p-4 text-center" style={{ backgroundColor: `${badge.color}15`, border: `2px solid ${badge.color}` }}>
                <div className="text-3xl mb-2">{badge.icon}</div>
                <div className="font-black text-sm" style={{ color: badge.color }}>{badge.name}</div>
                <div className="text-xs text-gray-500 mt-1">{badge.description}</div>
                <div className="text-xs mt-2 font-semibold" style={{ color: badge.color }}>
                  {holders.length} гравців
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-black text-xl mb-6" style={{ color: "#1e2a4a" }}>Лідери по бейджах</h2>
          <div className="space-y-3">
            {leaderboard.map((player, i) => (
              <div key={player.id} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                  style={{ backgroundColor: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#e5e7eb", color: i < 3 ? "white" : "#6b7280" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-800">
                    {player.firstName} {player.lastName}
                    {player.id === mvpId && <span className="ml-1">👑</span>}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{player.team.name}</div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {BADGES.filter((b) => !b.special && b.check(player.boxScores)).map((b) => (
                    <span key={b.id} title={b.name}>{b.icon}</span>
                  ))}
                  {player.id === mvpId && <span title="MVP сезону">👑</span>}
                  {player.badges.length === 0 && <span className="text-xs text-gray-400">—</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All players with badges */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-black text-xl mb-6" style={{ color: "#1e2a4a" }}>Всі гравці</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {playersWithData.map((player) => (
              <div key={player.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800">{player.firstName} {player.lastName}</div>
                  <div className="text-xs text-gray-400">{player.team.name.split(" ")[0]}</div>
                </div>
                <div className="flex gap-1">
                  {BADGES.filter((b) => !b.special && b.check(player.boxScores)).map((b) => (
                    <span key={b.id} title={b.name} className="text-sm">{b.icon}</span>
                  ))}
                  {player.id === mvpId && <span title="MVP">👑</span>}
                  {player.badges.length === 0 && player.id !== mvpId && (
                    <span className="text-xs text-gray-300">немає</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
