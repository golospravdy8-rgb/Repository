"use client";

import { useEffect, useRef, useState } from "react";

interface StreamConfig {
  title: string;
  description: string;
  scheduledAt: string;
  pollIntervalSeconds: number;
  countdownThresholdMinutes: number;
  channelId: string;
}

interface StreamStatus {
  isLive: boolean;
  videoId: string | null;
  title?: string;
}

export default function LiveStreamWidget({ config }: { config: StreamConfig }) {
  const [isLive, setIsLive] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [liveTitle, setLiveTitle] = useState<string>("");
  const [countdown, setCountdown] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scheduledMs = config.scheduledAt ? new Date(config.scheduledAt).getTime() : 0;
  const thresholdMs = config.countdownThresholdMinutes * 60 * 1000;
  const channelUrl = config.channelId
    ? `https://www.youtube.com/channel/${config.channelId}`
    : "https://youtube.com";

  // Determine if countdown should be shown (scheduled in future within threshold)
  const isCountdownActive = (): boolean => {
    if (!scheduledMs) return false;
    const diff = scheduledMs - Date.now();
    return diff > 0 && diff <= thresholdMs;
  };

  // Poll for live status every 5s
  const poll = async () => {
    try {
      const res = await fetch("/api/stream/status", { cache: "no-store" });
      if (!res.ok) return;
      const data: StreamStatus = await res.json();
      setIsLive(data.isLive);
      setVideoId(data.videoId);
      if (data.title) setLiveTitle(data.title);
    } catch {
      // silently ignore
    }
  };

  // Countdown ticker — independent of live status
  useEffect(() => {
    if (!scheduledMs) return;
    countdownRef.current = setInterval(() => {
      const diff = scheduledMs - Date.now();
      if (diff <= 0) {
        setCountdown("00:00");
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) {
        setCountdown(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        );
      } else {
        setCountdown(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      }
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll independently every 5s
  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayTitle = (isLive && liveTitle) ? liveTitle : config.title;
  const showCountdown = !isLive && isCountdownActive();

  // ── LIVE STATE — replaces everything when stream is active ─────────────────
  if (isLive && videoId) {
    return (
      <section className="rounded-2xl overflow-hidden shadow-lg border border-red-100">
        <div
          className="px-4 py-2.5 flex items-center justify-between"
          style={{ backgroundColor: "#1a2744" }}
        >
          <div className="flex items-center gap-2">
            <span className="live-pulse inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs font-black text-white uppercase tracking-wider">🔴 LIVE</span>
            <span className="text-white/60 text-xs">•</span>
            <span className="text-white text-sm font-semibold">{displayTitle || "Пряма трансляція"}</span>
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            Відкрити на YouTube ↗
          </a>
        </div>
        <div style={{ position: "relative", paddingTop: "56.25%", background: "#000" }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
            title={displayTitle || "Live Stream"}
          />
        </div>
        <style>{`
          .live-pulse { animation: livePulse 1.4s ease-in-out infinite; }
          @keyframes livePulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.8); }
          }
        `}</style>
      </section>
    );
  }

  // ── COUNTDOWN STATE ────────────────────────────────────────────────────────
  if (showCountdown) {
    return (
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div
          className="px-4 py-2 text-xs font-bold text-white uppercase tracking-wider text-center"
          style={{ backgroundColor: "#1a2744" }}
        >
          Незабаром • Пряма трансляція
        </div>
        <div className="px-6 py-6 text-center">
          <div className="text-sm text-gray-500 mb-2 font-medium">До початку трансляції:</div>
          <div
            className="text-5xl font-black tracking-widest mb-3 font-mono"
            style={{ color: "#f97316" }}
          >
            {countdown || "—:——"}
          </div>
          <div className="font-black text-gray-900 text-xl mb-1">{displayTitle || "Матч сезону"}</div>
          {config.description && (
            <div className="text-sm text-gray-500">{config.description}</div>
          )}
          {scheduledMs > 0 && (
            <div className="text-sm text-gray-400 mt-2">
              {new Date(config.scheduledAt).toLocaleDateString("uk-UA", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              о{" "}
              {new Date(config.scheduledAt).toLocaleTimeString("uk-UA", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#ff0000" }}
          >
            ▶ Підписатись на канал
          </a>
        </div>
      </section>
    );
  }

  // ── UPCOMING STATE (default) ───────────────────────────────────────────────
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-black"
            style={{ backgroundColor: "#f97316" }}
          >
            ▶
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">Трансляція</div>
            <div className="font-black text-gray-900 text-lg leading-tight">{displayTitle || "Матч сезону"}</div>
            {config.description && (
              <div className="text-sm text-gray-500 mt-0.5">{config.description}</div>
            )}
            {scheduledMs > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                Трансляція запланована на{" "}
                <span className="font-semibold text-gray-700">
                  {new Date(config.scheduledAt).toLocaleDateString("uk-UA", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>{" "}
                о{" "}
                <span className="font-semibold text-gray-700">
                  {new Date(config.scheduledAt).toLocaleTimeString("uk-UA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#ff0000" }}
        >
          ▶ Підписатись на канал
        </a>
      </div>
    </section>
  );
}
