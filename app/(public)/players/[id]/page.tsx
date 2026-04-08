import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { calculateRating, getRatingTier, BADGES } from "@/lib/achievements";

export const dynamic = "force-dynamic";

const TIER_STYLES = {
  gold:   { background: "linear-gradient(135deg, #b8860b, #ffd700, #b8860b)", border: "2px solid #ffd700", textColor: "#4a3000", badgeColor: "#b8860b" },
  silver: { background: "linear-gradient(135deg, #708090, #c0c0c0, #708090)", border: "2px solid #c0c0c0", textColor: "#2d3748", badgeColor: "#708090" },
  bronze: { background: "linear-gradient(135deg, #8B4513, #cd7f32, #8B4513)", border: "2px solid #cd7f32", textColor: "#2d1b00", badgeColor: "#8B4513" },
};

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const playerId = parseInt(params.id);
  if (isNaN(playerId)) notFound();

  const [player, seasonMvp] = await Promise.all([
    prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: { include: { season: true } },
        achievements: { select: { badgeId: true, unlockedAt: true }, orderBy: { unlockedAt: "asc" } },
        boxScores: {
          include: { game: { select: { id: true, scheduledAt: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } }, homeScore: true, awayScore: true, homeTeamId: true } } },
          orderBy: { game: { scheduledAt: "asc" } },
        },
      },
    }).catch(() => null),
    // Find MVP of the season: player with highest rating in same season
    prisma.player.findFirst({
      where: {},
      select: { id: true },
    }).catch(() => null), // placeholder — computed below
  ]);

  if (!player) notFound();

  const rating = calculateRating(player.boxScores);
  const tier = getRatingTier(rating);
  const style = TIER_STYLES[tier];

  const unlockedIds = new Set(player.achievements.map((a) => a.badgeId));
  const earnedBadges = BADGES.filter((b) => unlockedIds.has(b.id));
  const lockedBadges = BADGES.filter((b) => !unlockedIds.has(b.id));

  // Find MVP of this player's season
  let isMvp = false;
  try {
    const seasonPlayers = await prisma.player.findMany({
      where: { team: { seasonId: player.team.seasonId } },
      include: {
        boxScores: { select: { points: true, rebounds: true, assists: true, steals: true, blocks: true } },
      },
    });
    const rated = seasonPlayers.map((p) => ({ id: p.id, rating: calculateRating(p.boxScores) }));
    rated.sort((a, b) => b.rating - a.rating);
    isMvp = rated.length > 0 && rated[0].id === playerId;
  } catch {}

  const avgPts = player.boxScores.length ? (player.boxScores.reduce((s, g) => s + g.points, 0) / player.boxScores.length).toFixed(1) : "0";
  const avgReb = player.boxScores.length ? (player.boxScores.reduce((s, g) => s + g.rebounds, 0) / player.boxScores.length).toFixed(1) : "0";
  const avgAst = player.boxScores.length ? (player.boxScores.reduce((s, g) => s + g.assists, 0) / player.boxScores.length).toFixed(1) : "0";
  const avgStl = player.boxScores.length ? (player.boxScores.reduce((s, g) => s + g.steals, 0) / player.boxScores.length).toFixed(1) : "0";
  const avgBlk = player.boxScores.length ? (player.boxScores.reduce((s, g) => s + g.blocks, 0) / player.boxScores.length).toFixed(1) : "0";

  const tierMedal = tier === "gold" ? "🥇" : tier === "silver" ? "🥈" : "🥉";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/players" className="text-sm text-gray-500 hover:text-gray-700 mb-6 block">← Всі гравці</Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* FIFA Card */}
        <div className="flex justify-center">
          <div className="w-52 rounded-2xl overflow-hidden shadow-2xl" style={{ background: style.background, border: style.border }}>
            <div className="px-4 pt-4 pb-1 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div className="font-black text-3xl" style={{ color: style.textColor }}>{rating}</div>
                <span className="text-lg">{tierMedal}</span>
                {isMvp && <span className="text-lg" title="MVP сезону">👑</span>}
              </div>
              <div>
                <div className="text-xs font-bold px-2 py-0.5 rounded text-white text-center" style={{ backgroundColor: style.badgeColor }}>{player.position || "—"}</div>
                <div className="text-xs text-center mt-0.5 font-bold opacity-70" style={{ color: style.textColor }}>#{player.number}</div>
              </div>
            </div>

            <div className="relative mx-3 rounded-xl overflow-hidden" style={{ aspectRatio: "1", background: "rgba(0,0,0,0.15)" }}>
              {player.photoUrl ? (
                <Image src={player.photoUrl} alt={`${player.firstName} ${player.lastName}`} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl font-black opacity-20" style={{ color: style.textColor }}>{player.lastName[0]}</span>
                </div>
              )}
            </div>

            <div className="px-3 pt-2 text-center" style={{ color: style.textColor }}>
              <div className="font-bold text-sm">{player.firstName}</div>
              <div className="font-black text-base">{player.lastName}</div>
              <div className="text-xs opacity-60 truncate">{player.team.name}</div>
            </div>

            <div className="mx-3 mb-3 mt-2 rounded-lg p-2 grid grid-cols-4 gap-1" style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
              {[["ОЧ", avgPts], ["РЕБ", avgReb], ["ПЕР", avgAst], ["БЛК", avgBlk]].map(([label, val]) => (
                <div key={label} className="text-center">
                  <div className="font-black text-base leading-none" style={{ color: style.textColor }}>{val}</div>
                  <div className="text-xs opacity-60 leading-none mt-0.5" style={{ color: style.textColor }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats summary */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
              {player.firstName} {player.lastName}
              {isMvp && <span className="text-2xl" title="MVP сезону">👑</span>}
            </h1>
            <p className="text-gray-500">{player.team.name} · #{player.number} · {player.position}</p>
            <p className="text-sm font-semibold mt-1 flex items-center gap-1" style={{ color: tier === "gold" ? "#b8860b" : tier === "silver" ? "#708090" : "#8B4513" }}>
              {tierMedal} Рейтинг {rating} — {tier === "gold" ? "Золото" : tier === "silver" ? "Срібло" : "Бронза"}
              {isMvp && <span className="ml-2 text-orange-600">· MVP сезону 👑</span>}
            </p>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {[["Очки", avgPts, "#f46f10"], ["Підбирання", avgReb, "#059669"], ["Передачі", avgAst, "#7c3aed"], ["Перехоплення", avgStl, "#4a90d9"], ["Блоки", avgBlk, "#d97706"]].map(([label, val, color]) => (
              <div key={label} className="bg-white rounded-xl shadow p-3 text-center">
                <div className="text-2xl font-black" style={{ color: color as string }}>{val}</div>
                <div className="text-xs text-gray-500 mt-1 leading-tight">{label}</div>
              </div>
            ))}
          </div>

          {/* Badges */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-black text-gray-800 mb-4">🏅 Досягнення ({earnedBadges.length}/{BADGES.length})</h3>
            <div className="flex flex-wrap gap-2">
              {earnedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold"
                  style={{ backgroundColor: badge.color }}
                  title={badge.description}
                >
                  <span>{badge.icon}</span>
                  <span>{badge.name}</span>
                </div>
              ))}
              {lockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: "#e5e7eb", color: "#9ca3af" }}
                  title={badge.description}
                >
                  <span>🔒</span>
                  <span>{badge.name}</span>
                </div>
              ))}
            </div>
            {earnedBadges.length === 0 && (
              <p className="text-sm text-gray-400 mt-1">Поки немає досягнень. Грай — і отримуй значки!</p>
            )}
          </div>
        </div>
      </div>

      {/* Games table */}
      {player.boxScores.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 font-black text-white" style={{ backgroundColor: "#1e2a4a" }}>
            Статистика по матчах
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-gray-500 uppercase text-xs">
                  <th className="px-4 py-3 text-left">Матч</th>
                  <th className="px-4 py-3 text-center">Оч</th>
                  <th className="px-4 py-3 text-center">Пд</th>
                  <th className="px-4 py-3 text-center">Пе</th>
                  <th className="px-4 py-3 text-center">Пр</th>
                  <th className="px-4 py-3 text-center">Бл</th>
                  <th className="px-4 py-3 text-center">Фо</th>
                  <th className="px-4 py-3 text-center">Хв</th>
                </tr>
              </thead>
              <tbody>
                {player.boxScores.map((bs) => (
                  <tr key={bs.gameId} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/game/${bs.gameId}`} className="text-blue-600 hover:underline text-xs">
                        {bs.game.homeTeam.name} vs {bs.game.awayTeam.name}
                        <span className="ml-1 text-gray-400">({bs.game.homeScore}:{bs.game.awayScore})</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: "#f46f10" }}>{bs.points}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{bs.rebounds}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{bs.assists}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{bs.steals}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{bs.blocks}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{bs.fouls}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{bs.minutes}</td>
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
