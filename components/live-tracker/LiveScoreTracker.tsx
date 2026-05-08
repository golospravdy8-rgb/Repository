"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { nextQuarter, endGame, startGame, undoLastEvent, addAssist, addSteal, addReboundOff, addReboundDef, addBlock, addTurnover, addMissFt, addMissFg2, addMissFg3, addFoul, addFoulTechnical, addFoulUnsportsmanlike, addFoulDisqualifying, addCoachFoul, toggleIsStarter, addScoreWithType, addSubstitution, addTimeout, addFreeThrow } from "@/actions/game";
import type { Game, Team, Player, GameEvent, BoxScore } from "@prisma/client";
import StatEntryGrid from "./StatEntryGrid";

type GameWithAll = Game & {
  homeTeam: Team & { players: Player[] };
  awayTeam: Team & { players: Player[] };
  events: (GameEvent & {
    player: Pick<Player, "firstName" | "lastName" | "number"> | null;
  })[];
  onCourt: Array<{ gameId: number; playerId: number; teamId: number; onCourt: boolean }>;
  boxScores: (BoxScore & { player: Player })[];
};

const QUARTER_DURATION = 10 * 60;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getPlayerFoulCount(events: GameEvent[], playerId: number, foulType?: string) {
  if (foulType) {
    return events.filter(e => e.playerId === playerId && e.type === foulType).length;
  }
  return events.filter(e =>
    e.playerId === playerId &&
    (e.type === "FOUL" || e.type === "FOUL_UNSPORTSMANLIKE" || e.type === "FOUL_TECHNICAL" || e.type === "FOUL_DISQUALIFYING")
  ).length;
}

function getTeamFoulCount(events: GameEvent[], teamId: number, quarter: number, foulType?: string) {
  if (foulType) {
    return events.filter(e => e.teamId === teamId && e.quarter === quarter && e.type === foulType).length;
  }
  return events.filter(e =>
    e.teamId === teamId &&
    e.quarter === quarter &&
    (e.type === "FOUL" || e.type === "FOUL_UNSPORTSMANLIKE" || e.type === "FOUL_TECHNICAL" || e.type === "FOUL_DISQUALIFYING")
  ).length;
}

function RosterPanel({ players, teamId, team, onCourtIds, selectedId, onSelect, isHome, events, game }: {
  players: Player[];
  teamId: number;
  team: Team;
  onCourtIds: Set<number>;
  selectedId: number | null;
  onSelect: (id: number) => void;
  isHome: boolean;
  events: GameEvent[];
  game: GameWithAll;
}) {
  const onCourt = players.filter(p => onCourtIds.has(p.id));
  const bench = players.filter(p => !onCourtIds.has(p.id));

  return (
    <div style={{
      padding: "0 2px",
      background: isHome ? "#0d1520" : "#f3f4f6",
      fontSize: "11px",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      gap: "0px"
    }}>
      <div style={{
        fontSize: "8px",
        color: isHome ? "#3a6fa5" : "#4a7fa5",
        textTransform: "uppercase",
        letterSpacing: ".3px",
        padding: "2px 3px",
        marginBottom: "0px",
        whiteSpace: "nowrap",
        fontWeight: "600"
      }}>
        {team.name}
      </div>

      {/* На паркеті */}
      <div style={{
        fontSize: "9px",
        color: isHome ? "#2ecc71" : "#059669",
        background: "transparent",
        padding: "1px 3px",
        marginBottom: "0px",
        fontWeight: "bold",
        marginTop: "1px"
      }}>
        ● На паркеті ({onCourt.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
        {onCourt.map(p => {
          const foulCount = getPlayerFoulCount(events, p.id);
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2px",
                padding: "2px 4px",
                borderRadius: "1px",
                cursor: "pointer",
                background: selectedId === p.id ? (isHome ? "#163a5c" : "#fed7aa") : "transparent",
                transition: "background .1s",
                width: "100%",
                border: "none",
                fontSize: "10px",
                textAlign: "left",
                color: isHome ? (selectedId === p.id ? "#5ab3f4" : "#c8d8e8") : (selectedId === p.id ? "#92400e" : "#374151"),
                minHeight: "24px",
                margin: 0,
                overflow: "hidden"
              }}
            >
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: isHome ? "#2ecc71" : "#059669", flexShrink: 0 }} />
              <span style={{ minWidth: "18px", fontWeight: 700, fontSize: "16px" }}>#{p.number}</span>
              <span style={{ fontSize: "15px" }}>
                {p.lastName}
              </span>
              {/* Foul indicators — 5 squares */}
              <div style={{ display: "flex", gap: "2px", marginLeft: "auto", flexShrink: 0 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "1px",
                      background: foulCount > i ? "#ef4444" : "#3a3a3a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "5px",
                      fontWeight: "bold",
                      color: foulCount > i ? "#fff" : "#666"
                    }}
                  >
                    {foulCount === 5 && i === 4 ? "F" : ""}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Лавка */}
      <div style={{
        fontSize: "9px",
        color: isHome ? "#4a7fa5" : "#6b7280",
        padding: "1px 3px",
        marginBottom: "0px",
        fontWeight: "bold",
        marginTop: "1px"
      }}>
        ○ Лавка ({bench.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0px", flex: 1, overflowY: "auto" }}>
        {bench.map(p => {
          const foulCount = getPlayerFoulCount(events, p.id);
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2px",
                padding: "2px 4px",
                borderRadius: "1px",
                cursor: "pointer",
                background: selectedId === p.id ? (isHome ? "#163a5c" : "#fed7aa") : "transparent",
                width: "100%",
                border: "none",
                fontSize: "10px",
                textAlign: "left",
                color: isHome ? (selectedId === p.id ? "#5ab3f4" : "#c8d8e8") : (selectedId === p.id ? "#92400e" : "#6b7280"),
                minHeight: "24px",
                margin: 0,
                overflow: "hidden"
              }}
            >
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: isHome ? "#2a4060" : "#d1d5db", flexShrink: 0 }} />
              <span style={{ minWidth: "18px", fontWeight: 700, fontSize: "16px" }}>#{p.number}</span>
              <span style={{ fontSize: "15px" }}>
                {p.lastName}
              </span>
              {/* Foul indicators — 5 squares */}
              <div style={{ display: "flex", gap: "2px", marginLeft: "auto", flexShrink: 0 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "1px",
                      background: foulCount > i ? "#ef4444" : "#3a3a3a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "5px",
                      fontWeight: "bold",
                      color: foulCount > i ? "#fff" : "#666"
                    }}
                  >
                    {foulCount === 5 && i === 4 ? "F" : ""}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Team Foul Indicators — внизу колонки */}
      <div style={{ background: isHome ? "#0d1520" : "#f3f4f6", padding: "4px 3px", borderTop: "1px solid " + (isHome ? "#1a2e40" : "#e5e7eb"), display: "flex", gap: "4px", justifyContent: "center", fontSize: "9px", color: isHome ? "#3a6fa5" : "#6b7280" }}>
        {[1, 2, 3, 4, 5].map(i => {
          const teamFouls = getTeamFoulCount(events, teamId, 1);
          return (
            <div
              key={i}
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "2px",
                background: teamFouls >= i ? (teamFouls >= 5 ? (isHome ? "#dc2626" : "#dc2626") : (isHome ? "#f97316" : "#f97316")) : (isHome ? "#1a3a50" : "#e5e7eb"),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                color: teamFouls >= i ? "#fff" : (isHome ? "#666" : "#999"),
                fontSize: "9px"
              }}
            >
              {i}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LiveScoreTracker({ game, btnBlue, btnOrange, btnNavy, btnRed }: {
  game: GameWithAll;
  btnBlue?: string;
  btnOrange?: string;
  btnNavy?: string;
  btnRed?: string;
}) {
  const [timeLeft, setTimeLeft] = useState(QUARTER_DURATION);
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [eventType, setEventType] = useState<"normal" | "fastbreak" | "second_chance" | "off_turnover">("normal");
  const [showSubModal, setShowSubModal] = useState(false);
  const [subPlayerOut, setSubPlayerOut] = useState<number | null>(null);
  const [subPlayerIn, setSubPlayerIn] = useState<number | null>(null);
  const [showFoulShootingModal, setShowFoulShootingModal] = useState(false);
  const [homeFouls, setHomeFouls] = useState(0);
  const [homeTimeouts, setHomeTimeouts] = useState(2);
  const [onCourtHome, setOnCourtHome] = useState<Set<number>>(new Set());
  const [onCourtAway, setOnCourtAway] = useState<Set<number>>(new Set());
  const [showGridView, setShowGridView] = useState(false);
  const [boxScores, setBoxScores] = useState<(BoxScore & { player: Player })[]>(() => game.boxScores || []);
  const [pending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quarterRef = useRef(game.quarter);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Update boxScores when game data changes
  // FIX: Merge new data instead of replacing, to prevent race condition data loss
  useEffect(() => {
    if (!game.boxScores) return;
    setBoxScores(prev => {
      const merged = [...game.boxScores];
      prev.forEach(existing => {
        if (!merged.find(bs => bs.playerId === existing.playerId)) {
          merged.push(existing);
        }
      });
      return merged;
    });
  }, [game.boxScores]);

  useEffect(() => {
    if (onCourtHome.size === 0 || onCourtAway.size === 0) {
      // Load on-court state from database
      const homeOnCourtSet = new Set(
        game.onCourt
          .filter(oc => oc.teamId === game.homeTeamId && oc.onCourt)
          .map(oc => oc.playerId)
      );
      const awayOnCourtSet = new Set(
        game.onCourt
          .filter(oc => oc.teamId === game.awayTeamId && oc.onCourt)
          .map(oc => oc.playerId)
      );

      // Fallback to ALL players if no on-court records in DB (shouldn't happen after startGame fix)
      // FIX: Use ALL players, not just first 5
      if (homeOnCourtSet.size === 0) {
        game.homeTeam.players.forEach(p => homeOnCourtSet.add(p.id));
      }
      if (awayOnCourtSet.size === 0) {
        game.awayTeam.players.forEach(p => awayOnCourtSet.add(p.id));
      }

      setOnCourtHome(homeOnCourtSet);
      setOnCourtAway(awayOnCourtSet);
    }
  }, [game.id, game.homeTeamId, game.awayTeamId, game.onCourt]);

  useEffect(() => {
    if (quarterRef.current !== game.quarter) {
      quarterRef.current = game.quarter;
      setTimeLeft(QUARTER_DURATION);
      setTimerRunning(false);
    }
  }, [game.quarter]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerRunning(false);
  }, []);

  const startTimer = useCallback(() => {
    if (intervalRef.current) return;
    setTimerRunning(true);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [game.events]);

  const isLive = game.status === "LIVE";
  const isScheduled = game.status === "SCHEDULED";

  const runAction = async (action: () => Promise<any>) => {
    try {
      console.log('[runAction] Starting action...');
      const result = await action();
      console.log('[runAction] Action completed:', result);
      setSelectedPlayerId(null);
      setEventType("normal");
    } catch (error) {
      console.error('[runAction] Error:', error instanceof Error ? error.message : String(error));
    }
  };

  const homePlayers = [...game.homeTeam.players].sort((a, b) => a.number - b.number);
  const awayPlayers = [...game.awayTeam.players].sort((a, b) => a.number - b.number);

  const selectedPlayer = selectedPlayerId ? [...homePlayers, ...awayPlayers].find((p) => p.id === selectedPlayerId) : null;
  const selectedTeamId = selectedPlayer ? selectedPlayer.teamId : game.homeTeamId;
  const isHomeTeam = selectedTeamId === game.homeTeamId;

  const disabled = !selectedPlayerId || pending;

  const recentEvents = game.events.slice(0, 10);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      flex: 1,
      background: "#f9fafb",
      overflow: "hidden",
      margin: 0,
      padding: 0
    }}>
      {/* HEADER */}
      <header style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "6px 12px",
        background: "#1a2737",
        gap: 8,
        borderBottom: "1px solid #2a3e52",
        flexShrink: 0
      }}>
        {/* Home Team */}
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{game.homeTeam.name}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#6b8caa" }}>
              Таймаут: <b style={{ color: "#e8a030" }}>{game.homeTimeouts}</b>/5
            </span>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: i < game.homeTimeouts ? "#f4cc5a" : "#3a4a5a",
                    border: "1px solid #2a3a4a"
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Score Center */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: "700", color: "#fff", lineHeight: 1 }}>
            {game.homeScore} : {game.awayScore}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
            <button
              onClick={() => setTimeLeft(prev => Math.max(0, prev - 60))}
              disabled={!isLive}
              style={{
                padding: "2px 6px",
                fontSize: 12,
                fontWeight: "600",
                border: "none",
                borderRadius: 2,
                cursor: isLive ? "pointer" : "not-allowed",
                background: isLive ? "#1a3a50" : "#1a2e40",
                color: isLive ? "#5ab3f4" : "#4a7fa5",
                opacity: isLive ? 1 : 0.5
              }}
            >−1хв</button>
            <div style={{ fontSize: 28, fontWeight: "700", color: "#fff", minWidth: "80px" }}>
              {formatTime(timeLeft)}
            </div>
            <button
              onClick={() => setTimeLeft(prev => prev + 60)}
              disabled={!isLive}
              style={{
                padding: "2px 6px",
                fontSize: 12,
                fontWeight: "600",
                border: "none",
                borderRadius: 2,
                cursor: isLive ? "pointer" : "not-allowed",
                background: isLive ? "#1a3a50" : "#1a2e40",
                color: isLive ? "#5ab3f4" : "#4a7fa5",
                opacity: isLive ? 1 : 0.5
              }}
            >+1хв</button>
          </div>
          <div style={{ fontSize: 14, fontWeight: "700", color: "#5ab3f4", marginTop: 2 }}>
            {game.quarter} чверть
          </div>
        </div>

        {/* Away Team */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{game.awayTeam.name}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 2, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#6b8caa" }}>Таймаут: {game.awayTimeouts}/5</span>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: i < game.awayTimeouts ? "#f4cc5a" : "#3a4a5a",
                    border: "1px solid #2a3a4a"
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* CONTROLS ROW */}
      <div style={{
        display: "flex",
        gap: 8,
        padding: "4px 12px",
        background: "#0d1520",
        borderBottom: "1px solid #1a2e40",
        flexShrink: 0
      }}>
        {isScheduled ? (
          <button
            onClick={() => startTransition(() => startGame(game.id))}
            style={{
              border: "none",
              borderRadius: 5,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: "700",
              cursor: "pointer",
              background: "#10b981",
              color: "#fff"
            }}
          >
            ▶ Почати
          </button>
        ) : isLive ? (
          <>
            <button
              onClick={timerRunning ? stopTimer : startTimer}
              style={{
                border: "none",
                borderRadius: 5,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: "700",
                cursor: "pointer",
                background: "#3a6fa5",
                color: "#fff"
              }}
            >
              {timerRunning ? "⏸ Пауза" : "▶ Старт"}
            </button>
            {game.quarter < 4 && (
              <button
                onClick={() => {
                  stopTimer();
                  setTimeLeft(QUARTER_DURATION);
                  startTransition(() => nextQuarter(game.id));
                }}
                style={{
                  border: "none",
                  borderRadius: 5,
                  padding: "4px 12px",
                  fontSize: 11,
                  fontWeight: "700",
                  cursor: "pointer",
                  background: "#3a6fa5",
                  color: "#fff"
                }}
              >
                → Наступна
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("Завершити матч?")) {
                  stopTimer();
                  startTransition(() => endGame(game.id));
                }
              }}
              style={{
                border: "none",
                borderRadius: 5,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: "700",
                cursor: "pointer",
                background: "#dc2626",
                color: "#fff"
              }}
            >
              Завершити
            </button>
            <button
              onClick={() => setShowGridView(!showGridView)}
              style={{
                border: "none",
                borderRadius: 5,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: "700",
                cursor: "pointer",
                background: showGridView ? "#3b82f6" : "#6b7280",
                color: "#fff",
                marginLeft: "auto"
              }}
            >
              {showGridView ? "📊 Таблиця" : "👥 Список"}
            </button>
          </>
        ) : null}
      </div>

      {/* MAIN LAYOUT — 3 колонки или GRID VIEW */}
      {showGridView ? (
        <StatEntryGrid game={game} boxScores={boxScores} />
      ) : (
      <div style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr 200px",
        flex: 1,
        overflow: "hidden",
        gap: 6,
        padding: 6,
        minHeight: 0,
        height: "100%"
      }}>
        {/* LEFT — Home Players */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 0 }}>
          <RosterPanel
            players={homePlayers}
            teamId={game.homeTeamId}
            team={game.homeTeam}
            onCourtIds={onCourtHome}
            selectedId={selectedPlayerId}
            onSelect={setSelectedPlayerId}
            isHome={true}
            events={game.events}
            game={game}
          />
        </div>

        {/* CENTER — 5 рядів кнопок з правильними пропорціями */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          gap: 2, padding: 2, minHeight: 0
        }}>
          {/* РЯД 1 — вузький 36px */}
          <div style={{ flex: "0 0 36px", display: "flex", gap: 2 }}>
            <button
              onClick={() => startTransition(() => nextQuarter(game.id))}
              disabled={!isLive}
              style={{ flex:1, height:"100%", background: !isLive ? "#1a2e40" : "#1a2e40", color: !isLive ? "#4a7fa5" : "#8ab8d0", fontSize:26, fontWeight:600, border:"none", borderRadius:3, cursor: !isLive ? "not-allowed" : "pointer", opacity: !isLive ? 0.5 : 1 }}
            >Наст чверть</button>
            <button
              onClick={() => {
                if (!selectedPlayerId) {
                  alert("Спочатку виберіть гравця");
                  return;
                }
                const player = [...game.homeTeam.players, ...game.awayTeam.players].find(p => p.id === selectedPlayerId);
                if (player) {
                  startTransition(async () => {
                    await addTimeout(game.id, player.teamId);
                  });
                }
              }}
              disabled={!selectedPlayerId || !isLive || (game.homeTeamId === game.homeTeam.players.find(p => p.id === selectedPlayerId)?.teamId ? game.homeTimeouts >= 5 : game.awayTimeouts >= 5)}
              style={{ flex:1, height:"100%", background: (!selectedPlayerId || !isLive) ? "#1a2e40" : "#3a2500", color: (!selectedPlayerId || !isLive) ? "#4a7fa5" : "#f4cc5a", fontSize:26, fontWeight:600, border:"none", borderRadius:3, cursor: (!selectedPlayerId || !isLive) ? "not-allowed" : "pointer", opacity: (!selectedPlayerId || !isLive) ? 0.5 : 1 }}
            >Тайм-аут</button>
            <button
              onClick={() => startTransition(() => undoLastEvent(game.id))}
              disabled={!isLive || game.events.length === 0}
              style={{ flex:1, height:"100%", background: (!isLive || game.events.length === 0) ? "#1a2e40" : "#3a2500", color: (!isLive || game.events.length === 0) ? "#4a7fa5" : "#f4cc5a", fontSize:26, fontWeight:600, border:"none", borderRadius:3, cursor: (!isLive || game.events.length === 0) ? "not-allowed" : "pointer", opacity: (!isLive || game.events.length === 0) ? 0.5 : 1 }}
            >↩ Відкат</button>
            <button
              onClick={() => startTransition(() => undoLastEvent(game.id))}
              disabled={!isLive || game.events.length === 0}
              style={{ flex:1, height:"100%", background: (!isLive || game.events.length === 0) ? "#1a2e40" : "#1a2e40", color: (!isLive || game.events.length === 0) ? "#4a7fa5" : "#8ab8d0", fontSize:26, fontWeight:600, border:"none", borderRadius:3, cursor: (!isLive || game.events.length === 0) ? "not-allowed" : "pointer", opacity: (!isLive || game.events.length === 0) ? 0.5 : 1 }}
            >Скасувати</button>
            <button
              onClick={() => {
                if (confirm("Завершити матч?")) {
                  stopTimer();
                  startTransition(() => endGame(game.id));
                }
              }}
              style={{ flex:1, height:"100%", background:"#0f2a10", color:"#4ef472", fontSize:26, fontWeight:600, border:"none", borderRadius:3, cursor:"pointer" }}
            >Завершити</button>
          </div>

          {/* РЯД 2 — великий flex:2.2 */}
          <div style={{ flex: 2.2, display: "flex", gap: 2 }}>
            <button
              onClick={() => selectedPlayerId && runAction(() => addScoreWithType(game.id, selectedTeamId, selectedPlayerId, 1, eventType))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#0f3a1a", color: disabled ? "#4a7fa5" : "#4ef472", fontSize:64, fontWeight:800, border: disabled ? "none" : "1px solid #1a5028", borderRadius:3, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            ><span>+1</span><span style={{fontSize:26}}>Очко</span></button>
            <button
              onClick={() => selectedPlayerId && runAction(() => addScoreWithType(game.id, selectedTeamId, selectedPlayerId, 2, eventType))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#0f3a1a", color: disabled ? "#4a7fa5" : "#4ef472", fontSize:64, fontWeight:800, border: disabled ? "none" : "1px solid #1a5028", borderRadius:3, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            ><span>+2</span><span style={{fontSize:26}}>Двоочковий</span></button>
            <button
              onClick={() => selectedPlayerId && runAction(() => addScoreWithType(game.id, selectedTeamId, selectedPlayerId, 3, eventType))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#0f3a1a", color: disabled ? "#4a7fa5" : "#4ef472", fontSize:64, fontWeight:800, border: disabled ? "none" : "1px solid #1a5028", borderRadius:3, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            ><span>+3</span><span style={{fontSize:26}}>Триочковий</span></button>
            <div style={{ width:1, background:"#1a2e40" }} />
            <button
              onClick={() => selectedPlayerId && runAction(() => addReboundDef(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#1a0f3a", color: disabled ? "#4a7fa5" : "#b07af4", fontSize:36, fontWeight:700, border: disabled ? "none" : "1px solid #2a1a5a", borderRadius:3, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            ><span>Підбір</span><span style={{fontSize:20}}>захист</span></button>
            <button
              onClick={() => selectedPlayerId && runAction(() => addReboundOff(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#1a0f3a", color: disabled ? "#4a7fa5" : "#b07af4", fontSize:36, fontWeight:700, border: disabled ? "none" : "1px solid #2a1a5a", borderRadius:3, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            ><span>Підбір</span><span style={{fontSize:20}}>напад</span></button>
          </div>

          {/* РЯД 3 — середній flex:1.3 */}
          <div style={{ flex: 1.3, display: "flex", gap: 2 }}>
            <button
              onClick={() => selectedPlayerId && runAction(() => addMissFg2(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#2d0a0a", color: disabled ? "#4a7fa5" : "#f47a7a", fontSize:30, fontWeight:700, border:"none", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >1 Невлучно</button>
            <button
              onClick={() => selectedPlayerId && runAction(() => addMissFg2(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#2d0a0a", color: disabled ? "#4a7fa5" : "#f47a7a", fontSize:30, fontWeight:700, border:"none", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >2 Невлучно</button>
            <button
              onClick={() => selectedPlayerId && runAction(() => addMissFg3(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#2d0a0a", color: disabled ? "#4a7fa5" : "#f47a7a", fontSize:30, fontWeight:700, border:"none", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >3 Невлучно</button>
            <div style={{ width:1, background:"#1a2e40" }} />
            <button
              onClick={() => selectedPlayerId && runAction(() => addTurnover(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#2d1a00", color: disabled ? "#4a7fa5" : "#f4cc5a", fontSize:30, fontWeight:700, border:"none", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >Втрата</button>
            {/* 4 Foul type buttons */}
            <button
              onClick={() => selectedPlayerId && runAction(() => addFoul(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:0.7, height:"100%", background: disabled ? "#1a2e40" : "#2d0808", color: disabled ? "#4a7fa5" : "#f47a7a", fontSize:28, fontWeight:700, border:"none", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >Фол П</button>
            <button
              onClick={() => selectedPlayerId && runAction(() => addFoulUnsportsmanlike(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:0.7, height:"100%", background: disabled ? "#1a2e40" : "#2d0808", color: disabled ? "#4a7fa5" : "#f47a7a", fontSize:28, fontWeight:700, border:"none", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >Неспорт.</button>
            <button
              onClick={() => selectedPlayerId && runAction(() => addFoulTechnical(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:0.7, height:"100%", background: disabled ? "#1a2e40" : "#2d0808", color: disabled ? "#4a7fa5" : "#f47a7a", fontSize:28, fontWeight:700, border:"none", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >Техніч.</button>
            <button
              onClick={() => selectedPlayerId && runAction(() => addFoulDisqualifying(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:0.7, height:"100%", background: disabled ? "#1a2e40" : "#8b0000", color: disabled ? "#4a7fa5" : "#ffaaaa", fontSize:28, fontWeight:700, border:"none", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >Дискв.</button>
          </div>

          {/* РЯД 4 — великий flex:2 */}
          <div style={{ flex: 2, display: "flex", gap: 2 }}>
            <button
              onClick={() => selectedPlayerId && runAction(() => addAssist(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#0a2a10", color: disabled ? "#4a7fa5" : "#4ef472", fontSize:36, fontWeight:700, border: disabled ? "none" : "1px solid #1a4020", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >Передача</button>
            <button
              onClick={() => selectedPlayerId && runAction(() => addSteal(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#0a1a3a", color: disabled ? "#4a7fa5" : "#5ae8f4", fontSize:36, fontWeight:700, border: disabled ? "none" : "1px solid #1a2a5a", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >Перехват</button>
            <button
              onClick={() => selectedPlayerId && runAction(() => addBlock(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:1, height:"100%", background: disabled ? "#1a2e40" : "#2a1800", color: disabled ? "#4a7fa5" : "#f4a050", fontSize:36, fontWeight:700, border: disabled ? "none" : "1px solid #5a3800", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >Блокшот</button>
            <div style={{ width:1, background:"#1a2e40" }} />
            <button
              onClick={() => {
                if (selectedPlayerId) {
                  setShowFoulShootingModal(true);
                }
              }}
              disabled={disabled}
              style={{ flex:0.7, height:"100%", background: disabled ? "#1a2e40" : "#2d0808", color: disabled ? "#4a7fa5" : "#f47a7a", fontSize:28, fontWeight:700, border:"none", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >Фол пробивний</button>
            <button
              onClick={() => selectedPlayerId && runAction(() => addCoachFoul(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              style={{ flex:0.7, height:"100%", background: disabled ? "#1a2e40" : "#2d0808", color: disabled ? "#4a7fa5" : "#f47a7a", fontSize:28, fontWeight:700, border:"none", borderRadius:3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >Тренеру</button>
          </div>

          {/* РЯД 5 — вузький 36px */}
          <div style={{ flex: "0 0 36px", display: "flex", gap: 2 }}>
            <button
              onClick={() => setEventType("normal")}
              style={{ flex:1, height:"100%", background: eventType === "normal" ? "#163a5c" : "#1a2e40", color: eventType === "normal" ? "#5ab3f4" : "#8ab8d0", fontSize:26, fontWeight:600, border: eventType === "normal" ? "1px solid #2a5a8a" : "none", borderRadius:3, cursor:"pointer" }}
            >Звичайний ✓</button>
            <button
              onClick={() => setEventType("second_chance")}
              style={{ flex:1, height:"100%", background: eventType === "second_chance" ? "#163a5c" : "#1a2e40", color: eventType === "second_chance" ? "#5ab3f4" : "#8ab8d0", fontSize:26, fontWeight:600, border: eventType === "second_chance" ? "1px solid #2a5a8a" : "none", borderRadius:3, cursor:"pointer" }}
            >2й шанс</button>
            <button
              onClick={() => setEventType("fastbreak")}
              style={{ flex:1, height:"100%", background: eventType === "fastbreak" ? "#163a5c" : "#1a2e40", color: eventType === "fastbreak" ? "#5ab3f4" : "#8ab8d0", fontSize:26, fontWeight:600, border: eventType === "fastbreak" ? "1px solid #2a5a8a" : "none", borderRadius:3, cursor:"pointer" }}
            >Швидкий відрив</button>
            <button
              onClick={() => setShowSubModal(true)}
              disabled={!isLive}
              style={{ flex:1, height:"100%", background: !isLive ? "#1a2e40" : "#1a2e40", color: !isLive ? "#4a7fa5" : "#8ab8d0", fontSize:26, fontWeight:600, border:"none", borderRadius:3, cursor: !isLive ? "not-allowed" : "pointer", opacity: !isLive ? 0.5 : 1 }}
            >Заміна гравця</button>
          </div>
        </div>

        {/* RIGHT — Away Players */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 0 }}>
          <RosterPanel
            players={awayPlayers}
            teamId={game.awayTeamId}
            team={game.awayTeam}
            onCourtIds={onCourtAway}
            selectedId={selectedPlayerId}
            onSelect={setSelectedPlayerId}
            isHome={false}
            events={game.events}
            game={game}
          />
        </div>
      </div>
      )}

      {/* ACTION LOG — vertical list */}
      <div
        ref={logContainerRef}
        style={{
          background: "#080f18",
          borderTop: "1px solid #1a2e40",
          padding: "4px 8px",
          flex: "0 0 120px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0px"
        }}
      >
        {game.events.map((e, i) => {
          let eventColor = "#5a7a9a";
          let eventLabel = e.type;
          if (e.type === "POINTS") {
            eventColor = "#4ef472";
            eventLabel = `+${e.points}`;
            if (e.eventSubtype === "fastbreak") eventLabel += " ⚡";
            else if (e.eventSubtype === "second_chance") eventLabel += " ↩";
            else if (e.eventSubtype === "off_turnover") eventLabel += " 🔥";
          } else if (e.type.includes("FOUL")) {
            eventColor = "#f4cc5a";
            eventLabel = "фол";
          } else if (e.type === "ASSIST") {
            eventColor = "#5ae8f4";
            eventLabel = "пер";
          } else if (e.type === "STEAL") {
            eventColor = "#5ae8f4";
            eventLabel = "при";
          } else if (e.type === "REBOUND" || e.type === "REBOUND_OFF" || e.type === "REBOUND_DEF") {
            eventColor = "#5ae8f4";
            eventLabel = "подб";
          } else if (e.type === "BLOCK") {
            eventColor = "#f4cc5a";
            eventLabel = "блк";
          } else if (e.type === "TURNOVER") {
            eventColor = "#f47a7a";
            eventLabel = "втр";
          }
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "8px",
                padding: "2px 0",
                borderBottom: "0.5px solid #0d1a28",
                fontSize: "11px",
                whiteSpace: "nowrap"
              }}
            >
              <span style={{ color: "#4a7fa5" }}>Q{e.quarter} {formatTime(timeLeft)}</span>
              <span style={{ color: "#c8d8e8" }}>#{e.player?.number} {e.player?.lastName} {e.player?.firstName?.[0] ?? ""}.</span>
              <span style={{ color: eventColor, fontWeight: "700" }}>{eventLabel}</span>
            </div>
          );
        })}
      </div>

      {/* SHOOTING FOUL MODAL */}
      {showFoulShootingModal && selectedPlayerId && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50
        }}>
          <div style={{
            background: "#1a2737",
            borderRadius: 10,
            padding: 16,
            width: 280,
            border: "1px solid #2a5a8c"
          }}>
            <div style={{ fontSize: 13, fontWeight: "700", color: "#fff", marginBottom: 12 }}>
              Фол при киданні - скільки штрафних?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  runAction(() => addFreeThrow(game.id, selectedTeamId, selectedPlayerId, 1));
                  setShowFoulShootingModal(false);
                }}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 5,
                  padding: "8px",
                  fontSize: 12,
                  cursor: "pointer",
                  background: "#1e5c35",
                  color: "#4ef472",
                  fontWeight: "600"
                }}
              >
                1 штрафний
              </button>
              <button
                onClick={() => {
                  runAction(() => addFreeThrow(game.id, selectedTeamId, selectedPlayerId, 2));
                  setShowFoulShootingModal(false);
                }}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 5,
                  padding: "8px",
                  fontSize: 12,
                  cursor: "pointer",
                  background: "#1e5c35",
                  color: "#4ef472",
                  fontWeight: "600"
                }}
              >
                2 штрафних
              </button>
              <button
                onClick={() => setShowFoulShootingModal(false)}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 5,
                  padding: "8px",
                  fontSize: 12,
                  cursor: "pointer",
                  background: "#3d1010",
                  color: "#f47a7a",
                  fontWeight: "600"
                }}
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBSTITUTION MODAL */}
      {showSubModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50
        }}>
          <div style={{
            background: "#1a2737",
            borderRadius: 10,
            padding: 16,
            width: 280,
            border: "1px solid #2a5a8c"
          }}>
            <div style={{ fontSize: 13, fontWeight: "700", color: "#fff", marginBottom: 10 }}>
              ↕ Заміна гравця
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Out */}
              <div>
                <label style={{ fontSize: 13, color: "#4a7fa5", marginBottom: 4, display: "block" }}>
                  Хто ВИХОДИТЬ (на паркеті):
                </label>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  maxHeight: 80,
                  overflow: "auto"
                }}>
                  {(isHomeTeam ? homePlayers : awayPlayers)
                    .filter(p => (isHomeTeam ? onCourtHome : onCourtAway).has(p.id))
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSubPlayerOut(p.id)}
                        style={{
                          border: "1px solid",
                          borderRadius: 4,
                          padding: "3px 7px",
                          fontSize: 13,
                          cursor: "pointer",
                          background: subPlayerOut === p.id ? "#1e4a22" : "#12202e",
                          borderColor: subPlayerOut === p.id ? "#2ecc71" : "#2a4060",
                          color: subPlayerOut === p.id ? "#4ef472" : "#7aaccc",
                          fontWeight: "600"
                        }}
                      >
                        #{p.number} {p.lastName}
                      </button>
                    ))}
                </div>
              </div>

              {/* In */}
              <div>
                <label style={{ fontSize: 13, color: "#4a7fa5", marginBottom: 4, display: "block" }}>
                  Хто ЗАХОДИТЬ (лавка):
                </label>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  maxHeight: 80,
                  overflow: "auto"
                }}>
                  {(isHomeTeam ? homePlayers : awayPlayers)
                    .filter(p => !(isHomeTeam ? onCourtHome : onCourtAway).has(p.id))
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSubPlayerIn(p.id)}
                        style={{
                          border: "1px solid",
                          borderRadius: 4,
                          padding: "3px 7px",
                          fontSize: 13,
                          cursor: "pointer",
                          background: subPlayerIn === p.id ? "#1a3a5c" : "#12202e",
                          borderColor: subPlayerIn === p.id ? "#5ab3f4" : "#2a4060",
                          color: subPlayerIn === p.id ? "#5ab3f4" : "#7aaccc",
                          fontWeight: "600"
                        }}
                      >
                        #{p.number} {p.lastName}
                      </button>
                    ))}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button
                  disabled={!subPlayerOut || !subPlayerIn}
                  onClick={() => {
                    if (subPlayerOut && subPlayerIn) {
                      runAction(() =>
                        addSubstitution(
                          game.id,
                          selectedTeamId,
                          subPlayerOut,
                          subPlayerIn,
                          game.quarter,
                          formatTime(timeLeft)
                        )
                      ).then(() => {
                        if (isHomeTeam) {
                          const newSet = new Set(onCourtHome);
                          newSet.delete(subPlayerOut);
                          newSet.add(subPlayerIn);
                          setOnCourtHome(newSet);
                        } else {
                          const newSet = new Set(onCourtAway);
                          newSet.delete(subPlayerOut);
                          newSet.add(subPlayerIn);
                          setOnCourtAway(newSet);
                        }
                        setShowSubModal(false);
                        setSubPlayerOut(null);
                        setSubPlayerIn(null);
                      });
                    }
                  }}
                  style={{
                    flex: 1,
                    border: "none",
                    borderRadius: 5,
                    padding: "6px",
                    fontSize: 11,
                    cursor: (!subPlayerOut || !subPlayerIn) ? "not-allowed" : "pointer",
                    background: (!subPlayerOut || !subPlayerIn) ? "#1a2e40" : "#1a4a22",
                    color: (!subPlayerOut || !subPlayerIn) ? "#4a7fa5" : "#4ef472",
                    fontWeight: "700",
                    opacity: (!subPlayerOut || !subPlayerIn) ? 0.5 : 1
                  }}
                >
                  ✓ Замінити
                </button>
                <button
                  onClick={() => {
                    setShowSubModal(false);
                    setSubPlayerOut(null);
                    setSubPlayerIn(null);
                  }}
                  style={{
                    border: "none",
                    borderRadius: 5,
                    padding: "6px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    background: "#3d1010",
                    color: "#f47a7a",
                    fontWeight: "600"
                  }}
                >
                  Скасувати
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
