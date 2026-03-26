import { prisma } from "@/lib/prisma";
import { calculateLeaderStats } from "@/lib/stats-calculator";
import LeadersSection from "@/components/public/LeadersSection";

export const metadata = { title: "Лідери — Ліга ESCULAB" };
export const dynamic = "force-dynamic";

export default async function LeadersPage() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });

  const boxScores = season
    ? await prisma.boxScore.findMany({
        where: { game: { seasonId: season.id, status: "FINAL" } },
        include: {
          player: { select: { firstName: true, lastName: true } },
          team: { select: { name: true, shortName: true } },
        },
      })
    : [];

  const leaders = calculateLeaderStats(boxScores);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-xl font-black mb-1" style={{ color: "var(--color-heading)" }}>
        Лідери сезону
      </h1>
      <LeadersSection leaders={leaders} />
    </div>
  );
}
