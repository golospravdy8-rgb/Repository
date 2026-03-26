import { prisma } from "@/lib/prisma";

export const metadata = { title: "Медіа — ЛДБЛ" };
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  highlights: "Хайлайти",
  full: "Повний матч",
  moments: "Кращі моменти",
};

export default async function MediaPage() {
  const videos = await prisma.video.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-xl font-black mb-1" style={{ color: "#1e2a4a" }}>Медіа</h1>
      <p className="text-gray-500 mb-8">Відео матчів та хайлайти ЛДБЛ</p>

      {videos.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-16 text-center text-gray-400">
          Відео скоро з&apos;являться
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({ video }: { video: { id: number; title: string; url: string; thumbnail: string | null; type: string; publishedAt: Date } }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <VideoPlayer url={video.url} />
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
  );
}

function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <video
        src={url}
        controls
        className="w-full h-full object-contain"
        preload="metadata"
      />
    </div>
  );
}
