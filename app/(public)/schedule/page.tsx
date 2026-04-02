import { prisma } from "@/lib/prisma";
import AgeGroupTabs from "@/components/public/AgeGroupTabs";
import GameCard from "@/components/public/GameCard";
import { Suspense } from "react";

export const metadata = { title: "Розклад — ДБЛ" };
export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ ag?: string }>;
}) {
  const params = await searchParams;
  const ag = params.ag === "older" ? "older" : "younger";

  let games: Awaited<ReturnType<typeof prisma.game.findMany<{
    include: { homeTeam: true; awayTeam: true; season: true };
  }>>> = [];
  let season = null;

  try {
    season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } });
    if (season) {
      games = await prisma.game.findMany({
        where: { seasonId: season.id },
        orderBy: { scheduledAt: "asc" },
        include: {
          homeTeam: true,
          awayTeam: true,
          season: true,
        },
      });
    }
    console.log(`[schedule] ag=${ag} seasonId=${season?.id} games=${games.length}`);
  } catch (err) {
    console.error("[schedule] Prisma error:", err);
    throw err;
  }

  const upcoming = games.filter((g) => g.status !== "FINAL");
  const finished = games.filter((g) => g.status === "FINAL").reverse();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-xl font-black mb-1" style={{ color: "var(--color-heading)" }}>
        Розклад матчів
      </h1>
      <Suspense>
        <AgeGroupTabs />
      </Suspense>

      {games.length === 0 ? (
        <p className="text-gray-500 mt-6">Ігор не знайдено.</p>
      ) : (
        <div className="mt-4 space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-gray-700 mb-3">
                Заплановані матчі ({upcoming.length})
              </h2>
              <div className="flex flex-wrap gap-3">
                {upcoming.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </section>
          )}

          {finished.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-gray-700 mb-3">
                Зіграні матчі ({finished.length})
              </h2>
              <div className="flex flex-wrap gap-3">
                {finished.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
