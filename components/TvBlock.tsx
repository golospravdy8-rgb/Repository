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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    intervalRef.current = setInterval(poll, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleWatch = async (match: Match) => {
    await fetch("/api/tv-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, matchTitle: match.title, matchUrl: match.url, userName }),
    });
    setLoadingVideo(true);
    const r = await fetch(`/api/tv-video?url=${encodeURIComponent(match.url)}`);
    const d = await r.json();
    setLoadingVideo(false);
    if (d.videoUrl) {
      setVideoUrl(d.videoUrl);
      setVideoType(d.type);
      setShowPlayer(true);
      setMinimized(false);
      onSendMessage?.(`📺 ${userName} запустив матч: ${match.title} — натисни LIVE щоб приєднатись!`);
    } else {
      window.open(match.url, "_blank");
      onSendMessage?.(`📺 ${userName} запустив матч: ${match.title} (відкрився в новій вкладці)`);
    }
  };

  const handleJoin = async () => {
    if (!session) return;
    await fetch("/api/tv-session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, userName }),
    });
    if (videoUrl) { setShowPlayer(true); setMinimized(false); }
    else window.open(session.match_url, "_blank");
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
    wrap: { background:"#131f3a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:12, marginBottom:12 } as React.CSSProperties,
    title: { color:"white", fontSize:13, fontWeight:700, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" } as React.CSSProperties,
    slider: { display:"flex", overflowX:"auto" as const, gap:8, paddingBottom:6, scrollSnapType:"x mandatory" as const },
    card: { minWidth:110, flexShrink:0, scrollSnapAlign:"start" as const, background:"rgba(255,255,255,0.05)", borderRadius:10, padding:8, fontSize:10, color:"white", textAlign:"center" as const },
    btn: { background:"#f97316", color:"white", border:"none", borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:10, marginTop:6, width:"100%" } as React.CSSProperties,
    live: { marginTop:8, padding:8, background:"rgba(249,115,22,0.1)", borderRadius:8, border:"1px solid rgba(249,115,22,0.3)", color:"white", fontSize:11 } as React.CSSProperties,
    joinBtn: { background:"#f97316", color:"white", border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:11, marginRight:4 } as React.CSSProperties,
    stopBtn: { background:"rgba(255,255,255,0.1)", color:"white", border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:11 } as React.CSSProperties,
    playerWrap: { marginTop:8, borderRadius:10, overflow:"hidden", position:"relative" as const } as React.CSSProperties,
  };

  return (
    <div style={s.wrap}>
      <div style={s.title}>
        <span>📺 Телевізор</span>
        {showPlayer && (
          <button onClick={() => setMinimized(!minimized)} style={{ background:"none", border:"none", color:"#f97316", cursor:"pointer", fontSize:12 }}>
            {minimized ? "⬆ Розгорнути" : "⬇ Згорнути"}
          </button>
        )}
      </div>

      <div style={s.slider}>
        {matches.length === 0 && <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>Завантаження матчів...</div>}
        {matches.map((m) => (
          <div key={m.id} style={s.card}>
            <div style={{ lineHeight:1.3, marginBottom:4 }}>{m.title}</div>
            {m.date && <div style={{ color:"rgba(255,255,255,0.5)", fontSize:9, marginBottom:4 }}>{m.date}</div>}
            <button style={s.btn} onClick={() => handleWatch(m)}>▶ Дивитись</button>
          </div>
        ))}
      </div>

      {session && (
        <div style={s.live}>
          <div style={{ marginBottom:4 }}>🔴 <strong>LIVE:</strong> {session.match_title}</div>
          <div style={{ marginBottom:6, color:"rgba(255,255,255,0.7)" }}>
            👁 {viewers.slice(0,3).join(", ")}{viewers.length > 3 ? ` +${viewers.length - 3}` : ""}
          </div>
          <button style={s.joinBtn} onClick={handleJoin}>🎮 Приєднатись</button>
          {session.started_by === userName && (
            <button style={s.stopBtn} onClick={handleStop}>⏹ Зупинити</button>
          )}
        </div>
      )}

      {loadingVideo && <div style={{ color:"rgba(255,255,255,0.5)", fontSize:11, marginTop:8 }}>⏳ Завантаження відео...</div>}

      {showPlayer && videoUrl && !minimized && (
        <div style={s.playerWrap}>
          {videoType === "iframe" ? (
            <iframe src={videoUrl} width="100%" height="240" frameBorder="0" allowFullScreen style={{ borderRadius:8, display:"block" }} />
          ) : (
            <video width="100%" height="240" controls style={{ borderRadius:8, display:"block", background:"#000" }}>
              <source src={videoUrl} type="video/mp4" />
              Твій браузер не підтримує <code>video</code> елемент.
            </video>
          )}
        </div>
      )}

      {showPlayer && minimized && session && (
        <div style={{ ...s.live, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>📺 {session.match_title.substring(0,30)}...</span>
          <span style={{ color:"rgba(255,255,255,0.5)" }}>👁 {viewers.length}</span>
        </div>
      )}
    </div>
  );
}
