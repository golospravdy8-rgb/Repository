"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createNews, updateNews, deleteNews } from "@/actions/admin-data";
import type { NewsRow } from "../SiteEditorClient";

const CATEGORIES = ["news", "schedule", "results", "announcement"];
const CATEGORY_LABELS: Record<string, string> = {
  news: "Новина",
  schedule: "Розклад",
  results: "Результати",
  announcement: "Оголошення",
};

const EMPTY_FORM = { title: "", slug: "", content: "", category: "news", isPublished: true, imageUrl: "" };

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .slice(0, 80);
}

export default function NewsTab({ news }: { news: NewsRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = (n: NewsRow) => {
    setEditingId(n.id);
    setForm({
      title: n.title,
      slug: n.slug,
      content: n.content,
      category: n.category ?? "news",
      isPublished: n.isPublished,
      imageUrl: n.imageUrl ?? "",
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "news");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setForm((f) => ({ ...f, imageUrl: data.url }));
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    const slug = form.slug.trim() || slugify(form.title);
    startTransition(async () => {
      try {
        if (editingId) {
          await updateNews(editingId, { ...form, slug });
        } else {
          await createNews({ ...form, slug });
        }
        setForm(EMPTY_FORM);
        setEditingId(null);
        setShowForm(false);
        router.refresh();
      } catch (err) {
        console.error("Помилка при збереженні новини:", err);
        alert("Помилка при збереженні новини. Спробуйте ще раз.");
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Видалити новину?")) return;
    startTransition(async () => {
      try {
        await deleteNews(id);
        router.refresh();
      } catch (err) {
        console.error("Помилка при видаленні новини:", err);
        alert("Помилка при видаленні новини. Спробуйте ще раз.");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: "#f97316" }}
        >
          + Додати новину
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 border rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-gray-700">{editingId ? "Редагувати новину" : "Нова новина"}</h3>

          {/* Title */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Заголовок</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Заголовок новини"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))}
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Slug (URL)</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono text-gray-600"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
            />
          </div>

          {/* Category + Published */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Категорія</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Опублікувати</span>
              </label>
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Зображення новини</label>
            <div className="flex items-start gap-3">
              {/* Preview */}
              {form.imageUrl ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border bg-gray-100 flex-shrink-0">
                  <Image src={form.imageUrl} alt="preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-32 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0 bg-white">
                  <span className="text-gray-400 text-xs text-center">Немає фото</span>
                </div>
              )}

              {/* Upload button */}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {uploading ? "Завантаження..." : "Завантажити фото"}
                </button>
                {form.imageUrl && (
                  <p className="text-xs text-gray-400 break-all max-w-xs">{form.imageUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Текст новини</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-32"
              placeholder="Введіть текст новини..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={pending || uploading}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "#1a2744" }}
            >
              {editingId ? "Зберегти" : "Опублікувати"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-4 py-2 rounded-lg text-sm border text-gray-600"
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {/* News list */}
      <div className="space-y-2">
        {news.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Новин немає. Додайте першу!</p>
        ) : (
          news.map((n) => (
            <div key={n.id} className="bg-white border rounded-lg overflow-hidden">
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {n.imageUrl && (
                    <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                      <Image src={n.imageUrl} alt={n.title} fill className="object-cover" />
                    </div>
                  )}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white shrink-0"
                    style={{ backgroundColor: n.category === "schedule" ? "#3b82f6" : n.category === "results" ? "#10b981" : "#f97316" }}
                  >
                    {CATEGORY_LABELS[n.category ?? "news"] ?? n.category}
                  </span>
                  <span className="font-medium text-gray-800 text-sm truncate">{n.title}</span>
                  {!n.isPublished && (
                    <span className="text-xs text-gray-400 shrink-0">[чернетка]</span>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-xs text-gray-400">
                    {new Date(n.publishedAt).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(n); }} className="text-xs text-blue-500 hover:underline">Ред.</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }} className="text-xs text-red-400 hover:underline">Вид.</button>
                </div>
              </div>
              {expandedId === n.id && (
                <div className="px-4 pb-3 text-sm text-gray-600 border-t bg-gray-50 whitespace-pre-wrap">
                  {n.content}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
