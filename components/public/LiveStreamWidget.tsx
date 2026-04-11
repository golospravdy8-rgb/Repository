"use client";

import { useEffect, useRef, useState } from "react";

interface StreamConfig {
  title: string;
  description: string;
  scheduledAt: string;
  pollIntervalSeconds: number;
  countdownThresholdMinutes: number;
  channelId: string;
  /** If false — do not poll YouTube API, but still show subscribe button */
  pollingEnabled?: boolean;
}

interface StreamStatus {
  isLive: boolean;
  videoId: string | null;
  title?: string;
}

export default function LiveStreamWidget({ config }: { config: StreamConfig }) {
  const pollingEnabled = config.pollingEnabled !== false;

  const [isLive, setIsLive] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [liveTitle, setLiveTitle] = useState<string>("");
  const [countdown, setCountdown] = useState("");
  const [countdownDone, setCountdownDone] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scheduledMs = config.scheduledAt ? new Date(config.scheduledAt).getTime() : 0;
  const thresholdMs = config.countdownThresholdMinutes * 60 * 1000;

  // Dynamic polling: faster during countdown, slower otherwise
  const isCountdownActive = () => {
    if (!scheduledMs) return false;
    const diff = scheduledMs - Date.now();
    return diff > 0 && diff <= thresholdMs;
  };
  const pollMs = isCountdownActive()
    ? 10 * 1000  // 10 sec during countdown window
    : Math.max(config.pollIntervalSeconds, 30) * 1000; // 30+ sec otherwise

  const channelUrl = config.channelId
    ? `https://www.youtube.com/channel/${config.channelId}`
    : "https://youtube.com";

  const getIsCountdownActive = (): boolean => {
    if (!scheduledMs) return false;
    const diff = scheduledMs - Date.now();
    return diff > 0 && diff <= thresholdMs;
  };

  const poll = async () => {
    try {
      const res = await fetch("/api/stream/status", { cache: "no-store" });
      if (!res.ok) return;
      const data: StreamStatus = await res.json();
      setIsLive(data.isLive);
      setVideoId(data.videoId);
      if (data.title) setLiveTitle(data.title);
    } catch { /* silently ignore */ }
  };

  useEffect(() => {
    if (!scheduledMs) return;
    countdownRef.current = setInterval(() => {
      const diff = scheduledMs - Date.now();
      if (diff <= 0) { setCountdown("00:00"); setCountdownDone(true); return; }
      setCountdownDone(false);
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setCountdown(h > 0
        ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
        : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pollingEnabled) return;
    poll();
    pollRef.current = setInterval(poll, pollMs);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingEnabled, pollMs]);

  const displayTitle = (isLive && liveTitle) ? liveTitle : config.title;
  const showCountdown = !isLive && getIsCountdownActive();
  const showStarting = !isLive && countdownDone && scheduledMs > 0;

  // ── LIVE ──────────────────────────────────────────────────────────────────
  if (isLive && videoId) {
    return (
      <section style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: "1px solid #fee2e2" }}>
        {/* Header: px 16→12, py 10→8 */}
        <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1a2744" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="live-pulse" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "0.05em" }}>🔴 LIVE</span>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>•</span>
            <span style={{ color: "white", fontSize: "0.875rem", fontWeight: 600 }}>{displayTitle || "Пряма трансляція"}</span>
          </div>
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
            Відкрити на YouTube ↗
          </a>
        </div>
        <div style={{ position: "relative", paddingTop: "56.25%", background: "#000" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1&iv_load_policy=3&fs=1&enablejsapi=1&origin=https://basketball.lviv.ua`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
            title={displayTitle || "Live Stream"}
          />
        </div>
        <style>{`.live-pulse{animation:livePulse 1.4s ease-in-out infinite}@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}`}</style>
      </section>
    );
  }

  // ── STARTING ──────────────────────────────────────────────────────────────
  if (showStarting) {
    return (
      <section style={{ backgroundColor: "white", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #fed7aa", overflow: "hidden" }}>
        <div style={{ padding: "6px 12px", fontSize: "0.75rem", fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", backgroundColor: "#1a2744" }}>
          Трансляція починається...
        </div>
        {/* px 24→18, py 24→18 */}
        <div style={{ padding: "18px 18px", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 9 }} className="animate-pulse">🏀</div>
          <div className="font-black text-gray-900 text-xl" style={{ marginBottom: 3 }}>{displayTitle || "Матч сезону"}</div>
          {config.description && <div className="text-sm text-gray-500" style={{ marginBottom: 9 }}>{config.description}</div>}
          <div className="text-sm font-semibold" style={{ color: "#f97316", marginBottom: 12 }}>Очікуємо початку трансляції...</div>
          <a href={channelUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", padding: "8px 15px", borderRadius: 9, fontWeight: 700, fontSize: "0.875rem", color: "white", backgroundColor: "#ff0000", textDecoration: "none" }}>
            ▶ Відкрити канал на YouTube
          </a>
        </div>
      </section>
    );
  }

  // ── COUNTDOWN ─────────────────────────────────────────────────────────────
  if (showCountdown) {
    return (
      <section style={{ backgroundColor: "white", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6", overflow: "hidden" }}>
        <div style={{ padding: "6px 12px", fontSize: "0.75rem", fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", backgroundColor: "#1a2744" }}>
          Незабаром • Пряма трансляція
        </div>
        {/* px 24→18, py 24→18 */}
        <div style={{ padding: "18px 18px", textAlign: "center" }}>
          <div className="text-sm text-gray-500 font-medium" style={{ marginBottom: 6 }}>До початку трансляції:</div>
          <div className="text-5xl font-black tracking-widest font-mono" style={{ color: "#f97316", marginBottom: 9 }}>
            {countdown || "—:——"}
          </div>
          <div className="font-black text-gray-900 text-xl" style={{ marginBottom: 3 }}>{displayTitle || "Матч сезону"}</div>
          {config.description && <div className="text-sm text-gray-500">{config.description}</div>}
          {scheduledMs > 0 && (
            <div className="text-sm text-gray-400" style={{ marginTop: 6 }}>
              {new Date(config.scheduledAt).toLocaleDateString("uk-UA", { weekday: "long", day: "numeric", month: "long" })}
              {" "}о{" "}
              {new Date(config.scheduledAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          <a href={channelUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", marginTop: 12, padding: "8px 15px", borderRadius: 9, fontWeight: 700, fontSize: "0.875rem", color: "white", backgroundColor: "#ff0000", textDecoration: "none" }}>
            ▶ Підписатись на канал
          </a>
        </div>
      </section>
    );
  }

  // ── DEFAULT — subscribe button ─────────────────────────────────────────────
  return (
    <section style={{ backgroundColor: "white", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6", overflow: "hidden" }}>
      {/* px 24→18, py 20→15, gap 16→12 */}
      <div style={{ padding: "15px 18px", display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
          {/* icon: w-12 h-12 (48px) → 36px */}
          <div style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white", fontSize: "1rem", fontWeight: 900, backgroundColor: "#f97316" }}>
            ▶
          </div>
          <div style={{ flex: 1 }}>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400" style={{ marginBottom: 1 }}>Трансляція</div>
            <div className="font-black text-gray-900 text-lg leading-tight">{displayTitle || "Матч сезону"}</div>
            {config.description && <div className="text-sm text-gray-500" style={{ marginTop: 2 }}>{config.description}</div>}
            {scheduledMs > 0 && (
              <div className="text-sm text-gray-500" style={{ marginTop: 3 }}>
                Трансляція запланована на{" "}
                <span className="font-semibold text-gray-700">
                  {new Date(config.scheduledAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}
                </span>
                {" "}о{" "}
                <span className="font-semibold text-gray-700">
                  {new Date(config.scheduledAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
          </div>
          {/* Subscribe button: px 16→12, py 10→8 */}
          <a href={channelUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 9, fontWeight: 700, fontSize: "0.875rem", color: "white", backgroundColor: "#ff0000", textDecoration: "none" }}>
            ▶ Підписатись на канал
          </a>
        </div>
      </div>
    </section>
  );
}
