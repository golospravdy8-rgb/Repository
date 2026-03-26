"use client";

import { useState, useTransition, forwardRef, useImperativeHandle } from "react";
import { updateHomeWidgets } from "@/actions/site-settings";
import type { SaveHandle } from "../SiteEditorClient";

const WidgetsTab = forwardRef<SaveHandle, { settings: Record<string, string> }>(
  function WidgetsTab({ settings }, ref) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [showLive, setShowLive] = useState(settings["home.showLive"] !== "false");
  const [showStandings, setShowStandings] = useState(settings["home.showStandings"] !== "false");
  const [showNews, setShowNews] = useState(settings["home.showNews"] !== "false");
  const [liveLimit, setLiveLimit] = useState(parseInt(settings["home.liveLimit"] ?? "4", 10));
  const [standingsLimit, setStandingsLimit] = useState(parseInt(settings["home.standingsLimit"] ?? "6", 10));
  const [newsLimit, setNewsLimit] = useState(parseInt(settings["home.newsLimit"] ?? "3", 10));
  const [liveTitle, setLiveTitle] = useState(settings["home.liveTitle"] ?? "Найближчі матчі");
  const [standingsTitle, setStandingsTitle] = useState(settings["home.standingsTitle"] ?? "Таблиця сезону");
  const [newsTitle, setNewsTitle] = useState(settings["home.newsTitle"] ?? "Останні новини");

  const handleSave = () => {
    startTransition(async () => {
      await updateHomeWidgets({
        "home.showLive": String(showLive),
        "home.showStandings": String(showStandings),
        "home.showNews": String(showNews),
        "home.liveLimit": String(liveLimit),
        "home.standingsLimit": String(standingsLimit),
        "home.newsLimit": String(newsLimit),
        "home.liveTitle": liveTitle,
        "home.standingsTitle": standingsTitle,
        "home.newsTitle": newsTitle,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  useImperativeHandle(ref, () => ({ save: handleSave }));

  const Toggle = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        className={`relative w-10 h-6 rounded-full transition-colors ${value ? "bg-orange-500" : "bg-gray-300"}`}
        onClick={() => onChange(!value)}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-1"}`}
        />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
  );

  const WidgetRow = ({
    label,
    visible,
    onVisibleChange,
    limit,
    onLimitChange,
    title,
    onTitleChange,
    maxItems,
  }: {
    label: string;
    visible: boolean;
    onVisibleChange: (v: boolean) => void;
    limit: number;
    onLimitChange: (v: number) => void;
    title: string;
    onTitleChange: (v: string) => void;
    maxItems: number;
  }) => (
    <div className={`bg-gray-50 rounded-xl p-4 space-y-3 transition-opacity ${!visible ? "opacity-50" : ""}`}>
      <Toggle label={label} value={visible} onChange={onVisibleChange} />
      {visible && (
        <>
          <div className="flex items-center gap-4 pl-12">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Заголовок секції</label>
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Кількість елементів: <span className="text-orange-500 font-bold">{limit}</span>
              </label>
              <input
                type="range"
                min={1}
                max={maxItems}
                value={limit}
                onChange={(e) => onLimitChange(parseInt(e.target.value))}
                className="w-32"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Управляйте блоками на головній сторінці — вмикайте/вимикайте, налаштовуйте кількість елементів та заголовки.
      </p>

      <WidgetRow
        label="Live матчі та найближчі матчі"
        visible={showLive}
        onVisibleChange={setShowLive}
        limit={liveLimit}
        onLimitChange={setLiveLimit}
        title={liveTitle}
        onTitleChange={setLiveTitle}
        maxItems={8}
      />

      <WidgetRow
        label="Таблиця standings"
        visible={showStandings}
        onVisibleChange={setShowStandings}
        limit={standingsLimit}
        onLimitChange={setStandingsLimit}
        title={standingsTitle}
        onTitleChange={setStandingsTitle}
        maxItems={16}
      />

      <WidgetRow
        label="Останні новини"
        visible={showNews}
        onVisibleChange={setShowNews}
        limit={newsLimit}
        onLimitChange={setNewsLimit}
        title={newsTitle}
        onTitleChange={setNewsTitle}
        maxItems={9}
      />

      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-60"
          style={{ backgroundColor: "#1a2744" }}
        >
          {pending ? "Зберігається..." : "Зберегти налаштування"}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
      </div>
    </div>
  );
}
);

export default WidgetsTab;
