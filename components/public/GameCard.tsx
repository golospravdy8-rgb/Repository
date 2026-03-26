import Link from "next/link";
import type { Game, Team } from "@prisma/client";

type GameWithTeams = Game & { homeTeam: Team; awayTeam: Team };

export default function GameCard({ game }: { game: GameWithTeams }) {
  const isLive = game.status === "LIVE";
  const isFinal = game.status === "FINAL";

  return (
    <Link href={`/game/${game.id}`} className="block">
      <div className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-5">
        {/* Status badge */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-gray-400">
            {new Date(game.scheduledAt).toLocaleDateString("uk-UA", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isLive && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              LIVE • Q{game.quarter}
            </span>
          )}
          {isFinal && (
            <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              ФІНАЛ
            </span>
          )}
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-right">
            <div className="font-bold text-gray-800 text-sm">{game.homeTeam.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{game.homeTeam.shortName}</div>
          </div>

          <div className="text-center flex-shrink-0">
            {isFinal || isLive ? (
              <div className="text-2xl font-black" style={{ color: "#1a2744" }}>
                {game.homeScore}:{game.awayScore}
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-400">VS</div>
            )}
          </div>

          <div className="flex-1 text-left">
            <div className="font-bold text-gray-800 text-sm">{game.awayTeam.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{game.awayTeam.shortName}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
