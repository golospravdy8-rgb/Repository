import { prisma } from "@/lib/prisma";

export const metadata = { title: "Команди — Ліга ESCULAB" };
export const dynamic = "force-dynamic";

export default async function TeamsPage({ searchParams }: { searchParams: { ag?: string } }) {
  const ag = searchParams.ag === "older" ? "older" : "younger";
  const label = ag === "older" ? "U-16" : "U-14";

  const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } }).catch(() => null);

  const teams = season
    ? await prisma.team.findMany({
        where: { seasonId: season.id },
        include: {
          _count: { select: { players: true } },
          standing: true,
        },
        orderBy: { name: "asc" },
      }).catch(() => [])
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" style={{ zoom: 0.9 }}>
      <h1 className="text-xl font-black mb-1" style={{ color: "var(--color-heading)" }}>
        Команди сезону {season?.name}
      </h1>
      <p className="text-gray-500 mb-6 text-sm">Вікова група: <span className="font-bold" style={{ color: "var(--color-accent)" }}>{label}</span></p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-6">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center font-black text-white text-2xl mb-4 mx-auto overflow-hidden"
              style={{ backgroundColor: "#1a2744" }}
            >
              {team.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                team.shortName.substring(0, 2)
              )}
            </div>
            <h3 className="font-bold text-center text-gray-800 mb-1">{team.name}</h3>
            <p className="text-center text-gray-400 text-xs mb-4">{team.shortName}</p>
            <div className="flex justify-around text-center border-t pt-4">
              <div>
                <div className="text-lg font-bold" style={{ color: "var(--color-heading)" }}>
                  {team.standing ? `${team.standing.wins}/${team.standing.losses}` : "—"}
                </div>
                <div className="text-xs text-gray-400">П/Пр</div>
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: "var(--color-accent)" }}>
                  {team._count.players}
                </div>
                <div className="text-xs text-gray-400">Гравців</div>
              </div>
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <div className="col-span-full bg-white rounded-xl shadow p-12 text-center text-gray-400">
            Команди ще не додані для групи &quot;{label}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
