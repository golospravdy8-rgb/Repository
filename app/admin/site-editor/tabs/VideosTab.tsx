"use client";

import { useState, useEffect, useRef, useTransition } from "react";

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

export default function VideosTab() {
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
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-800">Відео-медіа</h3>
        <p className="text-sm text-gray-500 mt-0.5">Завантажуйте відео — вони з&apos;являться в розділі &quot;Медіа&quot; на сайті.</p>
      </div>

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
