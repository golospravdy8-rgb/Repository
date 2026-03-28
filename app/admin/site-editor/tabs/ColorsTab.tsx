"use client";

import { useState, useTransition, forwardRef, useImperativeHandle } from "react";
import { updateSiteColors } from "@/actions/site-settings";
import type { SaveHandle } from "../SiteEditorClient";

const DEFAULT_COLORS: Record<string, string> = {
  // Header
  "colors.headerBg":        "#1a2744",
  "colors.headerText":      "#ffffff",
  // Hero
  "colors.heroBg":          "#3b82f6",
  "colors.heroTitle":       "#ffffff",
  "colors.heroSubtitle":    "#e2e8f0",
  "colors.heroButtonBg":    "#f97316",
  "colors.heroButtonText":  "#ffffff",
  // Cards
  "colors.cardBg":          "#ffffff",
  "colors.cardBorder":      "#e2e8f0",
  "colors.cardText":        "#1e293b",
  // Table
  "colors.tableBg":         "#1a2744",
  "colors.tableHeaderText": "#ffffff",
  "colors.tableRowOdd":     "#f8fafc",
  "colors.tableRowEven":    "#ffffff",
  // News
  "colors.newsBg":          "#f1f5f9",
  "colors.newsCardBg":      "#ffffff",
  "colors.newsTitle":       "#1e293b",
  // Media
  "colors.mediaBg":         "#f1f5f9",
  // Buttons
  "colors.btnPrimary":      "#f97316",
  "colors.btnPrimaryText":  "#ffffff",
  "colors.btnSecondary":    "#1a2744",
  "colors.btnSecondaryText":"#ffffff",
  "colors.btnAccent":       "#1e293b",
  // General
  "colors.pageBg":          "#f1f5f9",
  // Legacy (used in live tracker etc.)
  "colors.navy":            "#1a2744",
  "colors.orange":          "#f97316",
  "colors.blue":            "#3b82f6",
  "colors.red":             "#ef4444",
  "colors.bg":              "#f1f5f9",
  // Footer
  "colors.footerBg":        "#1e293b",
  "colors.footerText":      "#94a3b8",
  "colors.footerLink":      "#cbd5e1",
  "colors.footerCopyright": "#64748b",
};

const COLOR_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: "Хедер / Навбар",
    keys: ["colors.headerBg", "colors.headerText"],
  },
  {
    label: "Hero секція (головний банер)",
    keys: ["colors.heroBg", "colors.heroTitle", "colors.heroSubtitle", "colors.heroButtonBg", "colors.heroButtonText"],
  },
  {
    label: "Картки матчів / гравців",
    keys: ["colors.cardBg", "colors.cardBorder", "colors.cardText"],
  },
  {
    label: "Таблиця сезону",
    keys: ["colors.tableBg", "colors.tableHeaderText", "colors.tableRowOdd", "colors.tableRowEven"],
  },
  {
    label: "Секція новин",
    keys: ["colors.newsBg", "colors.newsCardBg", "colors.newsTitle"],
  },
  {
    label: "Медіа / Галерея",
    keys: ["colors.mediaBg"],
  },
  {
    label: "Кнопки (загальні)",
    keys: ["colors.btnPrimary", "colors.btnPrimaryText", "colors.btnSecondary", "colors.btnSecondaryText", "colors.btnAccent"],
  },
  {
    label: "Загальний фон",
    keys: ["colors.pageBg"],
  },
  {
    label: "Системні / Live tracker",
    keys: ["colors.navy", "colors.orange", "colors.blue", "colors.red", "colors.bg"],
  },
  {
    label: "Footer / Підвал",
    keys: ["colors.footerBg", "colors.footerText", "colors.footerLink", "colors.footerCopyright"],
  },
];

const COLOR_LABELS: Record<string, string> = {
  "colors.headerBg":        "Хедер — фон навбару",
  "colors.headerText":      "Хедер — колір тексту/меню",
  "colors.heroBg":          "Hero — фон банера",
  "colors.heroTitle":       "Hero — колір заголовку",
  "colors.heroSubtitle":    "Hero — колір підзаголовку",
  "colors.heroButtonBg":    "Hero — кнопки (фон)",
  "colors.heroButtonText":  "Hero — кнопки (текст)",
  "colors.cardBg":          "Картки — фон",
  "colors.cardBorder":      "Картки — рамка",
  "colors.cardText":        "Картки — колір тексту",
  "colors.tableBg":         "Таблиця — фон заголовку",
  "colors.tableHeaderText": "Таблиця — текст заголовку",
  "colors.tableRowOdd":     "Таблиця — парні рядки (фон)",
  "colors.tableRowEven":    "Таблиця — непарні рядки (фон)",
  "colors.newsBg":          "Новини — фон секції",
  "colors.newsCardBg":      "Новини — фон картки",
  "colors.newsTitle":       "Новини — колір заголовку",
  "colors.mediaBg":         "Медіа — фон секції",
  "colors.btnPrimary":      "Кнопка головна (фон)",
  "colors.btnPrimaryText":  "Кнопка головна (текст)",
  "colors.btnSecondary":    "Кнопка другорядна (фон)",
  "colors.btnSecondaryText":"Кнопка другорядна (текст)",
  "colors.btnAccent":       "Кнопка акцент — Балачка (фон)",
  "colors.pageBg":          "Фон сторінок (загальний)",
  "colors.navy":            "Navy (live tracker, заголовки, кнопка +3)",
  "colors.orange":          "Orange (акценти, кнопка +2)",
  "colors.blue":            "Blue (кнопка +1 штрафний)",
  "colors.red":             "Red (LIVE бейдж, завершити матч)",
  "colors.bg":              "Background (legacy фон)",
  "colors.footerBg":        "Footer — фон підвалу",
  "colors.footerText":      "Footer — основний текст",
  "colors.footerLink":      "Footer — колір посилань",
  "colors.footerCopyright": "Footer — copyright текст",
};

const ColorsTab = forwardRef<SaveHandle, { settings: Record<string, string> }>(
  function ColorsTab({ settings }, ref) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [colors, setColors] = useState<Record<string, string>>(() => {
    const c: Record<string, string> = {};
    for (const key of Object.keys(DEFAULT_COLORS)) {
      c[key] = settings[key] || DEFAULT_COLORS[key];
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

  const handleReset = () => setColors({ ...DEFAULT_COLORS });

  const set = (key: string, val: string) => setColors((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-2">
      {COLOR_GROUPS.map((group) => (
        <div key={group.label}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 16, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" }}>
            {group.label}
          </div>
          <div className="space-y-2">
            {group.keys.map((key) => (
              <div key={key} className="flex items-center gap-4">
                <label htmlFor={key} className="text-sm font-medium text-gray-700 flex-1">
                  {COLOR_LABELS[key] ?? key}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id={key}
                    value={colors[key] ?? "#ffffff"}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={colors[key] ?? ""}
                    onChange={(e) => set(key, e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none font-mono"
                  />
                  <div className="w-7 h-7 rounded border border-gray-200 flex-shrink-0" style={{ backgroundColor: colors[key] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Live preview */}
      <div className="border rounded-xl overflow-hidden mt-6">
        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b font-medium uppercase tracking-wider">
          Попередній перегляд
        </div>
        <div className="p-3" style={{ backgroundColor: colors["colors.pageBg"] || colors["colors.bg"] }}>
          {/* Header */}
          <div className="rounded-lg overflow-hidden shadow-sm mb-2">
            <div className="px-4 py-2 text-sm font-bold" style={{ backgroundColor: colors["colors.headerBg"], color: colors["colors.headerText"] }}>
              ЛІГА — Хедер / Навбар
            </div>
          </div>
          {/* Hero */}
          <div className="rounded-lg px-4 py-3 mb-2 text-center" style={{ backgroundColor: colors["colors.heroBg"] }}>
            <div className="text-sm font-black mb-1" style={{ color: colors["colors.heroTitle"] }}>Заголовок Hero</div>
            <div className="text-xs mb-2" style={{ color: colors["colors.heroSubtitle"] }}>Підзаголовок секції</div>
            <span className="px-3 py-1 rounded text-xs font-bold" style={{ backgroundColor: colors["colors.heroButtonBg"], color: colors["colors.heroButtonText"] }}>Кнопка</span>
          </div>
          {/* Cards + Table */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="rounded p-2 text-xs" style={{ backgroundColor: colors["colors.cardBg"], border: `1px solid ${colors["colors.cardBorder"]}`, color: colors["colors.cardText"] }}>
              Картка матчу
            </div>
            <div className="rounded overflow-hidden">
              <div className="px-2 py-1 text-xs font-bold" style={{ backgroundColor: colors["colors.tableBg"], color: colors["colors.tableHeaderText"] }}>Таблиця</div>
              <div className="px-2 py-1 text-xs" style={{ backgroundColor: colors["colors.tableRowOdd"] }}>Рядок 1</div>
              <div className="px-2 py-1 text-xs" style={{ backgroundColor: colors["colors.tableRowEven"] }}>Рядок 2</div>
            </div>
          </div>
          {/* Buttons */}
          <div className="flex gap-2 mb-2">
            <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: colors["colors.btnPrimary"], color: colors["colors.btnPrimaryText"] }}>Головна</span>
            <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: colors["colors.btnSecondary"], color: colors["colors.btnSecondaryText"] }}>Другорядна</span>
            <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: colors["colors.blue"], color: "#fff" }}>+1</span>
            <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: colors["colors.orange"], color: "#fff" }}>+2</span>
            <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: colors["colors.navy"], color: "#fff" }}>+3</span>
            <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: colors["colors.red"], color: "#fff" }}>LIVE</span>
          </div>
        </div>
        {/* Footer */}
        <div className="px-4 py-3" style={{ backgroundColor: colors["colors.footerBg"] }}>
          <span className="text-xs font-bold" style={{ color: colors["colors.footerText"] }}>Footer </span>
          <a className="text-xs" style={{ color: colors["colors.footerLink"] }}>посилання </a>
          <span className="text-xs" style={{ color: colors["colors.footerCopyright"] }}>© copyright</span>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4">
        <button onClick={handleSave} disabled={pending} className="px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-60" style={{ backgroundColor: "#1a2744" }}>
          {pending ? "Зберігається..." : "Зберегти кольори"}
        </button>
        <button onClick={handleReset} className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Скинути до стандарту
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
      </div>
    </div>
  );
});

export default ColorsTab;
