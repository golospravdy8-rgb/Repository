import StandingsTable from "@/components/public/StandingsTable";
import AgeGroupTabs from "@/components/public/AgeGroupTabs";
import { Suspense } from "react";

export const metadata = { title: "Змагання — ДБЛ" };
export const dynamic = "force-dynamic";

export default async function CompetitionsPage({ searchParams }: { searchParams: Promise<{ ag?: string }> }) {
  const params = await searchParams;
  const ag = params.ag === "older" ? "older" : "younger";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-xl font-black mb-4" style={{ color: "var(--color-heading)" }}>
        Таблиця змагань
      </h1>
      <Suspense>
        <AgeGroupTabs />
      </Suspense>
      <StandingsTable ageGroup={ag} />
    </div>
  );
}
