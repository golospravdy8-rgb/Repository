import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/site-settings";
import { notFound } from "next/navigation";
import LiveScoreTracker from "@/components/live-tracker/LiveScoreTracker";
import FibaPanelWrapper from "@/components/admin/FibaPanelWrapper";

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
        onCourt: true,
        boxScores: {
          include: { player: true },
        },
      },
    }).catch(() => null),
    getSettings(["colors.btnBlue", "colors.btnOrange", "colors.btnNavy", "colors.btnRed",
                 "colors.navy", "colors.orange", "colors.blue", "colors.red"]),
  ]);

  if (!game) notFound();

  const btnBlue   = settings["colors.btnBlue"]   || settings["colors.blue"]   || "#3b82f6";
  const btnOrange = settings["colors.btnOrange"] || settings["colors.orange"] || "#f97316";
  const btnNavy   = settings["colors.btnNavy"]   || settings["colors.navy"]   || "#1a2744";
  const btnRed    = settings["colors.btnRed"]    || settings["colors.red"]    || "#ef4444";

  return (
    <div style={{ height: "100vh", overflow: "hidden", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflow: "auto", display: "flex" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <LiveScoreTracker game={game} />
        </div>
        <FibaPanelWrapper game={game} />
      </div>
    </div>
  );
}
