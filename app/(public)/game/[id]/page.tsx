import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const revalidate = 10;

export default async function GamePage({ params }: { params: { id: string } }) {
  const gameId = parseInt(params.id);
  if (isNaN(gameId)) notFound();

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: true,
      awayTeam: true,
      events: {
        include: { player: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      boxScores: {
        include: { player: true, team: true },
        orderBy: { points: "desc" },
      },
    },
  });

  if (!game) notFound();

  const isLive = game.status === "LIVE";
  const isFinal = game.status === "FINAL";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Score header */}
      <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
        <div
          className="px-6 py-3 flex items-center justify-between text-white text-sm"
          style={{ backgroundColor: "#1a2744" }}
        >
          <span className="font-semibold">
            {new Date(game.scheduledAt).toLocaleDateString("uk-UA", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <a
            href={`/api/pdf/game/${game.id}`}
            download={`match-${game.id}-protocol.pdf`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "#f46f10" }}
          >
            📄 Протокол PDF
          </a>
          {isLive && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              LIVE • Q{game.quarter}
            </span>
          )}
          {isFinal && (
            <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">ФІНАЛ</span>
          )}
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 text-center">
              <div className="font-black text-xl text-gray-800 mb-1">{game.homeTeam.name}</div>
              <div className="text-gray-400 text-sm">{game.homeTeam.shortName}</div>
            </div>
            <div className="text-center flex-shrink-0">
              {isFinal || isLive ? (
                <div className="text-5xl font-black" style={{ color: "var(--color-heading)" }}>
                  {game.homeScore} : {game.awayScore}
                </div>
              ) : (
                <div className="text-3xl font-bold text-gray-300">VS</div>
              )}
              {isLive && (
                <div className="text-sm text-gray-500 mt-2">Чверть {game.quarter}</div>
              )}
            </div>
            <div className="flex-1 text-center">
              <div className="font-black text-xl text-gray-800 mb-1">{game.awayTeam.name}</div>
              <div className="text-gray-400 text-sm">{game.awayTeam.shortName}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Box Scores */}
      {game.boxScores.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
          <div
            className="px-6 py-4 text-white font-bold"
            style={{ backgroundColor: "#1a2744" }}
          >
            Box Score
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-gray-500 uppercase text-xs">
                  <th className="px-4 py-3 text-left">Гравець</th>
                  <th className="px-4 py-3 text-left">Команда</th>
                  <th className="px-4 py-3 text-center">Оч</th>
                  <th className="px-4 py-3 text-center">Пд</th>
                  <th className="px-4 py-3 text-center">Пе</th>
                  <th className="px-4 py-3 text-center">Пр</th>
                  <th className="px-4 py-3 text-center">Бл</th>
                  <th className="px-4 py-3 text-center">Фо</th>
                  <th className="px-4 py-3 text-center">Хв</th>
                </tr>
              </thead>
              <tbody>
                {game.boxScores.map((bs) => (
                  <tr key={bs.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      #{bs.player.number} {bs.player.firstName} {bs.player.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{bs.team.shortName}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--color-heading)" }}>{bs.points}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{bs.rebounds}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{bs.assists}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{bs.steals}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{bs.blocks}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{bs.fouls}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{bs.minutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events log */}
      {game.events.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div
            className="px-6 py-4 text-white font-bold"
            style={{ backgroundColor: "#1a2744" }}
          >
            Протокол матчу
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {game.events.map((event) => (
              <div key={event.id} className="px-6 py-3 flex items-center gap-3 text-sm">
                <span className="text-gray-400 text-xs w-10 flex-shrink-0">Q{event.quarter}</span>
                {event.type === "POINTS" && (
                  <span
                    className="font-bold px-2 py-0.5 rounded text-white text-xs"
                    style={{ backgroundColor: event.points === 3 ? "#1a2744" : event.points === 2 ? "#f97316" : "#3b82f6" }}
                  >
                    +{event.points}
                  </span>
                )}
                {event.type === "FOUL" && (
                  <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded text-xs">ФОЛ</span>
                )}
                {event.type === "TIMEOUT" && (
                  <span className="bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded text-xs">ТАЙМ-АУТ</span>
                )}
                {event.type === "QUARTER_END" && (
                  <span className="bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded text-xs">КІНЕЦЬ ЧВЕРТІ</span>
                )}
                {event.player && (
                  <span className="text-gray-700 font-medium">
                    #{event.player.number} {event.player.firstName} {event.player.lastName}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
