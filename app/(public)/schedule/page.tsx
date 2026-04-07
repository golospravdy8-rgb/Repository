import { prisma } from "@/lib/prisma";
import AgeGroupTabs from "@/components/public/AgeGroupTabs";
import GameCard from "@/components/public/GameCard";
import { Suspense } from "react";

export const metadata = { title: "Розклад — ДБЛ" };
export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ ag?: string }> }) {
  try {
    const params = await searchParams;
    const ag = params.ag === "older" ? "older" : "younger";
    const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } });
    const games = season
      ? await prisma.game.findMany({
          where: { seasonId: season.id },
          orderBy: { scheduledAt: "asc" },
          include: {
            homeTeam: true,
            awayTeam: true,
            season: true,
          },
        })
      : [];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <h1 className="text-xl font-black mb-1" style={{ color: "var(--color-heading)" }}>
          Розклад матчів
        </h1>
        <Suspense>
          <AgeGroupTabs />
        </Suspense>
        <div className="mt-4 space-y-3">
          {games.length === 0 ? (
            <p className="text-gray-500">Ігор не знайдено.</p>
          ) : (
            games.map((g) => <GameCard key={g.id} game={g} />)
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("SchedulePage error:", error);
    throw error;
  }
}
