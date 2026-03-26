"use client";

import { useState, useTransition, forwardRef, useImperativeHandle } from "react";
import { updateHeaderSettings } from "@/actions/site-settings";
import type { SaveHandle } from "../SiteEditorClient";


const HeaderTab = forwardRef<SaveHandle, { settings: Record<string, string> }>(
  function HeaderTab({ settings }, ref) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [height, setHeight] = useState(parseInt(settings["header.height"] ?? "64", 10));
  const [fontSize, setFontSize] = useState(parseInt(settings["header.fontSizeNav"] ?? "14", 10));
  const [activeStyle, setActiveStyle] = useState(settings["header.activeStyle"] ?? "underline");
  const [logoPosition, setLogoPosition] = useState(settings["header.logoPosition"] ?? "left");

  const handleSave = () => {
    startTransition(async () => {
      await updateHeaderSettings({
        "header.height": String(height),
        "header.fontSizeNav": String(fontSize),
        "header.activeStyle": activeStyle,
        "header.logoPosition": logoPosition,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  useImperativeHandle(ref, () => ({ save: handleSave }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Висота хедера: <span className="text-orange-500">{height}px</span>
          </label>
          <input
            type="range"
            min={48}
            max={120}
            value={height}
            onChange={(e) => setHeight(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>48px</span>
            <span>120px</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Розмір шрифту навігації: <span className="text-orange-500">{fontSize}px</span>
          </label>
          <input
            type="range"
            min={11}
            max={20}
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>11px</span>
            <span>20px</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Стиль актив��ого пункту
          </label>
          <div className="flex gap-3">
            {["underline", "background", "color"].map((style) => (
              <label key={style} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="radio"
                  value={style}
                  checked={activeStyle === style}
                  onChange={() => setActiveStyle(style)}
                />
                {style === "underline" ? "Підкреслення" : style === "background" ? "Фон" : "Колір"}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Позиція логотипу
          </label>
          <div className="flex gap-3">
            {["left", "center"].map((pos) => (
              <label key={pos} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="radio"
                  value={pos}
                  checked={logoPosition === pos}
                  onChange={() => setLogoPosition(pos)}
                />
                {pos === "left" ? "Ліворуч" : "По центру"}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b font-medium uppercase tracking-wider">
          Попередній перегляд хедера
        </div>
        <div
          className="flex items-center px-6 text-white"
          style={{
            backgroundColor: settings["colors.navy"] ?? "#1a2744",
            height: `${height}px`,
            justifyContent: logoPosition === "center" ? "center" : "space-between",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
              style={{ backgroundColor: settings["colors.orange"] ?? "#f97316" }}
            >
              БЛ
            </div>
            <span className="font-bold">ЛІГА ESCULAB</span>
          </div>
          {logoPosition !== "center" && (
            <nav className="flex gap-1">
              {["Новини", "Розклад", "Змагання"].map((label, i) => (
                <span
                  key={label}
                  className="px-3 rounded"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: i === 0
                      ? (settings["colors.orange"] ?? "#f97316")
                      : "rgba(255,255,255,0.8)",
                    borderBottom: i === 0 && activeStyle === "underline"
                      ? `2px solid ${settings["colors.orange"] ?? "#f97316"}`
                      : "none",
                    backgroundColor: i === 0 && activeStyle === "background"
                      ? "rgba(255,255,255,0.15)"
                      : "transparent",
                  }}
                >
                  {label}
                </span>
              ))}
            </nav>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-60"
          style={{ backgroundColor: "#1a2744" }}
        >
          {pending ? "Зберігається..." : "Зберегти налаштування хедера"}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
      </div>
    </div>
  );
}
);

export default HeaderTab;
