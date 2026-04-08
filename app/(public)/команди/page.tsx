import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import AgeGroupTabs from "@/components/public/AgeGroupTabs";

export const metadata = { title: "Команди — Ліга ESCULAB" };
export const dynamic = "force-dynamic";

export default async function TeamsPage({ searchParams }: { searchParams: { ag?: string } }) {
  const ag = searchParams.ag === "older" ? "older" : "younger";
  const label = ag === "older" ? "U-16" : "U-14";
  const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } });

  const teams = season
    ? await prisma.team.findMany({
        where: { seasonId: season.id },
        include: {
          _count: { select: { players: true } },
          standing: true,
        },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4" style={{}}>
      <h1 className="text-base font-black mb-1" style={{ color: "var(--color-heading)" }}>
        Команди сезону {season?.name}
      </h1>
      <p className="text-gray-500 mb-3 text-xs">Вікова група: <span className="font-bold" style={{ color: "var(--color-accent)" }}>{label}</span></p>
      <Suspense>
        <AgeGroupTabs />
      </Suspense>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm mb-2 mx-auto overflow-hidden"
              style={{ backgroundColor: "#1a2744" }}
            >
              {team.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                team.shortName.substring(0, 2)
              )}
            </div>
            <h3 className="font-bold text-center text-gray-800 mb-0.5 text-xs leading-tight">{team.name}</h3>
            <p className="text-center text-gray-400 text-[10px] mb-2">{team.shortName}</p>
            <div className="flex justify-around text-center border-t pt-2">
              <div>
                <div className="text-sm font-bold" style={{ color: "var(--color-heading)" }}>
                  {team.standing ? `${team.standing.wins}/${team.standing.losses}` : "—"}
                </div>
                <div className="text-[10px] text-gray-400">П/Пр</div>
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: "var(--color-accent)" }}>
                  {team._count.players}
                </div>
                <div className="text-[10px] text-gray-400">Гравців</div>
              </div>
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <div className="col-span-full bg-white rounded-xl shadow p-12 text-center text-gray-400">
            Команди відсутні
          </div>
        )}
      </div>
    </div>
  );
}
