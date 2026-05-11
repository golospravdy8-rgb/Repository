import type { GameEvent, Player, Team } from "@prisma/client";

type EventWithDetails = GameEvent & {
  player: (Pick<Player, "firstName" | "lastName" | "number">) | null;
};

interface Props {
  events: EventWithDetails[];
  homeTeam: Pick<Team, "id" | "name">;
  awayTeam: Pick<Team, "id" | "name">;
  homeScore: number;
  awayScore: number;
}

export default function ActionLog({ events, homeTeam, awayTeam }: Props) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div
        className="px-4 py-3 text-white font-bold text-sm"
        style={{ backgroundColor: "#1a2744" }}
      >
        Action Log
      </div>
      <div className="divide-y max-h-72 overflow-y-auto">
        {events.length === 0 && (
          <div className="px-4 py-6 text-center text-gray-400 text-sm">
            Подій поки немає
          </div>
        )}
        {events.map((event) => {
          const teamName =
            event.teamId === homeTeam.id ? homeTeam.name : awayTeam.name;

          return (
            <div key={event.id} className="px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-gray-50">
              <span className="text-xs text-gray-400 w-6 flex-shrink-0">Q{event.quarter}</span>

              {event.type === "POINTS" && event.points != null && (
                <span
                  className="font-bold text-white text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    backgroundColor:
                      event.points === 3 ? "#1a2744" : event.points === 2 ? "#f97316" : "#3b82f6",
                  }}
                >
                  +{event.points}
                </span>
              )}
              {event.type === "FOUL" && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                  ФОЛ
                </span>
              )}
              {event.type === "TIMEOUT" && (
                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                  ТАЙМ
                </span>
              )}
              {event.type === "QUARTER_END" && (
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                  КІНЕЦЬ
                </span>
              )}
              {event.type === "REBOUND" && (
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                  ПДБ
                </span>
              )}
              {event.type === "ASSIST" && (
                <span className="bg-green-100 text-green-600 text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                  ПЕР
                </span>
              )}
              {event.type === "STEAL" && (
                <span className="bg-purple-100 text-purple-600 text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                  ПРХ
                </span>
              )}
              {event.type === "BLOCK" && (
                <span className="bg-amber-100 text-amber-600 text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                  БЛК
                </span>
              )}

              <span className="text-gray-600 min-w-0 truncate">
                {event.player && (
                  <span className="font-medium text-gray-800">
                    #{event.player.number} {event.player.lastName}{" "}
                  </span>
                )}
                <span className="text-gray-400 text-xs">({teamName})</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
