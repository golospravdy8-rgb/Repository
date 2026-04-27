import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ScheduleTable({ ageGroup }: { ageGroup?: string }) {
  const ag = ageGroup || "younger";
  const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } }).catch(() => null);

  if (!season) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
        Матчі ще не заплановані для цієї вікової групи
      </div>
    );
  }

  const games = await prisma.game.findMany({
    where: { seasonId: season.id },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { scheduledAt: "asc" },
  }).catch(() => []);

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: "#1a2744" }} className="text-white">
              <th className="px-3 py-2 text-left">Дата</th>
              <th className="px-3 py-2 text-left">Час</th>
              <th className="px-3 py-2 text-right">Господарі</th>
              <th className="px-3 py-2 text-center w-16">Рахунок</th>
              <th className="px-3 py-2 text-left">Гості</th>
              <th className="px-3 py-2 text-center">Статус</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 text-gray-600">
                  {new Date(game.scheduledAt).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {new Date(game.scheduledAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">{game.homeTeam.name}</td>
                <td className="px-3 py-2 text-center">
                  {game.status !== "SCHEDULED" ? (
                    <Link href={`/game/${game.id}`} className="font-black text-sm hover:text-orange-500 transition-colors" style={{ color: "#1a2744" }}>
                      {game.homeScore}:{game.awayScore}
                    </Link>
                  ) : (
                    <span className="text-gray-400">—:—</span>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold text-gray-800">{game.awayTeam.name}</td>
                <td className="px-3 py-2 text-center">
                  {game.status === "LIVE" && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">LIVE</span>}
                  {game.status === "FINAL" && <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">ФІНАЛ</span>}
                  {game.status === "SCHEDULED" && <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">Заплановано</span>}
                </td>
              </tr>
            ))}
            {games.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">Матчів не знайдено</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
