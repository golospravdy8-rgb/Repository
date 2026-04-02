import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import PhotoGallery from "./PhotoGallery";

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4" style={{ zoom: 0.75 }}>
      <h1 className="text-lg font-black mb-0.5" style={{ color: "#1e2a4a" }}>Медіа</h1>
      <p className="text-gray-500 mb-5 text-sm">Відео матчів, хайлайти та фотогалерея ЛДБЛ</p>

      <div className="flex gap-6 items-start" style={{ gridTemplateColumns: "1fr 2fr" }}>
        {/* ── Відео ── */}
        <section style={{ flex: "1" }}>
          <h2 className="text-base font-black mb-3 flex items-center gap-2" style={{ color: "#1e2a4a" }}>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-white text-xs" style={{ backgroundColor: "#f46f10" }}>▶</span>
            Відео
          </h2>

          {videos.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">
              Відео скоро з&apos;являться. Завантажте перше через Редактор сайту.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videos.map((video) => (
                <div key={video.id} className="bg-white rounded-xl shadow overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
                    <video
                      src={video.url}
                      controls
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: "#f46f10" }}>
                        {TYPE_LABELS[video.type] ?? video.type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(video.publishedAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 text-xs leading-tight">{video.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Фото ── */}
        <section style={{ flex: "2" }}>
          <h2 className="text-base font-black mb-3 flex items-center gap-2" style={{ color: "#1e2a4a" }}>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-white text-xs" style={{ backgroundColor: "#1e2a4a" }}>📷</span>
            Фото
          </h2>
          <PhotoGallery albums={albums} />
        </section>
      </div>
    </div>
  );
}
