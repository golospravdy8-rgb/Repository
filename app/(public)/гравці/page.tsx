import { prisma } from "@/lib/prisma";

export const metadata = { title: "Гравці — Ліга ESCULAB" };
export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });

  const players = season
    ? await prisma.player.findMany({
        where: { team: { seasonId: season.id } },
        include: { team: true },
        orderBy: [{ team: { name: "asc" } }, { lastName: "asc" }],
      })
    : [];

  const grouped = players.reduce<Record<string, typeof players>>(
    (acc, p) => {
      const key = p.team.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    },
    {}
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" style={{}}>
      <h1 className="text-xl font-black mb-1" style={{ color: "var(--color-heading)" }}>
        Гравці
      </h1>

      <div className="space-y-8">
        {Object.entries(grouped).map(([teamName, teamPlayers]) => (
          <div key={teamName} className="bg-white rounded-xl shadow overflow-hidden">
            <div
              className="px-6 py-4 text-white font-bold"
              style={{ backgroundColor: "#1a2744" }}
            >
              {teamName}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-gray-500 uppercase text-xs">
                    <th className="px-4 py-3 text-center w-16">#</th>
                    <th className="px-4 py-3 text-left">Ім&apos;я</th>
                    <th className="px-4 py-3 text-left">Прізвище</th>
                    <th className="px-4 py-3 text-center">Позиція</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPlayers.map((player) => (
                    <tr key={player.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--color-accent)" }}>
                        {player.number}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{player.firstName}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{player.lastName}</td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">
                        {player.position ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {players.length === 0 && (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
            Гравці відсутні
          </div>
        )}
      </div>
    </div>
  );
}
