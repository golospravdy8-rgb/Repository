import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Suspense } from "react";
import PlayersFilter from "./PlayersFilter";
import AgeGroupTabs from "@/components/public/AgeGroupTabs";
import { calculateRating, getRatingTier, BADGES } from "@/lib/achievements";

export const metadata = { title: "Гравці — ЛДБЛ" };
export const dynamic = "force-dynamic";

const TIER = {
  gold:   { bg: "linear-gradient(135deg,#b8860b,#ffd700,#b8860b)", border: "#ffd700", text: "#4a3000", badge: "#b8860b" },
  silver: { bg: "linear-gradient(135deg,#708090,#c0c0c0,#708090)", border: "#c0c0c0", text: "#2d3748", badge: "#708090" },
  bronze: { bg: "linear-gradient(135deg,#8B4513,#cd7f32,#8B4513)", border: "#cd7f32", text: "#2d1b00", badge: "#8B4513" },
};

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; position?: string; ag?: string }>;
}) {
  const params = await searchParams;
  const ag = params.ag === "older" ? "older" : "younger";
  const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } }).catch(() => null);

  const [players, allTeams] = await Promise.all([
    season
      ? prisma.player.findMany({
          where: { team: { seasonId: season.id } },
          include: {
            team: { select: { name: true } },
            boxScores: { select: { points: true, rebounds: true, assists: true, steals: true, blocks: true } },
            achievements: { select: { badgeId: true } },
          },
          orderBy: [{ lastName: "asc" }],
        }).catch(() => [])
      : Promise.resolve([]),
    season
      ? prisma.team.findMany({
          where: { seasonId: season.id },
          select: { name: true },
          orderBy: { name: "asc" },
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const teams = allTeams.map((t) => t.name);
  const positions = ["PG", "SG", "SF", "PF", "C"];

  const playersWithRating = players
    .map((p) => {
      const rating = calculateRating(p.boxScores);
      const tier = getRatingTier(rating);
      const n = p.boxScores.length || 1;
      const avgPts = p.boxScores.length ? Math.round(p.boxScores.reduce((s, g) => s + g.points, 0) / n) : 0;
      const avgReb = p.boxScores.length ? Math.round(p.boxScores.reduce((s, g) => s + g.rebounds, 0) / n) : 0;
      const avgAst = p.boxScores.length ? Math.round(p.boxScores.reduce((s, g) => s + g.assists, 0) / n) : 0;
      const avgStl = p.boxScores.length ? Math.round(p.boxScores.reduce((s, g) => s + g.steals, 0) / n) : 0;
      const avgBlk = p.boxScores.length ? Math.round(p.boxScores.reduce((s, g) => s + g.blocks, 0) / n) : 0;
      const achievementCount = p.achievements.length;
      return { ...p, rating, tier, avgPts, avgReb, avgAst, avgStl, avgBlk, achievementCount };
    })
    .sort((a, b) => b.rating - a.rating);

  const activeTeam = decodeURIComponent((params.team || "").replace(/\+/g, " "));
  const activePosition = decodeURIComponent((params.position || "").replace(/\+/g, " "));

  const filtered = playersWithRating.filter((p) => {
    if (activeTeam && p.team.name !== activeTeam) return false;
    if (activePosition && p.position !== activePosition) return false;
    return true;
  });

  const topRated = playersWithRating[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2" style={{ zoom: 0.66 }}>
      <div className="flex items-center justify-between mb-0.5">
        <h1 className="text-4xl font-black" style={{ color: "#1e2a4a" }}>Гравці ліги</h1>
        <div className="text-lg text-gray-500">{filtered.length} гравців</div>
      </div>

      <div style={{ fontSize: "180%" }}><AgeGroupTabs /></div>

      <Suspense fallback={null}>
        <PlayersFilter teams={teams} positions={positions} activeTeam={activeTeam} activePosition={activePosition} />
      </Suspense>

      {topRated && (
        <div className="mb-1.5 px-3 py-1.5 rounded-xl border-2 border-orange-400 bg-orange-50 flex items-center gap-2">
          {/* MVP photo */}
          <div style={{ width: 44, height: 44, borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "linear-gradient(135deg,#b8860b,#ffd700,#b8860b)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #f46f10" }}>
            {topRated.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={topRated.photoUrl} alt={topRated.firstName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 16, fontWeight: 900, color: "#4a3000", opacity: 0.7 }}>
                {topRated.firstName[0]}{topRated.lastName[0]}
              </span>
            )}
          </div>
          <div>
            <div className="font-black text-orange-600 text-xs uppercase tracking-wide">MVP сезону</div>
            <div className="font-bold text-gray-800 text-sm">{topRated.firstName} {topRated.lastName} — рейтинг {topRated.rating}</div>
            <div className="text-xs text-gray-500">{topRated.team.name}</div>
          </div>
        </div>
      )}

      {/* Топ-5 гравців ліги */}
      {playersWithRating.length > 0 && (
        <div className="mb-2 bg-white rounded-xl shadow px-3 py-1.5 border-l-4" style={{ borderColor: "#1e2a4a" }}>
          <div className="font-black text-xs uppercase tracking-wide mb-0.5" style={{ color: "#1e2a4a" }}>
            🏅 Топ-5 гравців ліги
          </div>
          <div className="flex flex-col divide-y divide-gray-100">
            {playersWithRating.slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex items-center gap-1.5 py-0.5 first:pt-0 last:pb-0">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                  style={{ backgroundColor: i === 0 ? "#b8860b" : i === 1 ? "#708090" : i === 2 ? "#8B4513" : "#1e2a4a" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-gray-800 truncate leading-tight">{p.firstName} {p.lastName}</div>
                  <div className="text-xs text-gray-400 truncate leading-tight" style={{ fontSize: "10px" }}>{p.team.name}</div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0 items-center">
                  {([["ОЧ", p.avgPts], ["РЕБ", p.avgReb], ["ПЕР", p.avgAst], ["ПМ", p.avgStl], ["БЛК", p.avgBlk]] as [string, number][]).map(([lbl, val]) => (
                    <div key={lbl} className="flex flex-col items-center" style={{ minWidth: 24 }}>
                      <span className="text-xs font-black text-gray-800 leading-tight">{val}</span>
                      <span className="text-gray-400 uppercase leading-tight" style={{ fontSize: "9px" }}>{lbl}</span>
                    </div>
                  ))}
                  {p.achievementCount > 0 && (
                    <div className="flex flex-col items-center" style={{ minWidth: 24 }}>
                      <span className="text-xs font-black text-gray-800 leading-tight">🏅{p.achievementCount}</span>
                      <span className="text-gray-400 uppercase leading-tight" style={{ fontSize: "9px" }}>ДОС</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating & Badge Info Panel */}
      <details className="mb-3 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer font-semibold text-sm text-gray-600 select-none hover:bg-gray-100 transition-colors flex items-center gap-2">
          <span>ℹ️</span> Як розраховується рейтинг і досягнення?
        </summary>
        <div className="px-4 pb-4 pt-2 space-y-4" style={{ zoom: "1.45" }}>

          {/* Rating formula */}
          <div>
            <div className="font-bold text-gray-700 mb-1 text-sm">📊 Формула рейтингу</div>
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 font-mono text-sm text-gray-800">
              Рейтинг = 50 + ОЧ×1.8 + РЕБ×1.2 + ПЕР×1.5 + ПЕР.М×2.0 + БЛК×1.8
            </div>
            <div className="text-xs text-gray-500 mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
              <span>ОЧ — середні очки</span>
              <span>РЕБ — підбирання</span>
              <span>ПЕР — передачі</span>
              <span>ПЕР.М — перехоплення</span>
              <span>БЛК — блок-шоти</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded font-bold text-white" style={{ background: "linear-gradient(135deg,#b8860b,#ffd700,#b8860b)", color: "#4a3000" }}>🥇 Золото ≥ 85</span>
              <span className="px-2 py-0.5 rounded font-bold text-white" style={{ background: "linear-gradient(135deg,#708090,#c0c0c0,#708090)", color: "#2d3748" }}>🥈 Срібло ≥ 75</span>
              <span className="px-2 py-0.5 rounded font-bold text-white" style={{ background: "linear-gradient(135deg,#8B4513,#cd7f32,#8B4513)", color: "#2d1b00" }}>🥉 Бронза &lt; 75</span>
            </div>
          </div>

          {/* MVP */}
          <div>
            <div className="font-bold text-gray-700 mb-1 text-sm">👑 MVP сезону</div>
            <div className="text-xs text-gray-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              MVP визначається автоматично — це гравець з найвищим рейтингом серед усіх учасників сезону. Оновлюється після кожної внесеної гри.
            </div>
          </div>

          {/* Badges table */}
          <div>
            <div className="font-bold text-gray-700 mb-2 text-sm">🏅 Умови розблокування досягнень</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-200">Досягнення</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-200">Умова (розблоковується автоматично)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["🏹", "Снайпер",             "20+ очок в одній грі"],
                    ["⭐", "Трипл-дабл",           "10+ очок, підбирань і передач в одній грі"],
                    ["🛡️", "Залізний захист",      "5+ блок-шотів в одній грі"],
                    ["🎯", "Розігруючий",          "7+ передач в одній грі"],
                    ["💪", "Король підбирань",     "10+ підбирань в одній грі"],
                    ["📈", "Стабільний",           "10+ очок у 3 іграх поспіль"],
                    ["🤝", "Командний гравець",    "Середнє 5+ передач за весь сезон"],
                  ].map(([icon, name, cond]) => (
                    <tr key={name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-200 font-semibold whitespace-nowrap">{icon} {name}</td>
                      <td className="px-3 py-2 border border-gray-200 text-gray-600">{cond}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-500 mt-1.5">Досягнення відкриваються автоматично щойно гравець виконає умову — жодного ручного втручання не потрібно.</div>
          </div>

          {/* HP system */}
          <div>
            <div className="font-bold text-gray-700 mb-2 text-sm">⚡ Система HP (Health Points)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-orange-50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-200">Дія</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-200">HP</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Реєстрація в Чат ЛДБЛ", "+25 HP"],
                    ["Зайти на сайт + написати повідомлення в чаті (раз на 24 год)", "+15 HP"],
                    ["Запросити користувача за реферальним посиланням", "+50 HP (власнику посилання)"],
                    ["🏆 Амбасадор клубу", "100 HP"],
                    ["👑 Рекрутер", "300 HP"],
                    ["🔥 Легенда ліги", "1000 HP"],
                  ].map(([action, hp]) => (
                    <tr key={action} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-200 text-gray-700">{action}</td>
                      <td className="px-3 py-2 border border-gray-200 font-bold text-orange-600">{hp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </details>

      {/* Cards — fixed sizes, no Image fill, no layout thrashing */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(169px, 1fr))", gap: "12px" }}>
        {filtered.map((player) => {
          const s = TIER[player.tier];
          return (
            <Link key={player.id} href={`/players/${player.id}`} style={{ display: "block", textDecoration: "none" }}>
              <div style={{ background: s.bg, border: `2px solid ${s.border}`, borderRadius: "14px", overflow: "hidden", height: "286px", display: "flex", flexDirection: "column" }}>

                {/* Top row: rating + position */}
                <div style={{ padding: "6px 8px 2px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontWeight: 900, fontSize: "44px", color: s.text, lineHeight: 1 }}>{player.rating}</span>
                  <span style={{ background: s.badge, color: "white", fontSize: "20px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>
                    {player.position || "—"}
                  </span>
                </div>

                {/* Photo placeholder — fixed height, no layout recalc */}
                <div style={{ height: "117px", margin: "0 6px", borderRadius: "10px", background: "rgba(0,0,0,0.18)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  {player.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px" }} />
                  ) : (
                    <span style={{ fontSize: "52px", fontWeight: 900, color: s.text, opacity: 0.45 }}>
                      {player.firstName[0]}{player.lastName[0]}
                    </span>
                  )}
                  <span style={{ position: "absolute", top: "4px", left: "4px", width: "20px", height: "20px", borderRadius: "50%", background: s.badge, color: "white", fontSize: "20px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {player.number}
                  </span>
                </div>

                {/* Name */}
                <div style={{ padding: "4px 6px 0", textAlign: "center", color: s.text, flexShrink: 0 }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.firstName}</div>
                  <div style={{ fontSize: "24px", fontWeight: 900, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.lastName}</div>
                  <div style={{ fontSize: "20px", opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.team.name.split(" ")[0]}</div>
                </div>

                {/* Stats */}
                <div style={{ margin: "4px 6px 2px", borderRadius: "8px", background: "rgba(0,0,0,0.15)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", flexShrink: 0 }}>
                  {([["ОЧ", player.avgPts], ["РЕБ", player.avgReb], ["ПЕР", player.avgAst], ["БЛК", player.avgBlk]] as [string, number][]).map(([label, val]) => (
                    <div key={label} style={{ textAlign: "center", padding: "3px 0" }}>
                      <div style={{ fontWeight: 900, fontSize: "24px", color: s.text, lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: "18px", opacity: 0.55, color: s.text, lineHeight: 1 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {/* Achievement count */}
                {player.achievementCount > 0 && (
                  <div style={{ margin: "2px 6px 4px", textAlign: "center", fontSize: "18px", color: s.text, opacity: 0.75 }}>
                    🏅 {player.achievementCount}/{BADGES.length}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">Гравці не знайдені</div>
      )}
    </div>
  );
}
