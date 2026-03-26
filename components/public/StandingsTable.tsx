import { prisma } from "@/lib/prisma";

export default async function StandingsTable({ limit, ageGroup }: { limit?: number; ageGroup?: string }) {
  const ag = ageGroup || "younger";
  const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } });

  if (!season) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
        Даних ще немає для цієї вікової групи
      </div>
    );
  }

  const standings = await prisma.standing.findMany({
    where: { seasonId: season.id },
    include: { team: true },
    orderBy: [{ wins: "desc" }, { pointsFor: "desc" }],
    take: limit,
  });

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div
        className="px-4 py-2 text-white font-bold text-xs uppercase tracking-wider"
        style={{ backgroundColor: "#1a2744" }}
      >
        Таблиця сезону {season.name}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">Команда</th>
              <th className="px-3 py-2 text-center">І</th>
              <th className="px-3 py-2 text-center">П</th>
              <th className="px-3 py-2 text-center">Пр</th>
              <th className="px-3 py-2 text-center">+/-</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 text-gray-500 font-medium">{i + 1}</td>
                <td className="px-3 py-2 font-semibold text-gray-800">{s.team.name}</td>
                <td className="px-3 py-2 text-center text-gray-600">{s.gamesPlayed}</td>
                <td className="px-3 py-2 text-center font-bold" style={{ color: "#1a2744" }}>
                  {s.wins}
                </td>
                <td className="px-3 py-2 text-center text-gray-600">{s.losses}</td>
                <td className="px-3 py-2 text-center text-gray-600">
                  {s.pointsFor - s.pointsAgainst > 0 ? "+" : ""}
                  {s.pointsFor - s.pointsAgainst}
                </td>
              </tr>
            ))}
            {standings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                  Дані відсутні
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
