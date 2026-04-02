import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = { title: "Галерея — ЛДБЛ" };
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  let galleryData: any = { albums: [] };
  try {
    galleryData = JSON.parse(require('fs').readFileSync(require('path').join(process.cwd(), 'lib', 'gallery.data.json'), 'utf-8'));
  } catch {
    // gallery.data.json відсутній або пошкоджений
  }

  const gameIds = galleryData.albums.map((a: any) => a.gameId) as number[];
  const games = await prisma.game.findMany({
    where: { id: { in: gameIds } },
    include: { homeTeam: true, awayTeam: true },
  }).catch(() => []);
  const gamesMap = Object.fromEntries(games.map((g: any) => [g.id, g]));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-xl font-black mb-1" style={{ color: "#1e2a4a" }}>Фотогалерея матчів</h1>
      <p className="text-gray-500 mb-8">Фотоальбоми всіх матчів сезону</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {galleryData.albums.map((album: any) => {
          const game = gamesMap[album.gameId];
          const hasPhotos = album.photos.length > 0;
          return (
            <Link key={album.gameId} href={`/gallery/${album.gameId}`} className="group block">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                {/* Cover */}
                <div
                  className="relative h-44 flex items-center justify-center"
                  style={{ backgroundColor: "#1e2a4a" }}
                >
                  {album.coverPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={album.coverPhoto} alt="cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <div className="text-5xl mb-2">🏀</div>
                      <div className="text-white/50 text-sm">Фото скоро з&apos;являться</div>
                    </div>
                  )}
                  {/* Photo count badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: "rgba(244,111,16,0.9)" }}>
                    {album.photos.length} фото
                  </div>
                </div>

                <div className="p-4">
                  {game ? (
                    <>
                      <h3 className="font-black text-gray-800 text-base leading-tight">
                        {game.homeTeam.name} vs {game.awayTeam.name}
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        {new Date(game.scheduledAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      {(game.status === "FINAL" || game.status === "LIVE") && (
                        <p className="text-xs text-gray-400 mt-1">Рахунок: {game.homeScore} : {game.awayScore}</p>
                      )}
                    </>
                  ) : (
                    <h3 className="font-black text-gray-800">Матч #{album.gameId}</h3>
                  )}
                  <div className="mt-3 text-sm font-semibold" style={{ color: "#f46f10" }}>
                    {hasPhotos ? "Переглянути фото →" : "📷 Фото скоро з'являться"}
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
