import { prisma } from "@/lib/prisma";
import { calculateLeaderStats } from "@/lib/stats-calculator";
import LeadersSection from "@/components/public/LeadersSection";

export const metadata = { title: "Лідери — Ліга ESCULAB" };
export const dynamic = "force-dynamic";

export default async function LeadersPage({ searchParams }: { searchParams: { ag?: string } }) {
  const ag = searchParams.ag === "older" ? "older" : "younger";
  const label = ag === "older" ? "U-16" : "U-14";

  const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } }).catch(() => null);
  console.log(`[Leaders] ag=${ag}, season found:`, season?.id);

  const boxScores = season
    ? await prisma.boxScore.findMany({
        where: { game: { seasonId: season.id, status: "FINAL" } },
        include: {
          player: { select: { firstName: true, lastName: true, photoUrl: true } },
          team: { select: { name: true, shortName: true } },
        },
      }).catch(() => [])
    : [];
  console.log(`[Leaders] boxScores count:`, boxScores.length);

  const leaders = calculateLeaderStats(boxScores);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <h1 className="text-sm font-black mb-0.5" style={{ color: "var(--color-heading)" }}>
        Лідери сезону
      </h1>
      <p className="text-gray-500 mb-2 text-xs">Вікова група: <span className="font-bold" style={{ color: "var(--color-accent)" }}>{label}</span></p>
      {leaders.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          Статистика з&apos;явиться після перших ігор групи &quot;{label}&quot;
        </div>
      ) : (
        <LeadersSection leaders={leaders} />
      )}
    </div>
  );
}
