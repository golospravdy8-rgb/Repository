"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface Match { id: string; title: string; url: string; date: string }
interface Session { id: number; match_id?: string; match_title: string; match_url: string; started_by: string }
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
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const playerWrapRef = useRef<HTMLDivElement | null>(null);
  const seekTargetRef = useRef<number>(0);
  const didSeekRef = useRef(false);
  const isHostRef = useRef(false);
  const currentSessionIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/tv-matches")
      .then((r) => r.json())
      .then((d) => setMatches(d.matches || []));
  }, []);

  // Polling для сесії та глядачів
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

  // Supabase Realtime для TV синхронізації
  useEffect(() => {
    if (!session || isHostRef.current) return; // тільки для глядачів

    try {
      const matchId = session.match_id || session.id;
      if (!matchId) return;

      const channel = supabase
        .channel(`tv:match:${matchId}`, { config: { broadcast: { self: true } } })
        .on("broadcast", { event: "video_sync" }, (payload: any) => {
          const { currentTime, isPlaying, userName: syncName } = payload.payload || {};
          console.log(`[VIEWER] broadcast sync: ${currentTime}s from ${syncName}`);

          // Автоматично синхронізуємо глядача
          if (playerRef.current && typeof currentTime === "number" && !isNaN(currentTime)) {
            playerRef.current.currentTime = currentTime;
            if (isPlaying && playerRef.current.paused) {
              playerRef.current.play().catch(() => {});
            }
          }
        })
        .subscribe();

      return () => {
        channel.unsubscribe().catch(() => {});
      };
    } catch {}
  }, [session]);

  // HOST: надсилаємо currentTime через PUT кожні 3 сек
  // та broadcast на Supabase Realtime для синхронізації глядачів
  useEffect(() => {
    if (!showPlayer || !isHostRef.current || !currentSessionIdRef.current) return;

    let lastSent = -1;
    const interval = setInterval(async () => {
      if (!playerRef.current) return;
      const ct = Math.floor(playerRef.current.currentTime || 0);
      if (ct > 0 && ct !== lastSent) {
        lastSent = ct;
        console.log(`[HOST] ⬆ sending ${ct}s`);

        // Сохранити в БД
        fetch("/api/tv-session", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: currentSessionIdRef.current,
            currentTimeSec: ct,
          }),
        }).catch(() => {});

        // Broadcast на Supabase для синхронізації глядачів (опціонально)
        try {
          const matchId = session?.match_id || session?.id;
          if (matchId) {
            const channel = supabase.channel(`tv:match:${matchId}`);
            await channel.send({
              type: "broadcast",
              event: "video_sync",
              payload: {
                currentTime: ct,
                isPlaying: !playerRef.current.paused,
                userName: userName,
              },
            }).catch(() => {});
          }
        } catch {}
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [showPlayer, session]);

  // Обробка fullscreen зміни
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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

    // Якщо є сервери з частинами — показуємо UI для вибору
    if (d.servers && d.servers.length > 0) {
      console.log(`[HOST] 📺 Found ${d.servers.length} servers with options`);
      // Зберігаємо інфо в sessionRef для подальшого вибору
      (window as any).__tvServerInfo = {
        servers: d.servers,
        sessionId,
        matchUrl: match.url,
        matchTitle: match.title,
      };
      // Показуємо плеєр (але без відео), для вибору сервера
      setShowPlayer(true);
      setMinimized(false);
      isHostRef.current = true;
      currentSessionIdRef.current = sessionId;
      setVideoUrl(null); // Ще не обрано відео
      setVideoType("server-selection");
      onSendMessage?.(`📺 ${userName} запустив матч: ${match.title} — натисни LIVE щоб приєднатись!`);
      return;
    }

    if (d.videoUrl) {
      setVideoUrl(d.videoUrl);
      setVideoType(d.type);
      setShowPlayer(true);
      setMinimized(false);
      isHostRef.current = true;
      didSeekRef.current = true;
      seekTargetRef.current = 0;
      currentSessionIdRef.current = sessionId;
      console.log(`[HOST] ✅ session started, id=${sessionId}, type=${d.type}`);

      if (d.type === "iframe") {
        console.log(`[HOST] ℹ️ Type is iframe — sync via DB polling only`);
        const syncInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - Date.now()) / 1000);
          fetch("/api/tv-session", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: sessionId,
              currentTimeSec: Math.max(0, elapsed % 3600)
            }),
          }).catch(() => {});
        }, 10000);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = syncInterval;
      }

      onSendMessage?.(`📺 ${userName} запустив матч: ${match.title} — натисни LIVE щоб приєднатись!`);
    } else {
      window.open(match.url, "_blank");
      onSendMessage?.(`📺 ${userName} запустив матч: ${match.title} (відкрився в новій вкладці)`);
    }
  };

  const handleSelectPart = async (partUrl: string) => {
    const serverInfo = (window as any).__tvServerInfo;
    if (!serverInfo) return;

    setLoadingVideo(true);
    try {
      const r = await fetch(`/api/tv-video?url=${encodeURIComponent(serverInfo.matchUrl)}&part=${encodeURIComponent(partUrl)}`);
      const d = await r.json();

      if (d.videoUrl) {
        setVideoUrl(d.videoUrl);
        setVideoType(d.type || "external");
        didSeekRef.current = true;
        seekTargetRef.current = 0;
        console.log(`[HOST] ✅ Loaded ${partUrl}, type=${d.type}`);
      }
    } catch (e) {
      console.error("Error selecting part:", e);
    } finally {
      setLoadingVideo(false);
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

  const handleSync = async () => {
    if (!session || isHostRef.current) return;
    setSyncing(true);
    setSyncMessage("");

    try {
      const matchId = session.id || session.match_id || null;
      if (!matchId) {
        setSyncMessage("❌ ID матчу не знайдено");
        setTimeout(() => setSyncMessage(""), 3000);
        return;
      }

      // Отримуємо останній broadcast з TV каналу
      // або просто синхронізуємось з БД через /api/tv-session
      const res = await fetch(`/api/tv-session?matchId=${encodeURIComponent(String(matchId))}`);

      if (!res.ok) {
        setSyncMessage("❌ Помилка синхронізації");
        setTimeout(() => setSyncMessage(""), 3000);
        return;
      }

      const { session: hostSession } = await res.json();
      if (!hostSession) {
        setSyncMessage("❌ Сесія не знайдена");
        setTimeout(() => setSyncMessage(""), 3000);
        return;
      }

      const seekTime = Number(hostSession.current_time_sec) || 0;
      const hostName = hostSession.started_by || "Хост";

      // Перемотати відео
      if (playerRef.current && !isNaN(seekTime)) {
        playerRef.current.currentTime = seekTime;
        if (playerRef.current.paused) {
          playerRef.current.play().catch(() => {});
        }
      }

      setSyncMessage(`✅ Синх з ${hostName} (${Math.floor(seekTime)}с)`);
      setTimeout(() => setSyncMessage(""), 4000);
    } catch (e) {
      setSyncMessage("❌ Помилка з'єднання");
      setTimeout(() => setSyncMessage(""), 3000);
    } finally {
      setSyncing(false);
    }
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

  // Форматування часу: 125 -> "2:05"
  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Обробка клику на прогрес-бар
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (playerRef.current) {
      playerRef.current.currentTime = newTime;
    }
  };

  // Обробка fullscreen
  const handleFullscreen = () => {
    if (!playerWrapRef.current) return;
    if (!document.fullscreenElement) {
      playerWrapRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const s = {
    wrap: {
      position: "absolute" as const,
      top: 0,
      right: 0,
      width: "50%",
      maxHeight: showPlayer && !minimized ? "90vh" : "auto",
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
    playerWrap: { flex: 1, overflow: "hidden", minHeight: 200, display: "flex", flexDirection: "column" as const, background: "#000" } as React.CSSProperties,
    progressWrap: { padding: "6px 8px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", flexShrink: 0 } as React.CSSProperties,
    progressBar: { width: "100%", height: 4, cursor: "pointer", accentColor: "#f97316" } as React.CSSProperties,
    timeDisplay: { display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 4 } as React.CSSProperties,
    playerVideo: { flex: 1, display: "block", background: "#000", objectFit: "contain" as const } as React.CSSProperties,
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
                <>
                  <button
                    style={{ ...s.stopBtn, background: syncing ? "rgba(100,100,100,0.3)" : "rgba(100,200,100,0.2)", opacity: syncing ? 0.5 : 1 }}
                    onClick={handleSync}
                    disabled={syncing}
                  >
                    {syncing ? "⏳" : "🔄"} Синх
                  </button>
                  <button style={s.stopBtn} onClick={handleLeave}>
                    ↩ Вийти
                  </button>
                  {syncMessage && (
                    <span style={{ fontSize: 10, color: syncMessage.includes("✅") ? "#4ade80" : "#ef4444", whiteSpace: "nowrap" }}>
                      {syncMessage}
                    </span>
                  )}
                </>
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

      {loadingVideo && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, padding: "4px 8px", textAlign: "center" }}>⏳ Завантажуємо...</div>}

      {showPlayer && videoType === "server-selection" && !minimized && (
        <div style={s.playerWrap} ref={playerWrapRef}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, overflow: "auto", padding: "10px", background: "#000" }}>
            {(() => {
              const serverInfo = (window as any).__tvServerInfo;
              if (!serverInfo?.servers) return <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Завантажуємо...</div>;

              return (
                <div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                    Виберіть сервер й частину:
                  </div>
                  {serverInfo.servers.map((server: any, i: number) => (
                    <div key={i} style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
                        📺 {server.name}
                      </div>
                      {server.parts.length > 0 ? (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {server.parts.map((part: any, j: number) => (
                            <button
                              key={j}
                              onClick={() => handleSelectPart(part.url)}
                              style={{
                                background: "#f97316",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                padding: "5px 10px",
                                fontSize: 10,
                                cursor: "pointer",
                                fontWeight: 700,
                                flex: "1 1 auto",
                                minWidth: 60,
                              }}
                            >
                              ▶ {part.label}
                            </button>
                          ))}
                        </div>
                      ) : server.watchUrl ? (
                        <a
                          href={server.watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            background: "#f97316",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            padding: "5px 10px",
                            fontSize: 10,
                            cursor: "pointer",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          🔗 Відкрити
                        </a>
                      ) : (
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9 }}>Немає посилань</div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showPlayer && videoUrl && !minimized && (
        <div style={s.playerWrap} ref={playerWrapRef}>
          {videoType === "iframe" || videoType === "external" ? (
            <iframe src={videoUrl} style={{ width: "100%", height: "100%", minHeight: 320, border: "none", display: "block", flex: 1 }} allowFullScreen />
          ) : (
            <>
              {/* Контейнер відео з максимальною висотою — flex: 1 займає весь доступний простір */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden", position: "relative" }}>
                <video
                  ref={playerRef}
                  style={s.playerVideo}
                  onLoadedMetadata={() => {
                    // VIEWER: перша спроба seekTo (може спрацювати раніше onTimeUpdate)
                    if (!isHostRef.current && !didSeekRef.current && seekTargetRef.current > 0 && playerRef.current) {
                      console.log(`[VIEWER] onLoadedMetadata seekTo ${seekTargetRef.current}s`);
                      playerRef.current.currentTime = seekTargetRef.current;
                      // НЕ скидаємо didSeekRef тут — перевіримо в onTimeUpdate що seek дійсно відбувся
                    }
                    // Оновлюємо duration
                    if (playerRef.current) {
                      setDuration(playerRef.current.duration);
                    }
                  }}
                  onTimeUpdate={() => {
                    if (!playerRef.current) return;

                    // Оновлюємо поточний час для прогрес-бару
                    setCurrentTime(playerRef.current.currentTime);

                    console.log(`[DEBUG] onTimeUpdate: isHost=${isHostRef.current}, sessionId=${currentSessionIdRef.current}, currentTime=${playerRef.current.currentTime}`);

                    // HOST: надсилаємо currentTime кожні 3 секунди
                    if (isHostRef.current && currentSessionIdRef.current) {
                      const ct = Math.floor(playerRef.current.currentTime);
                      if (ct > 0 && ct % 3 === 0) {
                        const key = `_sent_${ct}`;
                        if (!(playerRef.current as any)[key]) {
                          (playerRef.current as any)[key] = true;
                          console.log(`[HOST] ⬆ ${ct}s → session ${currentSessionIdRef.current}`);
                          fetch("/api/tv-session", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              sessionId: currentSessionIdRef.current,
                              currentTimeSec: ct
                            }),
                          }).catch(() => {});
                        }
                      }
                      return;
                    }

                    // VIEWER: один раз seekTo після старту
                    if (!isHostRef.current && !didSeekRef.current && seekTargetRef.current > 0) {
                      console.log(`[VIEWER] onTimeUpdate seekTo ${seekTargetRef.current}s`);
                      playerRef.current.currentTime = seekTargetRef.current;
                      didSeekRef.current = true;
                      seekTargetRef.current = 0;
                    }
                  }}
                >
                  <source src={videoUrl} type="video/mp4" />
                </video>

                {/* Кнопки управління у правому верхньому куті */}
                <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 6 }}>
                  {videoType === "external" && (
                    <button
                      onClick={() => {
                        setVideoUrl(null);
                        setVideoType("server-selection");
                      }}
                      title="Обрати іншу частину"
                      style={{
                        background: "rgba(0,0,0,0.6)",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 14,
                        padding: "6px 10px",
                        borderRadius: 4,
                        transition: "background 0.2s",
                      }}
                    >
                      ↪ Назад
                    </button>
                  )}
                  <button
                    onClick={handleFullscreen}
                    title={isFullscreen ? "Вийти з повного екрана" : "Повний екран"}
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      fontSize: 18,
                      padding: "6px 10px",
                      borderRadius: 4,
                      transition: "background 0.2s",
                    }}
                  >
                    {isFullscreen ? "✖️" : "⛶"}
                  </button>
                </div>
              </div>

              {/* Прогрес-бар та відображення часу */}
              <div style={s.progressWrap}>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  style={s.progressBar}
                  title={`${formatTime(currentTime)} / ${formatTime(duration)}`}
                />
                <div style={s.timeDisplay}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
