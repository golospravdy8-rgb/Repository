"use client";

import { useState, useTransition } from "react";
import { updateSiteTexts } from "@/actions/site-settings";

type ImageType = "logo" | "ogImage" | "heroBg" | "headerBg" | "footerBg" | "pageBg";

const IMAGE_CONFIG: Array<{ type: ImageType; label: string; hint: string }> = [
  { type: "logo", label: "Логотип", hint: "Замінює текстовий кружечок 'БЛ'" },
  { type: "ogImage", label: "OG Image", hint: "1200×630px для соцмереж" },
  { type: "heroBg", label: "Фон Hero-банера", hint: "Головна сторінка, секція hero" },
  { type: "headerBg", label: "Фон хедера", hint: "Замінює колір хедера" },
  { type: "footerBg", label: "Фон футера", hint: "Замінює колір футера" },
  { type: "pageBg", label: "Фон всіх сторінок", hint: "Тло за контентом" },
];

const BANNER_SLOTS = [
  {
    slot: "top",
    label: "Банер вгорі сторінок",
    hint: "Відображається під хедером на всіх сторінках. Рекомендований розмір: 728×90px",
  },
  {
    slot: "bottom",
    label: "Банер внизу сторінок",
    hint: "Відображається перед футером на всіх сторінках. Рекомендований розмір: 728×90px",
  },
];

function ImageUploadRow({
  config,
  currentUrl,
}: {
  config: (typeof IMAGE_CONFIG)[0];
  currentUrl: string;
}) {
  const [url, setUrl] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", config.type);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      if (data.url) {
        setUrl(data.url);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    startTransition(async () => {
      await updateSiteTexts({ [`images.${config.type}`]: "" });
      setUrl("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const isPlaceholder = url === "[base64]";
  const isDataUrl = url.startsWith("data:") || isPlaceholder;

  return (
    <div className="flex items-start gap-4 py-4 border-b last:border-0">
      <div className="flex-1">
        <div className="font-semibold text-gray-800 text-sm">{config.label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{config.hint}</div>
        {url && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-green-600 font-mono">
              {isPlaceholder ? "[base64 — завантажено]" : isDataUrl ? `[base64, ${Math.round(url.length / 1024)}KB]` : url}
            </span>
            <button onClick={handleClear} disabled={pending} className="text-xs text-red-500 hover:text-red-700">
              Видалити
            </button>
          </div>
        )}
        {error && <div className="mt-1 text-xs text-red-600 font-medium">⚠ {error}</div>}
        {saved && <div className="mt-1 text-xs text-green-600 font-medium">✓ Збережено!</div>}
      </div>
      <div className="flex flex-col items-end gap-2">
        {url && url !== "[base64]" && config.type !== "ogImage" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={config.label}
            className="w-16 h-16 object-contain rounded-lg border bg-gray-50"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
        {isPlaceholder && config.type !== "ogImage" && (
          <div className="w-16 h-16 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-gray-400 text-center">збережено</div>
        )}
        <label className="cursor-pointer px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {uploading ? "Завантаження..." : pending ? "Зберігається..." : url ? "Змінити" : "Завантажити"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading || pending}
          />
        </label>
      </div>
    </div>
  );
}

function BannerSlotRow({
  slot,
  label,
  hint,
  currentImg,
  currentUrl,
  currentActive,
}: {
  slot: string;
  label: string;
  hint: string;
  currentImg: string;
  currentUrl: string;
  currentActive: boolean;
}) {
  const [img, setImg] = useState(currentImg);
  const [linkUrl, setLinkUrl] = useState(currentUrl);
  const [active, setActive] = useState(currentActive);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = (patch: Record<string, string>) => {
    startTransition(async () => {
      await updateSiteTexts(patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", `banner-${slot}`);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setImg(data.url);
        save({ [`banner.${slot}.img`]: data.url });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSaveUrl = () => {
    save({ [`banner.${slot}.url`]: linkUrl });
  };

  const handleToggleActive = () => {
    const next = !active;
    setActive(next);
    save({ [`banner.${slot}.active`]: next ? "true" : "false" });
  };

  const handleClearImg = () => {
    setImg("");
    save({ [`banner.${slot}.img`]: "" });
  };

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-white">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-800 text-sm">{label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{hint}</div>
        </div>
        <button
          onClick={handleToggleActive}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
            active ? "text-white" : "bg-gray-100 text-gray-400"
          }`}
          style={active ? { backgroundColor: "#22c55e" } : {}}
        >
          {active ? "Активний" : "Вимкнено"}
        </button>
      </div>

      {/* Preview */}
      {img && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="Банер" className="w-full max-h-28 object-cover rounded-lg border" />
          <button
            onClick={handleClearImg}
            className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full hover:bg-red-600"
          >
            Видалити
          </button>
        </div>
      )}

      {/* Upload */}
      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
        {uploading ? "Завантаження..." : img ? "Змінити зображення" : "Завантажити зображення"}
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading || pending} />
      </label>

      {/* Link URL */}
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://посилання-при-кліку.ua"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
        />
        <button
          onClick={handleSaveUrl}
          disabled={pending}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: "#1a2744" }}
        >
          Зберегти URL
        </button>
      </div>

      {saved && <div className="text-xs text-green-600 font-medium">✓ Збережено!</div>}
    </div>
  );
}

export default function ImagesTab({ settings }: { settings: Record<string, string> }) {
  return (
    <div className="space-y-8">
      {/* Site images section */}
      <div>
        <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Зображення сайту</h3>
        <div className="bg-white rounded-xl border p-4">
          <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 16 }}>
            ⚠️ Зображення зберігаються в базі даних (base64). Максимальний розмір — 512KB. Якщо логотип не відображається — завантажте його знову.
          </div>
          {IMAGE_CONFIG.map((config) => (
            <ImageUploadRow key={config.type} config={config} currentUrl={settings[`images.${config.type}`] ?? ""} />
          ))}
        </div>
      </div>

      {/* Ad banners section */}
      <div>
        <h3 className="font-bold text-gray-700 mb-1 text-sm uppercase tracking-wide">Рекламні банери</h3>
        <p className="text-xs text-gray-500 mb-3">
          Банери відображаються на всіх публічних сторінках сайту. Завантажте зображення і вкажіть URL куди вести при кліку.
        </p>
        <div className="space-y-4">
          {BANNER_SLOTS.map(({ slot, label, hint }) => (
            <BannerSlotRow
              key={slot}
              slot={slot}
              label={label}
              hint={hint}
              currentImg={settings[`banner.${slot}.img`] ?? ""}
              currentUrl={settings[`banner.${slot}.url`] ?? ""}
              currentActive={settings[`banner.${slot}.active`] !== "false"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
