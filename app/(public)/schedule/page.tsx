import { prisma } from "@/lib/prisma";
import AgeGroupTabs from "@/components/public/AgeGroupTabs";
import GameCard from "@/components/public/GameCard";
import PlayoffBracket from "@/components/public/PlayoffBracket";
import GroupTables from "@/components/public/GroupTables";
import { Suspense } from "react";
import { Game, Team, Season } from "@prisma/client";

export const metadata = { title: "Розклад — ДБЛ" };
export const dynamic = "force-dynamic";

interface Tour {
  id: number;
  name: string;
  order: number;
  ageGroup: string;
}

interface Group {
  id: number;
  name: string;
  ageGroup: string;
  groupTeams: Array<{
    id: number;
    groupId: number;
    teamId: number;
    team: Team;
  }>;
}

type GameWithDetails = Game & { homeTeam: Team; awayTeam: Team; season: Season | null; tour: Tour | null };

export default async function SchedulePage({ searchParams }: { searchParams: { ag?: string } }) {
  try {
    const ag = searchParams.ag === "older" ? "older" : "younger";
    const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } });

    const [tours, groups, games, groupTables] = await Promise.all([
      prisma.tour.findMany({
        where: { ageGroup: ag },
        orderBy: { order: "asc" },
      }),
      prisma.group.findMany({
        where: { ageGroup: ag },
        include: { groupTeams: { include: { team: true } } },
      }),
      season
        ? await prisma.game.findMany({
            where: { seasonId: season.id },
            orderBy: { scheduledAt: "asc" },
            include: {
              homeTeam: true,
              awayTeam: true,
              season: true,
              tour: true,
            },
          })
        : [],
      prisma.groupTables.findUnique({
        where: { ageGroup: ag },
      }),
    ]);

    const sortedGames = (games as GameWithDetails[]).sort((a, b) => {
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

    // Separate group and playoff games
    const groupGames = sortedGames.filter((g) => !g.stage || g.stage === "group" || g.stage === "groupA" || g.stage === "groupB");
    const groupAGames = groupGames.filter((g) => g.stage === "groupA");
    const groupBGames = groupGames.filter((g) => g.stage === "groupB");
    const playoffGames = sortedGames.filter((g) => g.stage && g.stage !== "group" && g.stage !== "groupA" && g.stage !== "groupB");

    const semifinals = playoffGames.filter((g) => g.stage === "semifinal");
    const finals = playoffGames.filter((g) => g.stage === "final");
    const thirdPlace = playoffGames.filter((g) => g.stage === "third_place");

    // Загрузить плей-офф данные
    let playoff = null;
    try {
      const playoffResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3006"}/api/playoff?ageGroup=${ag}`,
        { cache: "no-store" }
      );
      if (playoffResponse.ok) {
        playoff = await playoffResponse.json();
      }
    } catch (err) {
      console.error("⚠️ Failed to load playoff data:", err);
      playoff = null;
    }

    console.log("📥 Schedule page loaded playoff:", playoff);

    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 16px" }}>
        <h1 className="text-xl font-black mb-1 mt-3" style={{ color: "var(--color-heading)" }}>
          Розклад матчів
        </h1>
        <Suspense>
          <AgeGroupTabs />
        </Suspense>

        {/* 3-column layout: Group A | Group B | Right panel */}
        <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
          {/* Left column: Group A */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px", color: "var(--color-heading)" }}>
              Група A
            </h2>
            {groupAGames.length === 0 ? (
              <p className="text-gray-500">Ігор не знайдено.</p>
            ) : (
              <div className="space-y-4">
                {tours.map((tour) => {
                  const tourGames = groupAGames.filter(g => g.tourId === tour.id);
                  if (tourGames.length === 0) return null;
                  return (
                    <div key={tour.id}>
                      <h3 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "var(--color-heading)" }}>
                        {tour.name}
                      </h3>
                      <div className="space-y-3">
                        {tourGames.map((g) => (
                          <GameCard key={g.id} game={g} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Middle column: Group B */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px", color: "var(--color-heading)" }}>
              Група B
            </h2>
            {groupBGames.length === 0 ? (
              <p className="text-gray-500">Ігор не знайдено.</p>
            ) : (
              <div className="space-y-4">
                {tours.map((tour) => {
                  const tourGames = groupBGames.filter(g => g.tourId === tour.id);
                  if (tourGames.length === 0) return null;
                  return (
                    <div key={tour.id}>
                      <h3 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "var(--color-heading)" }}>
                        {tour.name}
                      </h3>
                      <div className="space-y-3">
                        {tourGames.map((g) => (
                          <GameCard key={g.id} game={g} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column: Tables + Playoff */}
          <div style={{ width: "300px", flexShrink: 0 }}>
            <div style={{ position: "sticky", top: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Group Tables */}
              <GroupTables groupTables={groupTables} />

              {/* Playoff bracket */}
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "12px", color: "var(--color-heading)" }}>
                  🏆 Плей-офф
                </h2>
                <PlayoffBracket playoff={playoff} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("SchedulePage error:", error);
    throw error;
  }
}
