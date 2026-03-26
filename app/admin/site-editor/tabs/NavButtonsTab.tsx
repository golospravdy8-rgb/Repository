"use client";

import { useState, useTransition, forwardRef, useImperativeHandle } from "react";
import { updateNavigation } from "@/actions/site-settings";
import type { SaveHandle } from "../SiteEditorClient";

interface NavItem {
  href: string;
  label: string;
  visible: boolean;
}

const DEFAULT_ITEMS: NavItem[] = [
  { href: "/news", label: "Медіа", visible: true },
  { href: "/schedule", label: "Розклад", visible: true },
  { href: "/standings", label: "Змагання", visible: true },
  { href: "/leaders", label: "Лідери", visible: true },
  { href: "/teams", label: "Команди", visible: true },
  { href: "/players", label: "Гравці", visible: true },
  { href: "/contacts", label: "Контакти", visible: true },
];

function parseItems(raw: string): NavItem[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return DEFAULT_ITEMS;
}

const NavButtonsTab = forwardRef<SaveHandle, { settings: Record<string, string> }>(
  function NavButtonsTab({ settings }, ref) {
    const [pending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);
    const [items, setItems] = useState<NavItem[]>(() => parseItems(settings["nav.items"] ?? ""));

    const handleSave = () => {
      startTransition(async () => {
        await updateNavigation(items);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    };

    useImperativeHandle(ref, () => ({ save: handleSave }));

    function updateItem(index: number, field: keyof NavItem, value: string | boolean) {
      setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    }

    function moveItem(index: number, direction: -1 | 1) {
      const next = [...items];
      const target = index + direction;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];
      setItems(next);
    }

    function addItem() {
      setItems((prev) => [...prev, { href: "/", label: "Новий пункт", visible: true }]);
    }

    function removeItem(index: number) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }

    function resetToDefault() {
      setItems(DEFAULT_ITEMS);
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Пункти навігації</h3>
            <p className="text-sm text-gray-500 mt-0.5">Редагуйте назви, посилання та видимість кнопок у хедері сайту</p>
          </div>
          <button
            onClick={resetToDefault}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50"
          >
            Скинути до default
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"
              style={{ opacity: item.visible ? 1 : 0.5 }}
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveItem(i, -1)}
                  disabled={i === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 leading-none text-xs"
                  title="Вгору"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveItem(i, 1)}
                  disabled={i === items.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 leading-none text-xs"
                  title="Вниз"
                >
                  ▼
                </button>
              </div>

              {/* Index */}
              <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-gray-500 mb-1">Назва</label>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem(i, "label", e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Href */}
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-gray-500 mb-1">Посилання</label>
                <input
                  type="text"
                  value={item.href}
                  onChange={(e) => updateItem(i, "href", e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Visible toggle */}
              <div className="flex flex-col items-center gap-1">
                <label className="text-xs text-gray-500">Показувати</label>
                <button
                  onClick={() => updateItem(i, "visible", !item.visible)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${item.visible ? "bg-orange-500" : "bg-gray-300"}`}
                >
                  <span
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{ left: item.visible ? "22px" : "2px" }}
                  />
                </button>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeItem(i)}
                className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                title="Видалити"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-colors"
        >
          + Додати пункт
        </button>

        {/* Preview */}
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b font-medium uppercase tracking-wider">
            Попередній перегляд навбару
          </div>
          <div
            className="flex items-center gap-1 px-6 overflow-x-auto"
            style={{ backgroundColor: settings["colors.navy"] ?? "#1a2744", height: "52px" }}
          >
            {items.filter((n) => n.visible).map((item, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap"
                style={{
                  color: i === 0 ? (settings["colors.orange"] ?? "#f97316") : "rgba(255,255,255,0.85)",
                  borderBottom: i === 0 ? `2px solid ${settings["colors.orange"] ?? "#f97316"}` : "none",
                }}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={pending}
            className="px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-60"
            style={{ backgroundColor: "#1a2744" }}
          >
            {pending ? "Зберігається..." : "Зберегти навігацію"}
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
        </div>
      </div>
    );
  }
);

export default NavButtonsTab;
