"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface Match { id: string; title: string; url: string; date: string }
interface Session { id: number; match_id?: string; match_title: string; match_url: string; started_by: string }
interface NbaGame { id: string; homeTeam: string; awayTeam: string; kyivTimeFormatted: string; etTimeFormatted: string; dateStr: string; status: string }
interface LiveSession { id: string; gameId: string; homeTeam: string; awayTeam: string; isActive: boolean; liveUrl?: string; liveSource?: string }
interface UserStream { id: string; gameId: string; gameTitle: string; gameTime: string; kyivTime: string; streamUrl: string; submittedBy: string }
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
  const [showSchedule, setShowSchedule] = useState(false);
  const [nbaGames, setNbaGames] = useState<NbaGame[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [liveMatch, setLiveMatch] = useState<LiveSession | null>(null);

  // New state for 10-minute search window + user streams + instruction modal
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [userStreams, setUserStreams] = useState<UserStream[]>([]);
  const [loadingUserStreams, setLoadingUserStreams] = useState(false);
  const [selectedGameForStream, setSelectedGameForStream] = useState<NbaGame | null>(null);
  const [streamUrlInput, setStreamUrlInput] = useState("");
  const [submittingStream, setSubmittingStream] = useState(false);
  const [refreshingSchedule, setRefreshingSchedule] = useState(false);

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

  // Polling для live sessions з NBA
  useEffect(() => {
    const pollLive = async () => {
      try {
        const r = await fetch("/api/live-sessions");
        const d = await r.json();
        if (d.sessions) {
          const activeSessions = d.sessions.filter((s: LiveSession) => s.isActive);
          setLiveSessions(activeSessions);
          // Set the first active live match (if any)
          setLiveMatch(activeSessions.length > 0 ? activeSessions[0] : null);
        }
      } catch (e) {
        console.error("[TvBlock] Error fetching live sessions:", e);
      }
    };
    pollLive();
    const liveInterval = setInterval(pollLive, 30000); // Poll every 30 seconds
    return () => clearInterval(liveInterval);
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

  // Inject pulse animation CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
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
    setVideoUrl(null); // Очищаємо попередній URL для гладкого переходу
    try {
      const r = await fetch(`/api/tv-video?url=${encodeURIComponent(serverInfo.matchUrl)}&part=${encodeURIComponent(partUrl)}`);
      const d = await r.json();

      if (d.videoUrl) {
        setVideoUrl(d.videoUrl);
        // Для зовнішніх посилань (watchUrl) використовуємо iframe
        setVideoType(d.type || "external");
        didSeekRef.current = true;
        seekTargetRef.current = 0;
        console.log(`[HOST] ✅ Loaded part, type=${d.type}`);
      } else if (partUrl) {
        // Якщо немає videoUrl (для watchUrl), просто завантажуємо посилання як iframe
        setVideoUrl(partUrl);
        setVideoType("external");
        didSeekRef.current = true;
        seekTargetRef.current = 0;
        console.log(`[HOST] ✅ Loaded external URL`);
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

  const handleOpenSchedule = async () => {
    setShowSchedule(true);
    setLoadingSchedule(true);
    // Lock body scroll when modal opens
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    try {
      const r = await fetch("/api/nba-schedule");
      const d = await r.json();
      if (d.games) {
        setNbaGames(d.games);
      }
    } catch (e) {
      console.error("Error loading NBA schedule:", e);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleCloseSchedule = () => {
    setShowSchedule(false);
    setSelectedGameForStream(null);
    setStreamUrlInput("");
    // Unlock body scroll
    if (typeof document !== "undefined") {
      document.body.style.overflow = "auto";
    }
  };

  const handleRefreshSchedule = async () => {
    setRefreshingSchedule(true);
    try {
      const r = await fetch("/api/nba-schedule");
      const d = await r.json();
      if (d.games) {
        setNbaGames(d.games);
      }
    } catch (e) {
      console.error("Error refreshing schedule:", e);
    } finally {
      setRefreshingSchedule(false);
    }
  };

  const handleAddUserStream = async (game: NbaGame, playVideo: boolean = false) => {
    if (!streamUrlInput.trim()) {
      alert("Вставте посилання");
      return;
    }

    setSubmittingStream(true);
    try {
      const res = await fetch("/api/user-streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          gameTitle: `${game.awayTeam} @ ${game.homeTeam}`,
          gameTime: new Date().toISOString(), // Use current time, backend will handle
          kyivTime: new Date().toISOString(),
          streamUrl: streamUrlInput.trim(),
          submittedBy: userName,
        }),
      });

      if (res.ok) {
        const url = streamUrlInput.trim();
        setStreamUrlInput("");
        setSelectedGameForStream(null);
        onSendMessage?.(
          `📺 Користувач ${userName} додав посилання на ${game.awayTeam} @ ${game.homeTeam}`
        );
        // Reload user streams
        await loadUserStreamsForGame(game.id);

        // Якщо потрібно запустити відео — закриваємо модалку та запускаємо плеєр
        if (playVideo) {
          setShowSchedule(false);
          if (typeof document !== "undefined") {
            document.body.style.overflow = "auto";
          }
          // Стартуємо відео
          setLoadingVideo(true);
          try {
            const vr = await fetch(`/api/tv-video?url=${encodeURIComponent(url)}`);
            const vd = await vr.json();
            setLoadingVideo(false);

            if (vd.videoUrl) {
              setVideoUrl(vd.videoUrl);
              setVideoType(vd.type || "external");
              setShowPlayer(true);
              setMinimized(false);
              isHostRef.current = false;
              onSendMessage?.(`📺 ${userName} запустив трансляцію: ${game.awayTeam} @ ${game.homeTeam}`);
            } else if (url) {
              // Fallback: спробуємо URL як iframe
              setVideoUrl(url);
              setVideoType("external");
              setShowPlayer(true);
              setMinimized(false);
              isHostRef.current = false;
            }
          } catch (e) {
            console.error("Error loading stream:", e);
            setLoadingVideo(false);
          }
        }
      } else {
        const error = await res.json();
        alert(`Помилка: ${error.error}`);
      }
    } catch (e) {
      console.error("Error adding stream:", e);
      alert("Помилка при додаванні посилання");
    } finally {
      setSubmittingStream(false);
    }
  };

  const loadUserStreamsForGame = async (gameId: string) => {
    try {
      const r = await fetch(`/api/user-streams?gameId=${gameId}`);
      const d = await r.json();
      if (d.streams) {
        setUserStreams(d.streams);
      }
    } catch (e) {
      console.error("Error loading user streams:", e);
    }
  };

  const handleOpenInstructionModal = () => {
    setShowInstructionModal(true);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
  };

  const handleCloseInstructionModal = () => {
    setShowInstructionModal(false);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "auto";
    }
  };

  const handleLiveButtonClick = async () => {
    if (!liveMatch?.liveUrl) return;
    // Open live stream in extractEmbedUrl flow or direct link
    setLoadingVideo(true);
    try {
      const r = await fetch(`/api/tv-video?url=${encodeURIComponent(liveMatch.liveUrl)}`);
      const d = await r.json();
      setLoadingVideo(false);

      if (d.videoUrl) {
        setVideoUrl(d.videoUrl);
        setVideoType(d.type || "external");
        setShowPlayer(true);
        setMinimized(false);
        isHostRef.current = false;
        onSendMessage?.(`🔴 LIVE: ${liveMatch.awayTeam} vs ${liveMatch.homeTeam}`);
      } else {
        window.open(liveMatch.liveUrl, "_blank");
      }
    } catch (e) {
      console.error("Error loading live stream:", e);
      window.open(liveMatch.liveUrl, "_blank");
      setLoadingVideo(false);
    }
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
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {liveMatch && liveMatch.liveUrl && (
            <button
              onClick={handleLiveButtonClick}
              title={`LIVE: ${liveMatch.awayTeam} vs ${liveMatch.homeTeam}`}
              style={{
                background: "#ef4444",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 3,
                fontWeight: 700,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              🔴 LIVE
            </button>
          )}
          <button
            onClick={handleOpenSchedule}
            title="NBA Schedule"
            style={{
              background: "#f97316",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 3,
              fontWeight: 700,
            }}
          >
            📅 Schedule
          </button>
          <button
            onClick={handleOpenInstructionModal}
            title="Інструкція телевізора"
            style={{
              background: "#3b82f6",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 3,
              fontWeight: 700,
            }}
          >
            ℹ️ Інструкція
          </button>
          <button onClick={() => setMinimized(true)} style={{ background: "none", border: "none", color: "#f97316", cursor: "pointer", fontSize: 12, padding: 0 }}>
            ✕
          </button>
        </div>
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

      {/* Live NBA Sessions Button */}
      {liveSessions.length > 0 && (
        <div style={{ padding: "6px 8px", background: "rgba(239,68,68,0.15)", borderTop: "1px solid rgba(239,68,68,0.3)", borderBottom: "1px solid rgba(239,68,68,0.3)" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>🔴 LIVE NBA:</span>
            {liveSessions.map((session) => (
              <a
                key={session.id}
                href={session.liveUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  background: "#ef4444",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  cursor: session.liveUrl ? "pointer" : "default",
                  opacity: session.liveUrl ? 1 : 0.6,
                }}
              >
                {session.awayTeam.substring(0, 3)} vs {session.homeTeam.substring(0, 3)}
              </a>
            ))}
          </div>
        </div>
      )}

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
                        <button
                          onClick={() => handleSelectPart(server.watchUrl)}
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
                        </button>
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
            <iframe
              src={videoUrl}
              style={{
                width: "100%",
                height: "100%",
                minHeight: 320,
                border: "none",
                display: "block",
                flex: 1,
                overflow: "hidden"
              }}
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
              frameBorder="0"
              scrolling="no"
            />
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
                  {videoType && videoType !== "server-selection" && (
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

      {showSchedule && (
        <div
          onClick={handleCloseSchedule}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0d1b2e",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "min(1100px, 96vw)",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* ── HEADER ── */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              flexShrink: 0,
            }}>
              <div>
                <div style={{ color: "white", fontSize: "16px", fontWeight: 700 }}>
                  📅 Розклад матчів NBA
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: "2px" }}>
                  Вставте посилання та натисніть Enter для запуску
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleRefreshSchedule}
                  disabled={refreshingSchedule}
                  style={{
                    padding: "6px 12px",
                    background: refreshingSchedule ? "rgba(100,100,100,0.3)" : "#f97316",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: refreshingSchedule ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: 700,
                    opacity: refreshingSchedule ? 0.6 : 1,
                  }}
                >
                  {refreshingSchedule ? "⏳" : "🔄"} Оновити
                </button>
                <button
                  onClick={handleOpenInstructionModal}
                  style={{
                    padding: "6px 12px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  ℹ️ Інструкція
                </button>
                <button
                  onClick={handleCloseSchedule}
                  style={{
                    padding: "6px 10px",
                    background: "transparent",
                    color: "#f97316",
                    border: "1px solid rgba(249,115,22,0.4)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ── BODY: горизонтальный слайдер ── */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {loadingSchedule ? (
                <div style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "14px",
                }}>
                  ⏳ Завантаження матчів...
                </div>
              ) : nbaGames.length > 0 ? (
                (() => {
                  // Группируем игры по дате
                  const grouped: Record<string, typeof nbaGames> = {};
                  nbaGames.forEach((game) => {
                    const key = game.dateStr || "Невідома дата";
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(game);
                  });
                  const dates = Object.keys(grouped);

                  return (
                    <div style={{
                      flex: 1,
                      overflowY: "auto",
                      overflowX: "hidden",
                      padding: "12px 16px 16px",
                      minHeight: 0,
                    }}>
                      {dates.length > 0 && <div style={{ height: "110px" }} />}
                      {dates.map((date) => {
                        // Виявляємо Play-In дати (14-17 квітня)
                        const isPlayIn = date.includes("14 квітня") ||
                                        date.includes("15 квітня") ||
                                        date.includes("16 квітня") ||
                                        date.includes("17 квітня");

                        return (
                        <div key={date} style={{ marginBottom: "16px" }}>
                          {/* Заголовок даты */}
                          <div style={{
                            color: "#f97316",
                            fontSize: "11px",
                            fontWeight: 700,
                            marginBottom: "8px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}>
                            📅 {date}
                            {isPlayIn && (
                              <span style={{
                                marginLeft: "8px",
                                background: "rgba(220,38,38,0.2)",
                                color: "#ef4444",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "9px",
                                fontWeight: 800,
                                border: "1px solid rgba(220,38,38,0.4)",
                              }}>
                                [PLAY-IN]
                              </span>
                            )}
                          </div>

                          {/* Сетка 2 колонки — БЕЗ горизонтального скролла */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "10px",
                          }}>
                            {grouped[date].map((game) => (
                              <div
                                key={game.id}
                                style={{
                                  background: "linear-gradient(145deg, #111e3a 0%, #0c1628 100%)",
                                  border: game.status === "live"
                                    ? "1px solid rgba(239,68,68,0.6)"
                                    : "1px solid rgba(249,115,22,0.25)",
                                  borderRadius: "10px",
                                  padding: "10px 12px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "6px",
                                  boxSizing: "border-box",
                                }}
                              >
                                {/* Статус */}
                                {game.status === "live" ? (
                                  <span style={{
                                    alignSelf: "flex-start",
                                    background: "#ef4444",
                                    color: "white",
                                    fontSize: "9px",
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: "20px",
                                  }}>🔴 LIVE</span>
                                ) : (
                                  <span style={{
                                    alignSelf: "flex-start",
                                    background: "rgba(249,115,22,0.15)",
                                    color: "#f97316",
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: "20px",
                                    border: "1px solid rgba(249,115,22,0.3)",
                                  }}>📅 UPCOMING</span>
                                )}

                                {/* Команды */}
                                <div style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  color: "white",
                                  lineHeight: 1.3,
                                }}>
                                  {game.awayTeam} — {game.homeTeam}
                                </div>

                                {/* Время */}
                                <div style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#f97316",
                                }}>
                                  {game.etTimeFormatted} → {game.kyivTimeFormatted}
                                </div>

                                <div style={{ height: "1px", background: "rgba(255,255,255,0.08)" }} />

                                {/* Кнопка / Инпут */}
                                {selectedGameForStream?.id === game.id ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                    <input
                                      type="text"
                                      placeholder="https://..."
                                      value={streamUrlInput}
                                      onChange={(e) => setStreamUrlInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !submittingStream && streamUrlInput.trim()) {
                                          handleAddUserStream(game, true);
                                        }
                                      }}
                                      autoFocus
                                      style={{
                                        width: "100%",
                                        padding: "5px 8px",
                                        borderRadius: "5px",
                                        border: "1px solid rgba(249,115,22,0.5)",
                                        background: "rgba(249,115,22,0.08)",
                                        color: "white",
                                        fontSize: "11px",
                                        outline: "none",
                                        boxSizing: "border-box",
                                      }}
                                    />
                                    <div style={{ display: "flex", gap: "5px" }}>
                                      <button
                                        onClick={() => handleAddUserStream(game, true)}
                                        disabled={submittingStream || !streamUrlInput.trim()}
                                        style={{
                                          flex: 1,
                                          padding: "6px",
                                          background: "#f97316",
                                          color: "white",
                                          border: "none",
                                          borderRadius: "5px",
                                          cursor: "pointer",
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          opacity: submittingStream || !streamUrlInput.trim() ? 0.6 : 1,
                                        }}
                                      >
                                        {submittingStream ? "⏳" : "▶ Запустити"}
                                      </button>
                                      <button
                                        onClick={() => { setSelectedGameForStream(null); setStreamUrlInput(""); }}
                                        style={{
                                          padding: "6px 8px",
                                          background: "rgba(255,255,255,0.06)",
                                          color: "rgba(255,255,255,0.6)",
                                          border: "1px solid rgba(255,255,255,0.12)",
                                          borderRadius: "5px",
                                          cursor: "pointer",
                                          fontSize: "11px",
                                        }}
                                      >✕</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setSelectedGameForStream(game); setStreamUrlInput(""); }}
                                    style={{
                                      width: "100%",
                                      padding: "6px",
                                      background: "rgba(249,115,22,0.1)",
                                      color: "#f97316",
                                      border: "1px solid rgba(249,115,22,0.35)",
                                      borderRadius: "5px",
                                      cursor: "pointer",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      textAlign: "center",
                                    }}
                                  >
                                    + Додати посилання
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                      })}

                    </div>
                  );
                })()
              ) : (
                <div style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.4)",
                  gap: "12px",
                }}>
                  <div style={{ fontSize: "32px" }}>🏀</div>
                  <div style={{ fontSize: "14px" }}>Матчів не знайдено</div>
                  <button
                    onClick={handleRefreshSchedule}
                    style={{
                      padding: "8px 16px",
                      background: "#f97316",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    🔄 Спробувати ще раз
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}


      {/* Інструкція телевізора Modal */}
      {showInstructionModal && (
        <div
          onClick={handleCloseInstructionModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0a1432",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                flexShrink: 0,
              }}
            >
              <h3 style={{ color: "white", margin: 0, fontSize: "16px", fontWeight: 700 }}>
                📺 Інструкція телевізора
              </h3>
              <button
                onClick={handleCloseInstructionModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "#f97316",
                  cursor: "pointer",
                  fontSize: "24px",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "16px",
                color: "rgba(255,255,255,0.9)",
                fontSize: "13px",
                lineHeight: "1.6",
                scrollBehavior: "smooth",
              }}
              className="instruction-modal-scroll"
            >
              <div style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
{`Інструкція телевізора

📅 Розклад матчів
У цьому вікні ви бачите всі матчі NBA за Київським часом.

🔴 Пряма трансляція
Система автоматично шукає посилання тільки в перші 10 хвилин матчу (перша спроба на старті + друга через 10 хв). Якщо знайдено — з'являється червона кнопка Live.

📌 Своє посилання
Якщо ви знайшли хороше посилання раніше — вставте його в спеціальне поле (або прямо під матчем у розкладі). Після цього всі учасники чату зможуть приєднатися до перегляду.

📼 Матчі в записі
Нижче в слайдері ви можете обрати будь-який матч у записі.

🔗 Як поділитися трансляцією
1. Знайдіть якісне посилання
2. Вставте його в поле
3. Натисніть «Запустити в телевізорі»

Топ-джерела 2026: basketball-video.com, streameast.live (зеркала), sportsurge.net

Приємного перегляду! 🏀`}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Горизонтальний scrollbar для слайдера матчів */
        .nba-games-list {
          scrollbar-width: thin;
          scrollbar-color: #f97316 rgba(255, 255, 255, 0.05);
        }
        .nba-games-list::-webkit-scrollbar {
          height: 8px;
        }
        .nba-games-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          margin: 0 18px;
        }
        .nba-games-list::-webkit-scrollbar-thumb {
          background-color: #f97316;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        .nba-games-list::-webkit-scrollbar-thumb:hover {
          background-color: #ff9d4d;
        }
        .nba-games-list::-webkit-scrollbar-thumb:active {
          background-color: #fb923c;
        }

        .instruction-modal-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.5) rgba(255, 255, 255, 0.05);
        }
        .instruction-modal-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .instruction-modal-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .instruction-modal-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(59, 130, 246, 0.6);
          border-radius: 4px;
          border: 2px solid rgba(255, 255, 255, 0.05);
        }
        .instruction-modal-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(59, 130, 246, 0.8);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
