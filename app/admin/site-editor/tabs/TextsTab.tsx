"use client";

import { useState, useTransition, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { updateSiteTexts, updateNavigation } from "@/actions/site-settings";
import type { SaveHandle } from "../SiteEditorClient";

const TEXT_COLORS_CONFIG = [
  { key: "colors.text.heading", label: "Колір заголовків", hint: "H1 на всіх сторінках: Розклад, Змагання, Новини, Команди…", default: "#1a2744" },
  { key: "colors.text.accent", label: "Колір акцентів", hint: "Акцентні тексти, бейджі вікових груп, посилання", default: "#f97316" },
  { key: "colors.text.body", label: "Колір основного тексту", hint: "Основний текст контенту на сторінках", default: "#1f2937" },
  { key: "colors.text.muted", label: "Колір другорядного тексту", hint: "Підписи, дати, мета-інформація", default: "#6b7280" },
];

function ColorRow({
  cfg,
  initialValue,
  onChange,
}: {
  cfg: (typeof TEXT_COLORS_CONFIG)[0];
  initialValue: string;
  onChange: (key: string, val: string) => void;
}) {
  const [val, setVal] = useState(initialValue || cfg.default);
  const update = (v: string) => { setVal(v); onChange(cfg.key, v); };

  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-0">
      <div className="flex-1">
        <div className="text-sm font-semibold text-gray-800">{cfg.label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{cfg.hint}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="color"
          value={val}
          onChange={(e) => update(e.target.value)}
          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={val}
          onChange={(e) => update(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <div className="w-8 h-8 rounded-lg border border-gray-200 flex-shrink-0" style={{ backgroundColor: val }} />
        <button
          type="button"
          onClick={() => update(cfg.default)}
          className="text-xs text-gray-400 hover:text-gray-600 px-1"
          title="Скинути"
        >
          ↺
        </button>
      </div>
    </div>
  );
}

interface NavItem {
  href: string;
  label: string;
  visible: boolean;
}

function parseNavItems(value: string): NavItem[] {
  try {
    return JSON.parse(value);
  } catch {
    return [
      { href: "/news", label: "Новини", visible: true },
      { href: "/schedule", label: "Розклад", visible: true },
      { href: "/standings", label: "Змагання", visible: true },
      { href: "/leaders", label: "Лідери", visible: true },
      { href: "/teams", label: "Команди", visible: true },
      { href: "/players", label: "Гравці", visible: true },
      { href: "/contacts", label: "Контакти", visible: true },
    ];
  }
}

const TextsTab = forwardRef<SaveHandle, { settings: Record<string, string> }>(
  function TextsTab({ settings }, ref) {
    const [pending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);
    const [navItems, setNavItems] = useState<NavItem[]>(parseNavItems(settings["nav.items"] ?? ""));
    const formRef = useRef<HTMLFormElement>(null);

    // Use state so preview re-renders on change
    const [textColors, setTextColors] = useState<Record<string, string>>(() => {
      const init: Record<string, string> = {};
      for (const cfg of TEXT_COLORS_CONFIG) {
        const saved = settings[cfg.key];
        // Use saved value only if it looks like a real color (not empty/white default artifact)
        init[cfg.key] = (saved && saved !== "#ffffff" && saved !== "") ? saved : cfg.default;
      }
      return init;
    });

    const handleColorChange = useCallback((key: string, val: string) => {
      setTextColors((prev) => ({ ...prev, [key]: val }));
    }, []);

    const doSave = () => {
      if (!formRef.current) return;
      const fd = new FormData(formRef.current);
      const data: Record<string, string> = {};
      fd.forEach((v, k) => { data[k] = v.toString(); });
      Object.assign(data, textColors);
      startTransition(async () => {
        await updateSiteTexts(data);
        await updateNavigation(navItems);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    };

    useImperativeHandle(ref, () => ({ save: doSave }));

    const handleTextsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      doSave();
    };

    const handleNavSave = () => {
      startTransition(async () => {
        await updateNavigation(navItems);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    };

    const addNavItem = () => setNavItems([...navItems, { href: "/", label: "Новий пункт", visible: true }]);
    const removeNavItem = (i: number) => setNavItems(navItems.filter((_, idx) => idx !== i));
    const moveNavItem = (i: number, dir: -1 | 1) => {
      const arr = [...navItems];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      setNavItems(arr);
    };
    const updateNavItem = (i: number, field: keyof NavItem, value: string | boolean) => {
      setNavItems(navItems.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
    };

    const field = (key: string, label: string, multiline = false) => (
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
        {multiline ? (
          <textarea
            name={key}
            defaultValue={settings[key] ?? ""}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        ) : (
          <input
            name={key}
            type="text"
            defaultValue={settings[key] ?? ""}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        )}
      </div>
    );

    return (
      <div className="space-y-8">
        <form ref={formRef} onSubmit={handleTextsSubmit} className="space-y-6">
          <section>
            <h2 className="font-bold text-gray-800 mb-4 text-base border-b pb-2">Загальна інформація</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("site.name", "Назва сайту")}
              {field("site.shortName", "Коротка назва")}
              {field("site.tagline", "Tagline")}
              {field("site.season", "Сезон")}
              {field("site.logoText", "Текст логотипу (у кружечку)")}
              {field("site.description", "Опис сайту", true)}
            </div>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-4 text-base border-b pb-2">Контакти</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("contact.address", "Адреса")}
              {field("contact.email", "Email")}
              {field("contact.website", "Сайт (відображення)")}
              {field("contact.websiteUrl", "URL сайту")}
              {field("contact.phone", "Телефон")}
            </div>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-4 text-base border-b pb-2">Соціальні мережі</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("social.facebook", "Facebook URL")}
              {field("social.instagram", "Instagram URL")}
              {field("social.youtube", "YouTube URL")}
              {field("social.telegram", "Telegram URL")}
            </div>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-4 text-base border-b pb-2">Головна сторінка (Hero)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("hero.badge", "Бейдж (напр. Сезон 2025-2026)")}
              {field("hero.title", "Заголовок Hero")}
              {field("hero.subtitle", "Підзаголовок Hero", true)}
              {field("hero.ctaPrimary", "Текст кнопки (основна)")}
              {field("hero.ctaSecondary", "Текст кнопки (вторинна)")}
            </div>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-4 text-base border-b pb-2">Футер</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("footer.about", "Текст «про нас» у футері")}
              {field("footer.copyright", "Текст копірайту")}
            </div>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-1 text-base border-b pb-2">Кольори тексту на сторінках</h2>
            <p className="text-xs text-gray-500 mb-4">Застосовуються на всіх публічних сторінках: Розклад, Змагання, Команди, Новини, Гравці, Лідери, Контакти тощо.</p>
            <div className="bg-gray-50 rounded-xl border p-4">
              {TEXT_COLORS_CONFIG.map((cfg) => (
                <ColorRow
                  key={cfg.key}
                  cfg={cfg}
                  initialValue={textColors[cfg.key]}
                  onChange={handleColorChange}
                />
              ))}
            </div>
            {/* Live preview */}
            <div className="mt-4 bg-white rounded-xl border p-5 space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Попередній перегляд</div>
              <div className="text-2xl font-black" style={{ color: textColors["colors.text.heading"] }}>
                Розклад матчів
              </div>
              <div className="text-sm" style={{ color: textColors["colors.text.body"] }}>
                Сезон 2025-2026 · Львівська дитяча баскетбольна ліга
              </div>
              <div className="text-xs" style={{ color: textColors["colors.text.muted"] }}>
                Останнє оновлення: сьогодні
              </div>
              <div className="inline-block text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: textColors["colors.text.accent"] }}>
                U-14
              </div>
            </div>
          </section>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={pending}
              className="px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: "#1a2744" }}
            >
              {pending ? "Зберігається..." : "Зберегти тексти"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
          </div>
        </form>

        {/* Navigation editor */}
        <section>
          <h2 className="font-bold text-gray-800 mb-4 text-base border-b pb-2">Пункти навігації</h2>
          <div className="space-y-2">
            {navItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveNavItem(i, -1)} className="text-gray-400 hover:text-gray-700 text-xs leading-none">▲</button>
                  <button onClick={() => moveNavItem(i, 1)} className="text-gray-400 hover:text-gray-700 text-xs leading-none">▼</button>
                </div>
                <input
                  value={item.label}
                  onChange={(e) => updateNavItem(i, "label", e.target.value)}
                  placeholder="Назва"
                  className="border border-gray-200 rounded px-2 py-1 text-sm w-32 focus:outline-none"
                />
                <input
                  value={item.href}
                  onChange={(e) => updateNavItem(i, "href", e.target.value)}
                  placeholder="/шлях"
                  className="border border-gray-200 rounded px-2 py-1 text-sm flex-1 focus:outline-none"
                />
                <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.visible}
                    onChange={(e) => updateNavItem(i, "visible", e.target.checked)}
                    className="rounded"
                  />
                  Видимий
                </label>
                <button
                  onClick={() => removeNavItem(i)}
                  className="text-red-400 hover:text-red-600 text-sm px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-3">
            <button
              onClick={addNavItem}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + Додати пункт
            </button>
            <button
              onClick={handleNavSave}
              disabled={pending}
              className="px-6 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-60"
              style={{ backgroundColor: "#f97316" }}
            >
              Зберегти навігацію
            </button>
          </div>
        </section>
      </div>
    );
  }
);

export default TextsTab;
