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
  "colors.footerBg": "#1e293b",
  "colors.footerText": "#94a3b8",
  "colors.heroBg": "#2563eb",
  "colors.heroText": "#ffffff",
  "colors.heroButtonBg": "#f46f10",
  "colors.heroButtonText": "#ffffff",
  "colors.cardBg": "#ffffff",
  "colors.cardBorder": "#e2e8f0",
  "colors.tableBg": "#1e3a5f",
  "colors.tableHeaderText": "#ffffff",
};

const COLOR_LABELS: Record<string, string> = {
  "colors.navy": "Navy (хедер, заголовки, кнопка +3)",
  "colors.orange": "Orange (акценти, активні пункти, кнопка +2)",
  "colors.blue": "Blue (кнопка +1 штрафний)",
  "colors.red": "Red (LIVE бейдж, завершити матч)",
  "colors.bg": "Background (фон сторінок)",
  "colors.footerBg": "Footer (фон підвалу)",
  "colors.footerText": "Footer (колір тексту)",
  "colors.heroBg": "Hero секція (фон банера)",
  "colors.heroText": "Hero секція (колір тексту)",
  "colors.heroButtonBg": "Кнопки на головній (фон)",
  "colors.heroButtonText": "Кнопки на головній (текст)",
  "colors.cardBg": "Картки (фон)",
  "colors.cardBorder": "Картки (рамка)",
  "colors.tableBg": "Таблиця (фон заголовку)",
  "colors.tableHeaderText": "Таблиця (текст заголовку)",
};

const COLOR_GROUPS = [
  {
    label: "Основні",
    keys: ["colors.navy", "colors.orange", "colors.blue", "colors.red", "colors.bg"],
  },
  {
    label: "Footer",
    keys: ["colors.footerBg", "colors.footerText"],
  },
  {
    label: "Hero секція",
    keys: ["colors.heroBg", "colors.heroText", "colors.heroButtonBg", "colors.heroButtonText"],
  },
  {
    label: "Картки та таблиці",
    keys: ["colors.cardBg", "colors.cardBorder", "colors.tableBg", "colors.tableHeaderText"],
  },
];

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
      {COLOR_GROUPS.map((group) => (
        <div key={group.label}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 border-b pb-1">{group.label}</h3>
          <div className="space-y-3">
            {group.keys.map((key) => (
              <div key={key} className="flex items-center gap-4">
                <label htmlFor={key} className="text-sm font-medium text-gray-700 flex-1">
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
        </div>
      ))}

      {/* Live preview */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b font-medium uppercase tracking-wider">
          Попередній перегляд
        </div>
        <div className="p-4" style={{ backgroundColor: colors["colors.bg"] }}>
          <div className="rounded-lg overflow-hidden shadow-sm mb-3">
            <div className="px-4 py-3 text-white text-sm font-bold" style={{ backgroundColor: colors["colors.navy"] }}>
              ЛІГА — Хедер
            </div>
            <div className="p-4 flex gap-3 flex-wrap" style={{ backgroundColor: colors["colors.cardBg"], border: `1px solid ${colors["colors.cardBorder"]}` }}>
              <button className="px-3 py-1.5 rounded text-white text-xs font-bold" style={{ backgroundColor: colors["colors.blue"] }}>+1</button>
              <button className="px-3 py-1.5 rounded text-white text-xs font-bold" style={{ backgroundColor: colors["colors.orange"] }}>+2</button>
              <button className="px-3 py-1.5 rounded text-white text-xs font-bold" style={{ backgroundColor: colors["colors.navy"] }}>+3</button>
              <button className="px-3 py-1.5 rounded text-white text-xs font-bold" style={{ backgroundColor: colors["colors.red"] }}>LIVE</button>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden shadow-sm mb-3">
            <div className="px-4 py-2 text-xs font-bold" style={{ backgroundColor: colors["colors.tableBg"], color: colors["colors.tableHeaderText"] }}>
              Таблиця сезону
            </div>
          </div>
          <div className="rounded-lg px-4 py-3 text-sm font-bold text-center" style={{ backgroundColor: colors["colors.heroBg"], color: colors["colors.heroText"] }}>
            Hero банер
            <span className="ml-3 px-3 py-1 rounded text-xs" style={{ backgroundColor: colors["colors.heroButtonBg"], color: colors["colors.heroButtonText"] }}>Кнопка</span>
          </div>
        </div>
        <div className="px-4 py-3 text-xs" style={{ backgroundColor: colors["colors.footerBg"], color: colors["colors.footerText"] }}>
          Footer підвал сайту
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
