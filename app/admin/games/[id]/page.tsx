import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/site-settings";
import { notFound } from "next/navigation";
import LiveScoreTracker from "@/components/live-tracker/LiveScoreTracker";
import TeamRoster from "@/components/live-tracker/TeamRoster";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminGamePage({ params }: { params: { id: string } }) {
  const gameId = parseInt(params.id);
  if (isNaN(gameId)) notFound();

  const [game, settings] = await Promise.all([
    prisma.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
      awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
      events: {
        include: {
          player: { select: { firstName: true, lastName: true, number: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
    }),
    getSettings(["colors.btnBlue", "colors.btnOrange", "colors.btnNavy", "colors.btnRed",
                 "colors.navy", "colors.orange", "colors.blue", "colors.red"]),
  ]);

  if (!game) notFound();

  const btnBlue   = settings["colors.btnBlue"]   || settings["colors.blue"]   || "#3b82f6";
  const btnOrange = settings["colors.btnOrange"] || settings["colors.orange"] || "#f97316";
  const btnNavy   = settings["colors.btnNavy"]   || settings["colors.navy"]   || "#1a2744";
  const btnRed    = settings["colors.btnRed"]    || settings["colors.red"]    || "#ef4444";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/dashboard" className="hover:text-orange-500 transition-colors">
          Дашборд
        </Link>
        <span>→</span>
        <span className="text-gray-800 font-medium">
          {game.homeTeam.shortName} vs {game.awayTeam.shortName}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main tracker */}
        <div className="lg:col-span-2">
          <LiveScoreTracker game={game} btnBlue={btnBlue} btnOrange={btnOrange} btnNavy={btnNavy} btnRed={btnRed} />
        </div>

        {/* Sidebar — players list */}
        <div className="space-y-4">
          {[game.homeTeam, game.awayTeam].map((team) => (
            <TeamRoster key={team.id} team={team} gameId={gameId} />
          ))}
        </div>
      </div>
    </div>
  );
}
