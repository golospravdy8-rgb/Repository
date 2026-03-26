import ScheduleTable from "@/components/public/ScheduleTable";
import AgeGroupTabs from "@/components/public/AgeGroupTabs";
import { Suspense } from "react";

export const metadata = { title: "Розклад — ДБЛ" };
export const dynamic = "force-dynamic";

export default function SchedulePage({ searchParams }: { searchParams: { ag?: string } }) {
  const ag = searchParams.ag === "older" ? "older" : "younger";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-xl font-black mb-4" style={{ color: "var(--color-heading)" }}>
        Розклад матчів
      </h1>
      <Suspense>
        <AgeGroupTabs />
      </Suspense>
      <ScheduleTable ageGroup={ag} />
    </div>
  );
}
