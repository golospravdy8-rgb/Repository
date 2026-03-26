"use client";

import { useState, useTransition, forwardRef, useImperativeHandle } from "react";
import { updateSiteColors } from "@/actions/site-settings";
import type { SaveHandle } from "../SiteEditorClient";

const DEFAULT_COLORS = {
  "colors.navy": "#1a2744",
  "colors.orange": "#f97316",
  "colors.blue": "#3b82f6",
  "colors.red": "#ef4444",
  "colors.bg": "#f1f5f9",
};

const COLOR_LABELS: Record<string, string> = {
  "colors.navy": "Navy (хедер, заголовки, кнопка +3)",
  "colors.orange": "Orange (акценти, активні пункти, кнопка +2)",
  "colors.blue": "Blue (кнопка +1 штрафний)",
  "colors.red": "Red (LIVE бейдж, завершити матч)",
  "colors.bg": "Background (фон сторінок)",
};

const ColorsTab = forwardRef<SaveHandle, { settings: Record<string, string> }>(
  function ColorsTab({ settings }, ref) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [colors, setColors] = useState<Record<string, string>>(() => {
    const c: Record<string, string> = {};
    for (const key of Object.keys(DEFAULT_COLORS)) {
      c[key] = settings[key] || DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS];
    }
    return c;
  });

  const handleSave = () => {
    startTransition(async () => {
      await updateSiteColors(colors);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  useImperativeHandle(ref, () => ({ save: handleSave }));

  const handleReset = () => {
    setColors({ ...DEFAULT_COLORS });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {Object.keys(DEFAULT_COLORS).map((key) => (
          <div key={key} className="flex items-center gap-4">
            <label
              htmlFor={key}
              className="text-sm font-medium text-gray-700 flex-1"
            >
              {COLOR_LABELS[key]}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id={key}
                value={colors[key]}
                onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={colors[key]}
                onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none font-mono"
              />
              <div
                className="w-8 h-8 rounded-lg border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: colors[key] }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Live preview */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b font-medium uppercase tracking-wider">
          Попередній перегляд
        </div>
        <div className="p-4" style={{ backgroundColor: colors["colors.bg"] }}>
          <div className="rounded-lg overflow-hidden shadow-sm">
            <div
              className="px-4 py-3 text-white text-sm font-bold"
              style={{ backgroundColor: colors["colors.navy"] }}
            >
              ЛІГА ESCULAB — Хедер
            </div>
            <div className="bg-white p-4 flex gap-3 flex-wrap">
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-bold"
                style={{ backgroundColor: colors["colors.blue"] }}
              >
                +1 Штрафний
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-bold"
                style={{ backgroundColor: colors["colors.orange"] }}
              >
                +2 Двоочковий
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-bold"
                style={{ backgroundColor: colors["colors.navy"] }}
              >
                +3 Триочковий
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-bold"
                style={{ backgroundColor: colors["colors.red"] }}
              >
                LIVE
              </button>
            </div>
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
          {pending ? "Зберігається..." : "Зберегти кольори"}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Скинути до стандарту
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
      </div>
    </div>
  );
});

export default ColorsTab;
