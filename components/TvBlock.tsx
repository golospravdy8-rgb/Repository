"use client";
import { useEffect, useState, useRef } from "react";

interface Match { id: string; title: string; url: string; date: string }
interface Session { id: number; match_title: string; match_url: string; started_by: string }
interface Props { userName: string; onSendMessage?: (text: string) => void }

export default function TvBlock({ userName, onSendMessage }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [viewers, setViewers] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoType, setVideoType] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const seekTargetRef = useRef<number>(0);
  const didSeekRef = useRef(false);
  const isHostRef = useRef(false);
  const currentSessionIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/tv-matches")
      .then((r) => r.json())
      .then((d) => setMatches(d.matches || []));
  }, []);

  useEffect(() => {
    const poll = async () => {
      const r = await fetch("/api/tv-session");
      const d = await r.json();
      setSession(d.session);
      setViewers(d.viewers || []);
    };
    poll();
    intervalRef.current = setInterval(poll, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (!showPlayer || !playerRef.current) return;

    const handleTimeUpdate = () => {
      if (!isHostRef.current || !currentSessionIdRef.current) return;

      const ct = Math.floor(playerRef.current!.currentTime);
      // Відправляємо кожні 3 секунди (ct % 3 === 0)
      if (ct > 0 && ct % 3 === 0) {
        console.log(`[HOST] sending ${ct}s to session ${currentSessionIdRef.current}`);
        fetch("/api/tv-session", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: currentSessionIdRef.current,
            currentTimeSec: ct
          }),
        }).catch(() => {});
      }
    };

    const videoEl = playerRef.current;
    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    return () => videoEl.removeEventListener("timeupdate", handleTimeUpdate);
  }, [showPlayer]);

  const handleWatch = async (match: Match) => {
    const sr = await fetch("/api/tv-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, matchTitle: match.title, matchUrl: match.url, userName }),
    });
    const sd = await sr.json();
    const sessionId = sd.session?.id;

    setLoadingVideo(true);
    const r = await fetch(`/api/tv-video?url=${encodeURIComponent(match.url)}`);
    const d = await r.json();
    setLoadingVideo(false);
    if (d.videoUrl) {
      setVideoUrl(d.videoUrl);
      setVideoType(d.type);
      setShowPlayer(true);
      setMinimized(false);
      isHostRef.current = true;
      didSeekRef.current = true;   // host не seekає
      seekTargetRef.current = 0;
      currentSessionIdRef.current = sessionId;
      console.log(`[HOST] ✅ session started, id=${sessionId}`);
      onSendMessage?.(`📺 ${userName} запустив матч: ${match.title} — натисни LIVE щоб приєднатись!`);
    } else {
      window.open(match.url, "_blank");
      onSendMessage?.(`📺 ${userName} запустив матч: ${match.title} (відкрився в новій вкладці)`);
    }
  };

  const handleJoin = async () => {
    if (!session) return;
    setHasLeft(false);

    // Крок 1: читаємо поточну секунду host
    const r = await fetch("/api/tv-session");
    const d = await r.json();
    if (!d.session) return;

    const hostSec = Number(d.session.current_time_sec) || 0;
    console.log(`[VIEWER] joining, host at ${hostSec}s`);

    // Встановлюємо refs для viewer
    isHostRef.current = false;
    seekTargetRef.current = hostSec;
    didSeekRef.current = false;  // дозволяємо seekTo при наступному onLoadedMetadata

    // Крок 2: додаємо себе до viewers
    const pr = await fetch("/api/tv-session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, userName }),
    });
    const pd = await pr.json();
    setViewers(pd.viewers || []);

    // Крок 3: завантажуємо відео
    setLoadingVideo(true);
    const vr = await fetch(`/api/tv-video?url=${encodeURIComponent(d.session.match_url)}`);
    const vd = await vr.json();
    setLoadingVideo(false);

    if (vd.videoUrl) {
      // Якщо відео вже завантажено (той самий URL) — просто seekTo
      if (vd.videoUrl === videoUrl && playerRef.current) {
        console.log(`[VIEWER] same URL, direct seekTo ${hostSec}s`);
        playerRef.current.currentTime = hostSec;
        didSeekRef.current = true;
        seekTargetRef.current = 0;
        setShowPlayer(true);
        setMinimized(false);
      } else {
        // Нове відео — seekTarget спрацює через onLoadedMetadata
        setVideoUrl(vd.videoUrl);
        setVideoType(vd.type);
        setShowPlayer(true);
        setMinimized(false);
      }
    } else {
      window.open(d.session.match_url, "_blank");
    }
  };

  const handleLeave = () => {
    setShowPlayer(false);
    setVideoUrl(null);
    setVideoType(null);
    setHasLeft(true);
    isHostRef.current = false;
    seekTargetRef.current = 0;
    didSeekRef.current = false;
  };

  const handleStop = async () => {
    if (!session) return;
    await fetch("/api/tv-session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    });
    setShowPlayer(false);
    setVideoUrl(null);
    setVideoType(null);
  };

  const s = {
    wrap: {
      position: "absolute" as const,
      top: 0,
      right: 0,
      width: "50%",
      maxHeight: showPlayer && !minimized ? "60vh" : "auto",
      zIndex: 10,
      background: "rgba(10, 20, 50, 0.96)",
      backdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderTop: "none",
      borderRight: "none",
      borderRadius: "0 0 0 14px",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column" as const,
    } as React.CSSProperties,
    title: { padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 } as React.CSSProperties,
    slider: { display: "flex", overflowX: "auto" as const, gap: 6, padding: "6px 8px", scrollSnapType: "x mandatory" as const, flexShrink: 0 },
    card: { minWidth: 100, flexShrink: 0, scrollSnapAlign: "start" as const, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 6, fontSize: 9, color: "white", textAlign: "center" as const },
    cardText: { lineHeight: 1.2, marginBottom: 3, overflow: "hidden", display: "-webkit-box" as const, WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const },
    btn: { background: "#f97316", color: "white", border: "none", borderRadius: 5, padding: "3px 6px", cursor: "pointer", fontSize: 9, marginTop: 4, width: "100%", fontWeight: 700 } as React.CSSProperties,
    live: { padding: "5px 8px", background: "rgba(249,115,22,0.1)", borderRadius: 6, border: "1px solid rgba(249,115,22,0.3)", color: "white", fontSize: 10, flexShrink: 0 } as React.CSSProperties,
    joinBtn: { background: "#f97316", color: "white", border: "none", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 10, marginRight: 3, fontWeight: 700 } as React.CSSProperties,
    stopBtn: { background: "rgba(255,255,255,0.1)", color: "white", border: "none", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontWeight: 700 } as React.CSSProperties,
    playerWrap: { flex: 1, overflow: "hidden", minHeight: 320 } as React.CSSProperties,
  };

  // Мінімізований режим: показувати тільки один рядок
  if (minimized) {
    return (
      <div style={s.wrap}>
        <div style={s.title}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ whiteSpace: "nowrap" }}>📺</span>
            {session && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                🔴 {session.match_title.substring(0, 20)}...
              </span>
            )}
          </div>
          <button onClick={() => setMinimized(false)} style={{ background: "none", border: "none", color: "#f97316", cursor: "pointer", fontSize: 11, flexShrink: 0, padding: 0 }}>
            ⬆
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>
        <span>📺 Телевізор</span>
        <button onClick={() => setMinimized(true)} style={{ background: "none", border: "none", color: "#f97316", cursor: "pointer", fontSize: 12, padding: 0 }}>
          ✕
        </button>
      </div>

      <div style={s.slider}>
        {matches.length === 0 && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, padding: "4px 8px" }}>Завантаження...</div>}
        {matches.map((m) => (
          <div key={m.id} style={s.card}>
            <div style={s.cardText}>{m.title}</div>
            <button style={s.btn} onClick={() => handleWatch(m)}>▶</button>
          </div>
        ))}
      </div>

      {session && (() => {
        const canJoin = !viewers.includes(userName) || hasLeft || !showPlayer;
        const isHost = session.started_by === userName;
        return (
          <div style={s.live}>
            <div style={{ marginBottom: 3, fontSize: 10, fontWeight: 700 }}>
              🔴 <strong>LIVE:</strong> {session.match_title.substring(0, 35)}
            </div>
            <div style={{ marginBottom: 5, fontSize: 9, color: "rgba(255,255,255,0.6)" }}>
              👁 ({viewers.length}): {viewers.slice(0, 5).join(", ")}
              {viewers.length > 5 ? ` +${viewers.length - 5}` : ""}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {canJoin && (
                <button style={s.joinBtn} onClick={handleJoin}>
                  🎮 Приєднатись
                </button>
              )}
              {showPlayer && !hasLeft && !isHost && (
                <button style={s.stopBtn} onClick={handleLeave}>
                  ↩ Вийти
                </button>
              )}
              {isHost && (
                <button style={{ ...s.stopBtn, background: "rgba(220,50,50,0.2)" }} onClick={handleStop}>
                  ⏹ Зупинити
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {loadingVideo && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, padding: "4px 8px", textAlign: "center" }}>⏳</div>}

      {showPlayer && videoUrl && !minimized && (
        <div style={s.playerWrap}>
          {videoType === "iframe" ? (
            <iframe src={videoUrl} style={{ width: "100%", height: "100%", minHeight: 320, border: "none", display: "block" }} allowFullScreen />
          ) : (
            <video
              ref={playerRef}
              width="100%"
              height="100%"
              controls
              onLoadedMetadata={() => {
                // Після завантаження: seekTo target якщо є
                if (!isHostRef.current && seekTargetRef.current > 0 && playerRef.current) {
                  console.log(`[VIEWER] onLoadedMetadata seekTo ${seekTargetRef.current}s`);
                  playerRef.current.currentTime = seekTargetRef.current;
                }
              }}
              onTimeUpdate={() => {
                // VIEWER: перевіряємо чи вже seekнули
                if (isHostRef.current || !playerRef.current) return;

                if (!didSeekRef.current && seekTargetRef.current > 0) {
                  console.log(`[VIEWER] onTimeUpdate seekTo ${seekTargetRef.current}s, currently at ${Math.floor(playerRef.current.currentTime)}s`);
                  playerRef.current.currentTime = seekTargetRef.current;
                  didSeekRef.current = true;
                  seekTargetRef.current = 0;
                }
              }}
              style={{ minHeight: 320, display: "block", background: "#000", objectFit: "cover" }}
            >
              <source src={videoUrl} type="video/mp4" />
            </video>
          )}
        </div>
      )}

    </div>
  );
}
