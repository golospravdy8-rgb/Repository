import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

export const metadata = { title: "Медіа — ЛДБЛ" };
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  highlights: "Хайлайти",
  full: "Повний матч",
  moments: "Кращі моменти",
};

type Album = { gameId: number; photos: string[]; coverPhoto: string | null; createdAt: string };

async function getGallery(): Promise<Album[]> {
  try {
    const raw = await readFile(path.join(process.cwd(), "lib", "gallery.data.json"), "utf-8");
    const data = JSON.parse(raw) as { albums: Album[] };
    return data.albums.filter((a) => a.photos.length > 0);
  } catch {
    return [];
  }
}

export default async function MediaPage() {
  const [videos, albums] = await Promise.all([
    prisma.video.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" } }),
    getGallery(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" style={{ zoom: 0.8 }}>
      <h1 className="text-xl font-black mb-1" style={{ color: "#1e2a4a" }}>Медіа</h1>
      <p className="text-gray-500 mb-10">Відео матчів, хайлайти та фотогалерея ЛДБЛ</p>

      {/* ── Відео ── */}
      <section className="mb-14">
        <h2 className="text-xl font-black mb-5 flex items-center gap-3" style={{ color: "#1e2a4a" }}>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm" style={{ backgroundColor: "#f46f10" }}>▶</span>
          Відео
        </h2>

        {videos.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
            Відео скоро з&apos;являться. Завантажте перше через Редактор сайту.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div key={video.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
                  <video
                    src={video.url}
                    controls
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white px-2 py-0.5 rounded" style={{ backgroundColor: "#f46f10" }}>
                      {TYPE_LABELS[video.type] ?? video.type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(video.publishedAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}
                    </span>
                  </div>
                  <h3 className="font-black text-gray-800 text-sm leading-tight">{video.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Фото ── */}
      <section>
        <h2 className="text-xl font-black mb-5 flex items-center gap-3" style={{ color: "#1e2a4a" }}>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm" style={{ backgroundColor: "#1e2a4a" }}>📷</span>
          Фото
        </h2>

        {albums.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
            Фотографії скоро з&apos;являться. Додайте їх через Редактор сайту.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => (
              <div key={album.gameId} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                {/* Cover photo */}
                <div className="relative bg-gray-100" style={{ aspectRatio: "4/3" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={album.coverPhoto ?? album.photos[0]}
                    alt={`Альбом матчу ${album.gameId}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg">
                    {album.photos.length} фото
                  </div>
                </div>
                {/* Grid preview of remaining photos */}
                {album.photos.length > 1 && (
                  <div className="grid grid-cols-4 gap-0.5 p-0.5 bg-gray-50">
                    {album.photos.slice(1, 5).map((url, i) => (
                      <div key={i} className="relative bg-gray-200" style={{ aspectRatio: "1" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {i === 3 && album.photos.length > 5 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">+{album.photos.length - 5}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
