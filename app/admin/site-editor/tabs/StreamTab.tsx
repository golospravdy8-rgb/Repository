"use client";

import { useState, useTransition } from "react";
import { updateSiteTexts } from "@/actions/site-settings";

export default function StreamTab({ settings }: { settings: Record<string, string> }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [enabled, setEnabled] = useState(settings["stream.enabled"] === "true");
  const [showOnHome, setShowOnHome] = useState(settings["stream.showOnHome"] !== "false");
  const [channelId, setChannelId] = useState(settings["stream.youtubeChannelId"] || "");
  const [apiKey, setApiKey] = useState(settings["stream.youtubeApiKey"] || "");
  const [title, setTitle] = useState(settings["stream.title"] || "");
  const [description, setDescription] = useState(settings["stream.description"] || "");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const v = settings["stream.scheduledAt"] || "";
    if (!v) return "";
    try {
      const d = new Date(v);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } catch { return ""; }
  });
  const [pollInterval, setPollInterval] = useState(settings["stream.pollIntervalSeconds"] || "30");
  const [countdownThreshold, setCountdownThreshold] = useState(settings["stream.countdownThresholdMinutes"] || "60");

  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // Channel ID validation: must start with UC and be 24 chars, or be empty
  const channelIdTrimmed = channelId.trim();
  const channelIdIsEmail = channelIdTrimmed.includes("@");
  const channelIdValid = !channelIdTrimmed || (channelIdTrimmed.startsWith("UC") && channelIdTrimmed.length === 24);

  const handleSave = () => {
    startTransition(async () => {
      await updateSiteTexts({
        "stream.enabled": enabled ? "true" : "false",
        "stream.showOnHome": showOnHome ? "true" : "false",
        // Don't save invalid channel ID (email etc.)
        "stream.youtubeChannelId": channelIdValid ? channelIdTrimmed : "",
        "stream.youtubeApiKey": apiKey.trim(),
        "stream.title": title.trim(),
        "stream.description": description.trim(),
        "stream.scheduledAt": scheduledAt ? new Date(scheduledAt).toISOString() : "",
        "stream.pollIntervalSeconds": pollInterval,
        "stream.countdownThresholdMinutes": countdownThreshold,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch("/api/stream/status");
      const data = await res.json();
      if (data.isLive) {
        setTestStatus(`✅ Трансляція LIVE! videoId: ${data.videoId} — «${data.title}»`);
      } else if (data.error) {
        setTestStatus(`❌ Помилка: ${data.error}`);
      } else {
        setTestStatus("⏳ Канал знайдено. Трансляція зараз не активна.");
      }
    } catch {
      setTestStatus("❌ Не вдалося підключитися до API");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-base font-semibold text-gray-800">YouTube Трансляція</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Секція автоматично з&apos;являється на головній коли YouTube канал починає пряму трансляцію.
        </p>
      </div>

      {/* Toggles */}
      <div className="bg-gray-50 rounded-xl border p-4 space-y-3">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-semibold text-gray-800">Увімкнути трансляцію</div>
            <div className="text-xs text-gray-500">Дозволяє перевіряти статус YouTube каналу</div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-orange-500" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
          </button>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-semibold text-gray-800">Показувати на головній</div>
            <div className="text-xs text-gray-500">Відображати секцію трансляції на головній сторінці</div>
          </div>
          <button
            type="button"
            onClick={() => setShowOnHome(!showOnHome)}
            className={`relative w-11 h-6 rounded-full transition-colors ${showOnHome ? "bg-orange-500" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showOnHome ? "translate-x-5" : ""}`} />
          </button>
        </label>
      </div>

      {/* YouTube credentials */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">YouTube Channel ID</label>
          <input
            className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 ${
              channelIdTrimmed && !channelIdValid ? "border-red-400 bg-red-50" : "border-gray-200"
            }`}
            placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
          />
          {channelIdIsEmail && (
            <p className="text-xs text-red-500 mt-1 font-medium">
              ❌ Це email-адреса, не Channel ID. Channel ID починається з &quot;UC&quot; і містить 24 символи.
            </p>
          )}
          {channelIdTrimmed && !channelIdIsEmail && !channelIdValid && (
            <p className="text-xs text-red-500 mt-1 font-medium">
              ❌ Невірний формат. Channel ID: &quot;UC&quot; + 22 символи (всього 24).
            </p>
          )}
          {channelIdValid && channelIdTrimmed && (
            <p className="text-xs text-green-600 mt-1 font-medium">✓ Формат Channel ID правильний</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Знайти: сторінка каналу → Про канал → Поділитись → Копіювати ID каналу
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">YouTube Data API v3 Key</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="AIzaSy..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
          />
          <p className="text-xs text-gray-400 mt-1">
            Отримати на{" "}
            <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline text-blue-400">
              console.cloud.google.com
            </a>{" "}
            → YouTube Data API v3
          </p>
        </div>

        {/* Test button */}
        {channelIdValid && channelIdTrimmed && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleTest}
              disabled={testing || pending}
              className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {testing ? "Перевірка..." : "Перевірити з'єднання"}
            </button>
            {testStatus && (
              <span className="text-xs text-gray-600 flex-1">{testStatus}</span>
            )}
          </div>
        )}
      </div>

      {/* Match info */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700 text-sm border-b pb-2">Інформація про матч</h4>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Назва матчу</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Індійські леопарди vs Барси"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Опис</label>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            placeholder="Матч 5-го туру сезону 2025-2026..."
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Запланований час <span className="text-gray-400 font-normal">(тільки для зворотного відліку)</span>
          </label>
          <input
            type="datetime-local"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            Вбудовування з&apos;являється тільки коли YouTube API підтверджує початок трансляції — незалежно від цього часу.
          </p>
        </div>
      </div>

      {/* Polling settings */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700 text-sm border-b pb-2">Налаштування опитування</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Інтервал перевірки (сек)</label>
            <input
              type="number"
              min="10"
              max="300"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={pollInterval}
              onChange={(e) => setPollInterval(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Як часто перевіряти статус. Мін. 10 сек.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Поріг відліку (хв)</label>
            <input
              type="number"
              min="1"
              max="1440"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={countdownThreshold}
              onChange={(e) => setCountdownThreshold(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">За скільки хвилин до початку показувати відлік.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-60"
          style={{ backgroundColor: "#1a2744" }}
        >
          {pending ? "Зберігається..." : "Зберегти"}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
      </div>
    </div>
  );
}
