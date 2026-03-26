"use client";

import { useState, useTransition, forwardRef, useImperativeHandle } from "react";
import { updateSiteColors } from "@/actions/site-settings";
import type { SaveHandle } from "../SiteEditorClient";

const FONTS = [
  { name: "Inter", label: "Inter — сучасний, читабельний", url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
  { name: "Montserrat", label: "Montserrat — жирний, спортивний", url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" },
  { name: "Oswald", label: "Oswald — вузький, динамічний", url: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap" },
  { name: "Raleway", label: "Raleway — елегантний, стильний", url: "https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700;800&display=swap" },
  { name: "Bebas Neue", label: "Bebas Neue — агресивний, баскетбольний", url: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" },
  { name: "Rubik", label: "Rubik — округлий, дружній", url: "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" },
  { name: "Nunito", label: "Nunito — м'який, молодіжний", url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" },
  { name: "Exo 2", label: "Exo 2 — технологічний, спортивний", url: "https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800&display=swap" },
  { name: "Play", label: "Play — ігровий, енергійний", url: "https://fonts.googleapis.com/css2?family=Play:wght@400;700&display=swap" },
  { name: "Ubuntu", label: "Ubuntu — чіткий, сучасний", url: "https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap" },
  { name: "Russo One", label: "Russo One — монументальний", url: "https://fonts.googleapis.com/css2?family=Russo+One&display=swap" },
  { name: "Barlow Condensed", label: "Barlow Condensed — компактний, спортивний", url: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&display=swap" },
  { name: "Teko", label: "Teko — вузький, заголовковий", url: "https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&display=swap" },
  { name: "Anton", label: "Anton — жирний, плакатний", url: "https://fonts.googleapis.com/css2?family=Anton&display=swap" },
];

const FontsTab = forwardRef<SaveHandle, { settings: Record<string, string> }>(
  function FontsTab({ settings }, ref) {
    const [pending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);
    const [headingFont, setHeadingFont] = useState(settings["fonts.heading"] || "Montserrat");
    const [bodyFont, setBodyFont] = useState(settings["fonts.body"] || "Inter");
    const [headingSize, setHeadingSize] = useState(settings["fonts.headingSize"] || "36");
    const [bodySize, setBodySize] = useState(settings["fonts.bodySize"] || "16");
    const [siteZoom, setSiteZoom] = useState(settings["site.zoom"] || "100");

    const handleSave = () => {
      startTransition(async () => {
        await updateSiteColors({
          "fonts.heading": headingFont,
          "fonts.body": bodyFont,
          "fonts.headingSize": headingSize,
          "fonts.bodySize": bodySize,
          "site.zoom": siteZoom,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    };

    useImperativeHandle(ref, () => ({ save: handleSave }));

    const headingFontData = FONTS.find((f) => f.name === headingFont);
    const bodyFontData = FONTS.find((f) => f.name === bodyFont);

    return (
      <div className="space-y-6">
        {/* Load preview fonts */}
        {headingFontData && <link rel="stylesheet" href={headingFontData.url} />}
        {bodyFontData && bodyFontData.name !== headingFont && <link rel="stylesheet" href={bodyFontData.url} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Heading font */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Шрифт заголовків</label>
            <div className="space-y-2">
              {FONTS.map((font) => (
                <label
                  key={font.name}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    headingFont === font.name ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="headingFont"
                    value={font.name}
                    checked={headingFont === font.name}
                    onChange={() => setHeadingFont(font.name)}
                    className="text-orange-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{font.name}</div>
                    <div className="text-xs text-gray-400">{font.label.split(" — ")[1]}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-500 mb-1 block">Розмір заголовків (px)</label>
              <input
                type="range"
                min="24"
                max="60"
                value={headingSize}
                onChange={(e) => setHeadingSize(e.target.value)}
                className="w-full"
              />
              <div className="text-sm text-gray-600 mt-1">{headingSize}px</div>
            </div>
          </div>

          {/* Body font */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Шрифт тексту</label>
            <div className="space-y-2">
              {FONTS.map((font) => (
                <label
                  key={font.name}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    bodyFont === font.name ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="bodyFont"
                    value={font.name}
                    checked={bodyFont === font.name}
                    onChange={() => setBodyFont(font.name)}
                    className="text-orange-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{font.name}</div>
                    <div className="text-xs text-gray-400">{font.label.split(" — ")[1]}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-500 mb-1 block">Розмір тексту (px)</label>
              <input
                type="range"
                min="12"
                max="20"
                value={bodySize}
                onChange={(e) => setBodySize(e.target.value)}
                className="w-full"
              />
              <div className="text-sm text-gray-600 mt-1">{bodySize}px</div>
            </div>
          </div>
        </div>

        {/* Site zoom */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <label className="text-sm font-bold text-gray-700 mb-1 block">
            🔍 Масштаб сайту (zoom)
          </label>
          <p className="text-xs text-gray-500 mb-3">Зменшує або збільшує весь публічний сайт. 100% — стандартний розмір.</p>
          <input
            type="range"
            min="50"
            max="150"
            step="5"
            value={siteZoom}
            onChange={(e) => setSiteZoom(e.target.value)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>50%</span>
            <span className="font-bold text-blue-600 text-sm">{siteZoom}%</span>
            <span>150%</span>
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b font-medium uppercase tracking-wider">
            Попередній перегляд
          </div>
          <div className="p-6 bg-white">
            <div
              style={{ fontFamily: `'${headingFont}', sans-serif`, fontSize: `${headingSize}px`, fontWeight: 700, color: "#1a2744" }}
            >
              Ліга ЛДБЛ — Баскетбол Львів
            </div>
            <div
              className="mt-3 text-gray-600"
              style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: `${bodySize}px` }}
            >
              Офіційний сайт баскетбольної ліги Львова. Матчі, статистика та новини сезону 2025-2026.
            </div>
            <div className="mt-3 flex gap-3 flex-wrap">
              {["Розклад", "Таблиця", "Гравці", "Новини"].map((item) => (
                <span
                  key={item}
                  style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: `${bodySize}px` }}
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={pending}
            className="px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-60"
            style={{ backgroundColor: "#1a2744" }}
          >
            {pending ? "Зберігається..." : "Зберегти шрифти"}
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
        </div>
      </div>
    );
  }
);

export default FontsTab;
