import { prisma } from "@/lib/prisma";
import TeamCard from "./TeamCard";
import AgeGroupTabs from "@/components/public/AgeGroupTabs";
import { Suspense } from "react";

export const metadata = { title: "Команди — Ліга ESCULAB" };
export const dynamic = "force-dynamic";

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ ag?: string }> }) {
  const params = await searchParams;
  const ag = params.ag === "older" ? "older" : "younger";
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      <h1 className="text-xl font-black mb-1" style={{ color: "var(--color-heading)" }}>
        Команди сезону {label} {season?.name ?? ""}
      </h1>
      <Suspense>
        <AgeGroupTabs />
      </Suspense>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24, marginTop: 16 }}>
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            id={team.id}
            name={team.name}
            shortName={team.shortName}
            logoUrl={team.logoUrl}
            wins={team.standing?.wins ?? null}
            losses={team.standing?.losses ?? null}
            playerCount={team._count.players}
          />
        ))}
        {teams.length === 0 && (
          <div className="col-span-full bg-white rounded-lg shadow p-8 text-center text-gray-400">
            Команди ще не додані для групи &quot;{label}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
