"use client";

import { useState } from "react";
import Image from "next/image";

type Album = { gameId: number; photos: string[]; coverPhoto: string | null; createdAt: string };

export default function PhotoGallery({ albums }: { albums: Album[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (albums.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">
        Фото скоро з&apos;являться. Завантажте через Редактор сайту → Медіа / Галерея.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {albums.map((album) => (
          <div key={album.gameId} className="bg-white rounded-xl shadow p-4">
            <p className="text-xs text-gray-400 mb-3">
              {new Date(album.createdAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {album.photos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox(url)}
                  className="relative aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                >
                  <Image src={url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <Image src={lightbox} alt="" width={1200} height={800} className="object-contain max-h-[90vh] rounded-lg" />
          </div>
        </div>
      )}
    </>
  );
}
