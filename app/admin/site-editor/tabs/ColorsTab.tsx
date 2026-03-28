"use client";

import { useState, useTransition, forwardRef, useImperativeHandle } from "react";
import { updateSiteColors } from "@/actions/site-settings";
import type { SaveHandle } from "../SiteEditorClient";

const DEFAULT_COLORS: Record<string, string> = {
  // === СЕКЦІЇ САЙТУ ===
  "colors.headerBg":        "#0f172a",
  "colors.headerText":      "#f8fafc",
  "colors.heroBg":          "#0f172a",
  "colors.heroTitle":       "#ffffff",
  "colors.heroSubtitle":    "#94a3b8",
  "colors.pageBg":          "#f8fafc",
  "colors.cardBg":          "#ffffff",
  "colors.cardBorder":      "#e2e8f0",
  "colors.tableBg":         "#0f172a",
  "colors.tableHeaderText": "#ffffff",
  "colors.tableRowOdd":     "#f1f5f9",
  "colors.tableRowEven":    "#ffffff",
  "colors.newsBg":          "#f1f5f9",
  "colors.footerBg":        "#0f172a",
  "colors.footerText":      "#94a3b8",
  "colors.footerLink":      "#f97316",
  "colors.footerCopyright": "#475569",
  // === КНОПКИ ===
  "colors.btnBlue":         "#2563eb",
  "colors.btnOrange":       "#f97316",
  "colors.btnNavy":         "#0f172a",
  "colors.btnRed":          "#dc2626",
  "colors.btnSchedule":     "#2563eb",
  "colors.btnHero":         "#f97316",
  "colors.btnDonate":       "#ea580c",
  "colors.btnChat":         "#1e293b",
  // Legacy fallback (не показуються в UI, але зберігаються для сумісності)
  "colors.navy":            "#0f172a",
  "colors.orange":          "#f97316",
  "colors.blue":            "#2563eb",
  "colors.red":             "#dc2626",
  "colors.bg":              "#f8fafc",
};

type ColorField = { key: string; label: string };

const SECTION_FIELDS: ColorField[] = [
  { key: "colors.headerBg",        label: "Хедер — фон навбару" },
  { key: "colors.headerText",      label: "Хедер — колір тексту меню" },
  { key: "colors.heroBg",          label: "Hero — фон банера" },
  { key: "colors.heroTitle",       label: "Hero — колір заголовку" },
  { key: "colors.heroSubtitle",    label: "Hero — колір підзаголовку" },
  { key: "colors.pageBg",          label: "Фон сторінок (загальний)" },
  { key: "colors.cardBg",          label: "Картки — фон" },
  { key: "colors.cardBorder",      label: "Картки — рамка" },
  { key: "colors.tableBg",         label: "Таблиця — фон заголовку" },
  { key: "colors.tableHeaderText", label: "Таблиця — текст заголовку" },
  { key: "colors.tableRowOdd",     label: "Таблиця — непарні рядки" },
  { key: "colors.tableRowEven",    label: "Таблиця — парні рядки" },
  { key: "colors.newsBg",          label: "Новини — фон секції" },
  { key: "colors.footerBg",        label: "Footer — фон підвалу" },
  { key: "colors.footerText",      label: "Footer — колір тексту" },
  { key: "colors.footerLink",      label: "Footer — колір посилань" },
  { key: "colors.footerCopyright", label: "Footer — copyright текст" },
];

const BUTTON_FIELDS: ColorField[] = [
  { key: "colors.btnBlue",     label: "+1 Штрафний (синя кнопка)" },
  { key: "colors.btnOrange",   label: "+2 Двоочковий (помаранчева кнопка)" },
  { key: "colors.btnNavy",     label: "+3 Триочковий (темна кнопка)" },
  { key: "colors.btnRed",      label: "LIVE бейдж / Фол (червона)" },
  { key: "colors.btnSchedule", label: "Переглянути розклад" },
  { key: "colors.btnHero",     label: "Кнопки Hero (Барахолка, Магазин...)" },
  { key: "colors.btnDonate",   label: "Кнопка Donate" },
  { key: "colors.btnChat",     label: "Кнопка Балачка" },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 12,
      fontWeight: 700,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      margin: "24px 0 10px",
      paddingBottom: 6,
      borderBottom: "2px solid #e2e8f0",
    }}>
      {title}
    </div>
  );
}

function ColorRow({ field, value, onChange }: { field: ColorField; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={field.key} className="text-sm font-medium text-gray-700 flex-1 min-w-0">
        {field.label}
      </label>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="color"
          id={field.key}
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none font-mono"
        />
        <div className="w-7 h-7 rounded border border-gray-200 flex-shrink-0" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}

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

    const c = colors;

    return (
      <div className="space-y-1">

        <SectionHeader title="🎨 Секції сайту" />
        <div className="space-y-2">
          {SECTION_FIELDS.map((f) => (
            <ColorRow key={f.key} field={f} value={c[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
          ))}
        </div>

        <SectionHeader title="🔘 Кнопки" />
        <div className="space-y-2">
          {BUTTON_FIELDS.map((f) => (
            <ColorRow key={f.key} field={f} value={c[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
          ))}
        </div>

        {/* Live preview */}
        <div className="border rounded-xl overflow-hidden mt-6">
          <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b font-medium uppercase tracking-wider">
            Попередній перегляд
          </div>
          <div style={{ backgroundColor: c["colors.pageBg"] || "#f1f5f9" }}>
            {/* Header */}
            <div className="px-4 py-2 text-sm font-bold mb-0" style={{ backgroundColor: c["colors.headerBg"], color: c["colors.headerText"] }}>
              ЛІГА — Хедер / Навбар
            </div>
            {/* Hero */}
            <div className="px-4 py-3 text-center" style={{ backgroundColor: c["colors.heroBg"] }}>
              <div className="text-sm font-black mb-1" style={{ color: c["colors.heroTitle"] }}>Заголовок Hero</div>
              <div className="text-xs mb-2" style={{ color: c["colors.heroSubtitle"] }}>Підзаголовок секції</div>
              <div className="flex gap-2 justify-center flex-wrap">
                <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: c["colors.btnHero"] }}>Барахолка</span>
                <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: c["colors.btnChat"] }}>Балачка</span>
                <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: c["colors.btnDonate"] }}>Donate</span>
                <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: c["colors.btnSchedule"] }}>Розклад</span>
              </div>
            </div>
            {/* Cards + Table */}
            <div className="grid grid-cols-2 gap-2 p-3">
              <div className="rounded p-2 text-xs text-gray-600" style={{ backgroundColor: c["colors.cardBg"], border: `1px solid ${c["colors.cardBorder"]}` }}>
                Картка матчу
              </div>
              <div className="rounded overflow-hidden">
                <div className="px-2 py-1 text-xs font-bold" style={{ backgroundColor: c["colors.tableBg"], color: c["colors.tableHeaderText"] }}>Таблиця</div>
                <div className="px-2 py-1 text-xs" style={{ backgroundColor: c["colors.tableRowOdd"] || "#f8fafc" }}>Рядок 1</div>
                <div className="px-2 py-1 text-xs" style={{ backgroundColor: c["colors.tableRowEven"] || "#ffffff" }}>Рядок 2</div>
              </div>
            </div>
            {/* Live tracker buttons */}
            <div className="flex gap-2 px-3 pb-3 flex-wrap">
              <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: c["colors.btnBlue"] }}>+1</span>
              <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: c["colors.btnOrange"] }}>+2</span>
              <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: c["colors.btnNavy"] }}>+3</span>
              <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: c["colors.btnRed"] }}>LIVE</span>
            </div>
          </div>
          {/* Footer */}
          <div className="px-4 py-3" style={{ backgroundColor: c["colors.footerBg"] }}>
            <span className="text-xs font-bold mr-2" style={{ color: c["colors.footerText"] }}>Footer</span>
            <span className="text-xs mr-2" style={{ color: c["colors.footerLink"] }}>посилання</span>
            <span className="text-xs" style={{ color: c["colors.footerCopyright"] }}>© copyright</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
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
  }
);

export default ColorsTab;
