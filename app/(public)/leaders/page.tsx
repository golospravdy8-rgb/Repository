import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateLeaderStats } from "@/lib/stats-calculator";
import { LeadersContainer } from "@/components/public/leaders/LeadersContainer";
import { LeadersAutoRefresh } from "./LeadersAutoRefresh";

export const metadata = { title: "Лідери — Ліга ESCULAB" };
export const dynamic = "force-dynamic";

export default async function LeadersPage({ searchParams }: { searchParams: { ag?: string } }) {
  const ag = searchParams.ag === "older" ? "older" : "younger";
  const label = ag === "older" ? "U-16" : "U-14";

  const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } }).catch(() => null);
  console.log(`[Leaders] ag=${ag}, season found:`, season?.id);

  const boxScores = season
    ? await prisma.boxScore.findMany({
        where: { game: { seasonId: season.id, status: { in: ["FINISHED", "LIVE"] } } },
        include: {
          player: { select: { firstName: true, lastName: true, photoUrl: true } },
          team: { select: { id: true, name: true, shortName: true } },
        },
      }).catch(() => [])
    : [];
  console.log(`[Leaders] boxScores count:`, boxScores.length);

  const leaders = calculateLeaderStats(boxScores).map(l => ({ ...l, seasonId: season?.id || 0 }));

  return (
    <div className="w-full bg-gray-50 min-h-screen py-8">
      <LeadersAutoRefresh />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-4xl font-black mb-2" style={{ color: "var(--color-heading)" }}>
            Лідери сезону
          </h1>
          <p className="hidden md:block text-gray-600 text-sm">
            Вікова група: <span className="font-bold" style={{ color: "var(--color-accent)" }}>{label}</span>
          </p>

          {/* MOBILE: Age group toggle buttons */}
          <div className="md:hidden flex gap-2 mt-3">
            <Link
              href="/leaders?ag=younger"
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                ag === 'younger'
                  ? 'text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              style={ag === 'younger' ? { backgroundColor: "#1a2744" } : {}}
            >
              🏀 U-14
            </Link>
            <Link
              href="/leaders?ag=older"
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                ag === 'older'
                  ? 'text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              style={ag === 'older' ? { backgroundColor: "#1a2744" } : {}}
            >
              🏀 U-16
            </Link>
          </div>
        </div>

        {/* Основний контент */}
        <LeadersContainer
          initialLeaders={leaders}
          seasonName={season?.name || "Сезон"}
          ageGroupLabel={label}
        />
      </div>
    </div>
  );
}
