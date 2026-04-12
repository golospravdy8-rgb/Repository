"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import type { GameRow } from "../SiteEditorClient";

// ── Photo Gallery ──────────────────────────────────────────────────────────────

type Album = { gameId: number; photos: string[]; videos?: string[]; coverPhoto: string | null; createdAt: string };

function AlbumEditor({ album: initialAlbum, game }: { album: Album; game: GameRow | undefined }) {
  const [photos, setPhotos] = useState<string[]>(initialAlbum.photos);
  const [videos, setVideos] = useState<string[]>(initialAlbum.videos || []);
  const [cover, setCover] = useState<string | null>(initialAlbum.coverPhoto);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const title = game
    ? `${game.homeTeam.shortName} vs ${game.awayTeam.shortName}`
    : `Матч #${initialAlbum.gameId}`;

  const date = game
    ? new Date(game.scheduledAt).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })
    : "";

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const available = 10 - photos.length;
    const toUpload = files.slice(0, available);
    if (toUpload.length < files.length) {
      setError(`Можна додати ще ${available} фото (максимум 10)`);
    } else {
      setError("");
    }

    setUploading(true);
    const newPhotoUrls: string[] = [];
    const newVideoUrls: string[] = [];
    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("gameId", String(initialAlbum.gameId));
      try {
        const res = await fetch("/api/gallery", { method: "POST", body: fd, credentials: "include" });
        const data = await res.json();
        if (res.ok && data.url) {
          if (file.type?.startsWith("video/")) {
            newVideoUrls.push(data.url);
          } else {
            newPhotoUrls.push(data.url);
          }
        } else {
          setError(data.error ?? "Помилка завантаження");
        }
      } catch {
        setError("Помилка мережі");
      }
    }
    const updatedPhotos = [...photos, ...newPhotoUrls];
    const updatedVideos = [...videos, ...newVideoUrls];
    setPhotos(updatedPhotos);
    setVideos(updatedVideos);
    if (!cover && updatedPhotos.length > 0) setCover(updatedPhotos[0]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setUploading(false);
    e.target.value = "";
  }

  async function handleDelete(url: string) {
    const res = await fetch("/api/gallery", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: initialAlbum.gameId, url }),
      credentials: "include",
    });
    if (res.ok) {
      const updated = photos.filter((p) => p !== url);
      setPhotos(updated);
      if (cover === url) setCover(updated[0] ?? null);
    }
  }

  async function handleSetCover(url: string) {
    const res = await fetch("/api/gallery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: initialAlbum.gameId, url }),
      credentials: "include",
    });
    if (res.ok) setCover(url);
  }

  return (
    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-gray-800 text-sm">{title}</div>
          {date && <div className="text-xs text-gray-400">{date}</div>}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              photos.length >= 10 ? "bg-red-100 text-red-600" : "bg-orange-50 text-orange-600"
            }`}
          >
            {photos.length}/10 фото
          </span>
          {photos.length < 10 && (
            <label
              className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold text-white ${
                uploading ? "opacity-60 cursor-wait" : "hover:opacity-90"
              }`}
              style={{ backgroundColor: "#1a2744" }}
            >
              {uploading ? "Завантаження..." : "+ Додати фото"}
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>

      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
      {saved && <div className="text-xs text-green-600 mb-2 font-medium">✓ Фото збережено!</div>}

      {photos.length > 0 || videos.length > 0 ? (
        <div>
          {photos.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-600 mb-2">📷 Фотографії ({photos.length})</div>
              <div className="grid grid-cols-5 gap-2">
                {photos.map((url, i) => (
                  <div
                    key={`photo-${i}`}
                    className="relative group rounded-lg overflow-hidden bg-gray-200"
                    style={{ aspectRatio: "1" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`фото ${i + 1}`} className="w-full h-full object-cover" />

                    {cover === url && (
                      <div className="absolute top-1 left-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded leading-tight">
                        обкладинка
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                      {cover !== url && (
                        <button
                          onClick={() => handleSetCover(url)}
                          className="text-[10px] bg-orange-500 text-white px-2 py-1 rounded font-bold"
                        >
                          Обкладинка
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(url)}
                        className="text-[10px] bg-red-500 text-white px-2 py-1 rounded font-bold"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                ))}

                {Array.from({ length: Math.max(0, 10 - photos.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="rounded-lg bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center"
                    style={{ aspectRatio: "1" }}
                  >
                    <span className="text-gray-300 text-xl leading-none">+</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {videos.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">🎬 Відео ({videos.length})</div>
              <div className="space-y-2">
                {videos.map((url, i) => (
                  <div key={`video-${i}`} className="flex items-center gap-2 bg-gray-900 rounded-lg p-2">
                    <video src={url} className="w-12 h-12 rounded object-cover" />
                    <div className="flex-1 min-w-0 text-xs text-gray-300 truncate">{url.split('/').pop()}</div>
                    <button
                      onClick={() => handleDelete(url)}
                      className="text-[10px] bg-red-500 text-white px-2 py-1 rounded font-bold flex-shrink-0"
                    >
                      Видалити
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          Медіа ще не додане. Натисніть &quot;+ Додати фото&quot; або виберіть відео
        </div>
      )}
    </div>
  );
}

// ── Videos ────────────────────────────────────────────────────────────────────

type VideoItem = {
  id: number;
  title: string;
  url: string;
  thumbnail: string | null;
  type: string;
  publishedAt: string;
};

const VIDEO_TYPES = [
  { value: "highlights", label: "Хайлайти" },
  { value: "full", label: "Повний матч" },
  { value: "moments", label: "Кращі моменти" },
];

function VideosSection() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("highlights");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then((d) => setVideos(d.videos ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title.trim()) { setError("Введіть назву відео"); return; }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title.trim());
      fd.append("type", type);
      const res = await fetch("/api/videos", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Помилка завантаження"); return; }
      setVideos((v) => [data, ...v]);
      setTitle("");
      setSuccess("Відео завантажено!");
      setTimeout(() => setSuccess(""), 2500);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleDelete(id: number) {
    if (!confirm("Видалити відео?")) return;
    startTransition(async () => {
      const res = await fetch("/api/videos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (res.ok) setVideos((v) => v.filter((x) => x.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <div className="bg-gray-50 rounded-xl p-4 border space-y-3">
        <h4 className="font-bold text-gray-700 text-sm">Додати відео</h4>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-gray-500 mb-1 block">Назва</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Хайлайти матчу..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="w-40">
            <label className="text-xs text-gray-500 mb-1 block">Тип</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {VIDEO_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleUpload} />
            <button
              onClick={() => { if (!title.trim()) { setError("Введіть назву відео"); return; } fileRef.current?.click(); }}
              disabled={uploading}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "#f97316" }}
            >
              {uploading ? "Завантаження..." : "Обрати відео"}
            </button>
          </div>
        </div>
        {error && <div className="text-xs text-red-500">{error}</div>}
        {success && <div className="text-xs text-green-600 font-medium">{success}</div>}
      </div>

      {/* Videos list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Завантаження...</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          Відео ще не завантажені
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center gap-4 bg-white rounded-xl border p-3">
              <div className="w-20 h-14 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <video src={v.url} className="w-full h-full object-cover" muted />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-800 truncate">{v.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded">
                    {VIDEO_TYPES.find((t) => t.value === v.type)?.label ?? v.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(v.publishedAt).toLocaleDateString("uk-UA")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(v.id)}
                className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 flex-shrink-0"
              >
                Вид.
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

type Section = "videos" | "photos";

export default function GalleryTab({ games }: { games: GameRow[] }) {
  const [section, setSection] = useState<Section>("videos");
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const gamesMap = Object.fromEntries(games.map((g) => [g.id, g]));

  useEffect(() => {
    if (section === "photos" && albums === null) {
      fetch("/api/gallery")
        .then((r) => r.json())
        .then((data) => setAlbums(data.albums ?? []))
        .catch(() => setAlbums([]));
    }
  }, [section, albums]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-800">Медіа / Галерея</h3>
        <p className="text-sm text-gray-500 mt-0.5">Завантажуйте відео та фотографії матчів — вони відображатимуться у розділі &quot;Медіа&quot; на сайті.</p>
      </div>

      {/* Section switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setSection("videos")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            section === "videos"
              ? "text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          style={section === "videos" ? { backgroundColor: "#f46f10" } : {}}
        >
          📹 Медіа-файли
        </button>
        <button
          onClick={() => setSection("photos")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            section === "photos"
              ? "text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          style={section === "photos" ? { backgroundColor: "#1a2744" } : {}}
        >
          Фотогалерея
        </button>
      </div>

      {/* Videos section */}
      {section === "videos" && <VideosSection />}

      {/* Photos section */}
      {section === "photos" && (
        albums === null ? (
          <div className="text-center py-12 text-gray-400 text-sm">Завантаження...</div>
        ) : albums.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Альбоми відсутні</div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">До кожного матчу можна додати до 10 фотографій. Перша завантажена або вибрана стає обкладинкою альбому.</p>
            {albums.map((album) => (
              <AlbumEditor key={album.gameId} album={album} game={gamesMap[album.gameId]} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
