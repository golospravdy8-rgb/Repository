import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default async function VideoPage({ params }: { params: { id: string } }) {
  let highlightsData: any = { videos: [] };
  try {
    highlightsData = JSON.parse(require('fs').readFileSync(require('path').join(process.cwd(), 'lib', 'highlights.data.json'), 'utf-8'));
  } catch {
    notFound();
  }
  const videoId = parseInt(params.id);
  if (isNaN(videoId)) notFound();

  const video = highlightsData.videos.find((v: any) => v.id === videoId);
  if (!video) notFound();

  const game = await prisma.game.findUnique({
    where: { id: video.gameId },
    include: { homeTeam: true, awayTeam: true },
  }).catch(() => null);

  const youtubeId = video.url ? getYouTubeId(video.url) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/highlights" className="text-sm text-gray-500 hover:text-gray-700 mb-6 block">← Всі відео</Link>

      <h1 className="text-2xl font-black mb-2" style={{ color: "#1e2a4a" }}>{video.title}</h1>
      {game && (
        <p className="text-gray-500 text-sm mb-6">
          {game.homeTeam.name} vs {game.awayTeam.name} ·{" "}
          {new Date(game.scheduledAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}

      {/* Video player */}
      {youtubeId ? (
        <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ paddingBottom: "56.25%", height: 0 }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : video.url ? (
        <video
          src={video.url}
          controls
          className="w-full rounded-2xl shadow-xl"
        />
      ) : (
        <div
          className="rounded-2xl border-2 border-dashed p-20 text-center"
          style={{ borderColor: "#f46f10", backgroundColor: "rgba(244,111,16,0.04)" }}
        >
          <div className="text-5xl mb-4">🎥</div>
          <h3 className="text-xl font-black text-gray-600 mb-2">Відео скоро з&apos;явиться</h3>
          <p className="text-gray-400 text-sm">Запис матчу буде завантажений найближчим часом</p>
        </div>
      )}
    </div>
  );
}
