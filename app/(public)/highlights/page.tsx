import { prisma } from "@/lib/prisma";
import Link from "next/link";
import highlightsData from "../../../lib/highlights.data.json";

export const metadata = { title: "Відео — ЛДБЛ" };
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  highlights: "Хайлайти",
  full: "Повний матч",
  moments: "Кращі моменти",
};

export default async function HighlightsPage() {
  const gameIds = Array.from(new Set(highlightsData.videos.map((v) => v.gameId)));
  const games = await prisma.game.findMany({
    where: { id: { in: gameIds } },
    include: { homeTeam: true, awayTeam: true },
  });
  const gamesMap = Object.fromEntries(games.map((g) => [g.id, g]));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-xl font-black mb-1" style={{ color: "#1e2a4a" }}>Відео-хайлайти</h1>
      <p className="text-gray-500 mb-8">Найкращі моменти матчів ЛДБЛ</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {highlightsData.videos.map((video) => {
          const game = gamesMap[video.gameId];
          const hasVideo = !!video.url;

          return (
            <Link key={video.id} href={`/highlights/${video.id}`} className="group block">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                {/* Thumbnail */}
                <div
                  className="relative h-44 flex items-center justify-center"
                  style={{ backgroundColor: "#1e2a4a" }}
                >
                  {video.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <div className="text-5xl mb-2">🎥</div>
                      <div className="text-white/50 text-sm">Відео скоро з&apos;явиться</div>
                    </div>
                  )}
                  {/* Type badge */}
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: "rgba(244,111,16,0.9)" }}>
                    {TYPE_LABELS[video.type] || video.type}
                  </div>
                  {/* Play button */}
                  {hasVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: "rgba(244,111,16,0.9)" }}>
                        <span className="text-white text-xl ml-1">▶</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-black text-gray-800 text-sm leading-tight">{video.title}</h3>
                  {game && (
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(game.scheduledAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}
                    </p>
                  )}
                  {video.duration && (
                    <p className="text-gray-400 text-xs">{video.duration}</p>
                  )}
                  <div className="mt-3 text-sm font-semibold" style={{ color: "#f46f10" }}>
                    {hasVideo ? "Дивитись →" : "🎥 Скоро з'явиться"}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
