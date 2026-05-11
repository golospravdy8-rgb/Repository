import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GameGalleryPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId: rawGameId } = await params;
  let galleryData: any = { albums: [] };
  try {
    galleryData = JSON.parse(require('fs').readFileSync(require('path').join(process.cwd(), 'lib', 'gallery.data.json'), 'utf-8'));
  } catch {
    notFound();
  }
  const gameId = parseInt(rawGameId);
  if (isNaN(gameId)) notFound();

  const album = galleryData.albums.find((a: any) => a.gameId === gameId);
  if (!album) notFound();

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { homeTeam: true, awayTeam: true },
  }).catch(() => null);

  const title = game
    ? `${game.homeTeam.name} vs ${game.awayTeam.name}`
    : `Матч #${gameId}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/gallery" className="text-sm text-gray-500 hover:text-gray-700 mb-6 block">← Всі альбоми</Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black" style={{ color: "#1e2a4a" }}>{title}</h1>
          {game && (
            <p className="text-gray-500 mt-1">
              {new Date(game.scheduledAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
              {game.status === "FINAL" && ` · Рахунок: ${game.homeScore} : ${game.awayScore}`}
            </p>
          )}
        </div>
        <div className="text-sm text-gray-400">{album.photos.length} фото</div>
      </div>

      {album.photos.length > 0 ? (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
          {album.photos.map((photo: string, i: number) => (
            <div key={i} className="break-inside-avoid rounded-xl overflow-hidden shadow hover:shadow-md transition-shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={`Фото ${i + 1}`}
                className="w-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl border-2 border-dashed p-20 text-center"
          style={{ borderColor: "#f46f10", backgroundColor: "rgba(244,111,16,0.04)" }}
        >
          <div className="text-5xl mb-4">📷</div>
          <h3 className="text-xl font-black text-gray-600 mb-2">Фото скоро з&apos;являться</h3>
          <p className="text-gray-400 text-sm">Фотографії цього матчу будуть додані найближчим часом</p>
        </div>
      )}
    </div>
  );
}
