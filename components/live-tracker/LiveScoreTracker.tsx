"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Game, Team, Player, GameEvent, BoxScore } from "@prisma/client";
import StatEntryGrid from "./StatEntryGrid";
import FoulPlayerModal from "@/components/modals/FoulPlayerModal";
import FreeThrowModal from "@/components/modals/FreeThrowModal";
import { recordGameAction, recordSubstitution, undoGameAction, updateGameTime } from "@/app/actions/game-events";

type GameWithAll = Game & {
  homeTeam: Team & { players: Player[] };
  awayTeam: Team & { players: Player[] };
  events: (GameEvent & {
    player: Pick<Player, "firstName" | "lastName" | "number"> | null;
  })[];
  boxScores: (BoxScore & { player: Player })[];
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getPlayerFoulCount(events: GameEvent[], playerId: number) {
  return events.filter(e =>
    e.playerId === playerId &&
    (e.type === "FOUL" || e.type === "FOUL_UNSPORTSMANLIKE" || e.type === "FOUL_TECHNICAL" || e.type === "FOUL_DISQUALIFYING")
  ).length;
}

function getTeamFoulCount(events: GameEvent[], teamId: number, quarter: number) {
  return events.filter(e =>
    e.teamId === teamId &&
    e.quarter === quarter &&
    (e.type === "FOUL" || e.type === "FOUL_UNSPORTSMANLIKE" || e.type === "FOUL_TECHNICAL" || e.type === "FOUL_DISQUALIFYING")
  ).length;
}

function reorder(list: number[], from: number, to: number): number[] {
  const result = [...list];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
}

const CourtIndicator = React.memo(({ isOnCourt }: { isOnCourt: boolean }) => (
  <span style={{
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: isOnCourt ? "#39d983" : "#3a4a5a",
    flexShrink: 0,
  }} />
));
CourtIndicator.displayName = "CourtIndicator";

const DraggableRosterPanel = React.memo(function DraggableRosterPanel({
  players,
  order,
  setOrder,
  isHome,
  team,
}: {
  players: Player[];
  order: number[];
  setOrder: (fn: (prev: number[]) => number[]) => void;
  isHome: boolean;
  team: Team;
}) {
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (toIndex: number) => {
    if (dragIndexRef.current === null) return;
    setOrder(prev => reorder(prev, dragIndexRef.current!, toIndex));
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

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

      {/* Зелений заголовок: стартова п'ятірка */}
      <div style={{
        fontSize: "9px",
        color: isHome ? "#2ecc71" : "#059669",
        padding: "4px 3px",
        marginBottom: "0px",
        fontWeight: "bold",
        marginTop: "0px",
        textTransform: "uppercase",
        letterSpacing: ".3px",
        background: isHome ? "#0a1f30" : "#f0fdf4",
        borderBottom: "2px solid " + (isHome ? "#2ecc71" : "#059669"),
      }}>
        🟢 СТАРТОВА П'ЯТІРКА (5)
      </div>

      {/* Стартери (перші 5) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0px", marginBottom: "0px" }}>
        {players.slice(0, 5).map((p, index) => (
          <div
            key={p.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragLeave={handleDragLeave}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              padding: "2px 4px",
              borderRadius: "1px",
              background: isHome ? "#0d2030" : "#f0f0f0",
              width: "100%",
              border: dragOverIndex === index ? `1px dashed ${isHome ? "#2ecc71" : "#059669"}` : "1px solid transparent",
              opacity: dragIndexRef.current === index ? 0.5 : 1,
              cursor: "grab",
              fontSize: "10px",
              color: isHome ? "#2ecc71" : "#374151",
              minHeight: "24px",
              margin: 0,
              overflow: "hidden",
              fontWeight: "700",
              backgroundColor: dragOverIndex === index ? (isHome ? "rgba(46, 204, 113, 0.1)" : "rgba(5, 150, 105, 0.1)") : (isHome ? "#0d2030" : "#f0f0f0"),
              transition: "all 150ms ease-in-out",
            }}
          >
            <span style={{ minWidth: "18px", fontWeight: 700, fontSize: "16px" }}>#{p.number}</span>
            <span style={{ fontSize: "15px", fontWeight: "700" }}>{p.lastName}</span>
          </div>
        ))}
      </div>

      {/* Сірий розділювач: лавка */}
      {players.length > 5 && (
        <div style={{
          fontSize: "9px",
          color: isHome ? "#6b8caa" : "#9ca3af",
          padding: "4px 3px",
          marginBottom: "0px",
          fontWeight: "bold",
          marginTop: "0px",
          textTransform: "uppercase",
          letterSpacing: ".3px",
          background: isHome ? "#0d1520" : "#f9fafb",
          borderTop: "1px solid " + (isHome ? "#1a2e40" : "#e5e7eb"),
          borderBottom: "1px solid " + (isHome ? "#1a3a50" : "#d1d5db"),
        }}>
          🪑 ЛАВКА ({players.length - 5})
        </div>
      )}

      {/* Запасні (після 5-го) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0px", flex: 1, overflowY: "auto", background: isHome ? "#0d1520" : "#f9fafb" }}>
        {players.slice(5).map((p, index) => (
          <div
            key={p.id}
            draggable
            onDragStart={() => handleDragStart(index + 5)}
            onDragOver={(e) => handleDragOver(e, index + 5)}
            onDrop={() => handleDrop(index + 5)}
            onDragLeave={handleDragLeave}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              padding: "2px 4px",
              borderRadius: "1px",
              background: "transparent",
              width: "100%",
              border: dragOverIndex === index + 5 ? `1px dashed ${isHome ? "#6b8caa" : "#9ca3af"}` : "1px solid transparent",
              opacity: dragIndexRef.current === index + 5 ? 0.5 : 1,
              cursor: "grab",
              fontSize: "10px",
              color: isHome ? "#c8d8e8" : "#6b7280",
              minHeight: "24px",
              margin: 0,
              overflow: "hidden",
              fontWeight: "500",
              backgroundColor: dragOverIndex === index + 5 ? (isHome ? "rgba(107, 140, 170, 0.1)" : "rgba(156, 163, 175, 0.1)") : "transparent",
              transition: "all 150ms ease-in-out",
            }}
          >
            <span style={{ minWidth: "18px", fontWeight: 700, fontSize: "16px" }}>#{p.number}</span>
            <span style={{ fontSize: "15px", fontWeight: "500" }}>{p.lastName}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
DraggableRosterPanel.displayName = "DraggableRosterPanel";

const RosterPanel = React.memo(function RosterPanel({ players, teamId, team, selectedId, onSelect, isHome, events, game, getDisplayTime }: {
  players: Player[];
  teamId: number;
  team: Team;
  selectedId: number | null;
  onSelect: (id: number) => void;
  isHome: boolean;
  events: GameEvent[];
  game: GameWithAll;
  getDisplayTime: (playerId: number) => string;
}) {
  // Single source of truth: read only from BoxScore
  const onCourtSet = new Set(
    game.boxScores
      .filter(bs => bs.isOnCourt && bs.teamId === teamId)
      .map(bs => bs.playerId)
  );

  const onCourt = players.filter(p => onCourtSet.has(p.id)).sort((a, b) => {
    const aPosition = game.boxScores.find(bs => bs.playerId === a.id)?.lineupPosition ?? 0;
    const bPosition = game.boxScores.find(bs => bs.playerId === b.id)?.lineupPosition ?? 0;
    // Sort by lineupPosition: 1-5 (on court) stay in order, 0 (shouldn't happen but defensive sort)
    return aPosition - bPosition;
  });

  const bench = players.filter(p => !onCourtSet.has(p.id));

  const renderPlayerButton = (p: Player, isOnCourt: boolean) => {
    const foulCount = getPlayerFoulCount(events, p.id);
    const bs = game.boxScores.find(bs => bs.playerId === p.id);
    const isStarter = bs?.isStarter ?? false;

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
          background: selectedId === p.id ? (isHome ? "#163a5c" : "#fed7aa") : (isOnCourt ? (isHome ? "#0d2030" : "#f0f0f0") : "transparent"),
          width: "100%",
          border: "none",
          fontSize: "10px",
          textAlign: "left",
          color: isHome ? (selectedId === p.id ? "#5ab3f4" : isOnCourt ? "#2ecc71" : "#c8d8e8") : (selectedId === p.id ? "#92400e" : isOnCourt ? "#374151" : "#6b7280"),
          minHeight: "24px",
          margin: 0,
          overflow: "hidden",
          fontWeight: isOnCourt ? "700" : "500"
        }}
      >
        <CourtIndicator isOnCourt={isOnCourt} />
        <span style={{ minWidth: "18px", fontWeight: 700, fontSize: "16px" }}>#{p.number}</span>
        <span style={{ fontSize: "15px", fontWeight: isOnCourt ? "700" : "500" }}>{p.lastName}</span>
        <span style={{ fontSize: "10px", color: isHome ? (isOnCourt ? "#2ecc71" : "#5ab3f4") : "#6b7280", marginLeft: "4px" }}>{getDisplayTime(p.id)}</span>
        <div style={{ display: "flex", gap: "2px", marginLeft: "auto", flexShrink: 0 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: "6px", height: "6px", borderRadius: "1px", background: foulCount > i ? "#ef4444" : "#3a3a3a" }} />
          ))}
        </div>
      </button>
    );
  };

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

      {onCourt.length > 0 && (
        <>
          <div style={{
            fontSize: "9px",
            color: isHome ? "#2ecc71" : "#059669",
            padding: "4px 3px",
            marginBottom: "0px",
            fontWeight: "bold",
            marginTop: "0px",
            textTransform: "uppercase",
            letterSpacing: ".3px",
            background: isHome ? "#0a1f30" : "#f0fdf4",
            borderBottom: "2px solid " + (isHome ? "#2ecc71" : "#059669"),
          }}>
            🟢 МАЙДАНЧИК ({onCourt.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0px", marginBottom: "0px" }}>
            {onCourt.map(p => renderPlayerButton(p, true))}
          </div>
        </>
      )}

      <div style={{
        fontSize: "9px",
        color: isHome ? "#6b8caa" : "#9ca3af",
        padding: "4px 3px",
        marginBottom: "0px",
        fontWeight: "bold",
        marginTop: "0px",
        textTransform: "uppercase",
        letterSpacing: ".3px",
        background: isHome ? "#0d1520" : "#f9fafb",
        borderTop: "1px solid " + (isHome ? "#1a2e40" : "#e5e7eb"),
        borderBottom: "1px solid " + (isHome ? "#1a3a50" : "#d1d5db"),
      }}>
        🪑 ЛАВКА ({bench.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0px", flex: 1, overflowY: "auto", background: isHome ? "#0d1520" : "#f9fafb" }}>
        {bench.map(p => renderPlayerButton(p, false))}
      </div>

      <div style={{ background: isHome ? "#0d1520" : "#f3f4f6", padding: "4px 3px", borderTop: "1px solid " + (isHome ? "#1a2e40" : "#e5e7eb"), display: "flex", gap: "4px", justifyContent: "center", fontSize: "9px", color: isHome ? "#3a6fa5" : "#6b7280" }}>
        {[1, 2, 3, 4, 5].map(i => {
          const teamFouls = getTeamFoulCount(events, teamId, 1);
          return (
            <div key={i} style={{ width: "18px", height: "18px", borderRadius: "2px", background: teamFouls >= i ? (teamFouls >= 5 ? "#dc2626" : "#f97316") : (isHome ? "#1a3a50" : "#e5e7eb"), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: teamFouls >= i ? "#fff" : (isHome ? "#666" : "#999"), fontSize: "9px" }}>
              {i}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default function LiveScoreTracker({ game: initialGame }: { game: GameWithAll }) {
  const router = useRouter();
  // Keep local game state synchronized with prop updates
  const [game, setGame] = useState<GameWithAll>(initialGame);

  // Sync local game state whenever initialGame prop changes (e.g., after router.refresh())
  useEffect(() => {
    setGame(initialGame);
  }, [initialGame.id, initialGame.status, initialGame.quarter, initialGame.currentTimeLeft]);

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subPlayerOut, setSubPlayerOut] = useState<number | null>(null);
  const [subPlayerIn, setSubPlayerIn] = useState<number | null>(null);
  const [showFoulModal, setShowFoulModal] = useState(false);
  const [currentFoulType, setCurrentFoulType] = useState<"PERSONAL" | "TECHNICAL" | "UNSPORTSMANLIKE" | "DISQUALIFYING" | null>(null);
  const [currentFoulPlayerId, setCurrentFoulPlayerId] = useState<number | null>(null);
  const [showFreeThrowModal, setShowFreeThrowModal] = useState(false);
  const [freeThrowContext, setFreeThrowContext] = useState<"scoring" | "miss">("scoring");
  const [eventType, setEventType] = useState<"normal" | "second_chance" | "fastbreak">("normal");
  const [isLoading, setIsLoading] = useState(false);
  const [actionHistory, setActionHistory] = useState<Array<{ id: string; type: string }>>([]);
  // Ініціалізуємо з currentTimeLeft з БД (за замовчуванням 600 якщо не встановлено)
  const [gameTimeLeft, setGameTimeLeft] = useState(initialGame.currentTimeLeft || 600);

  // Порядок гравців для drag & drop (тільки коли status === "SCHEDULED")
  const [homeOrder, setHomeOrder] = useState<number[]>(
    () => [...initialGame.homeTeam.players].sort((a, b) => a.number - b.number).map(p => p.id)
  );
  const [awayOrder, setAwayOrder] = useState<number[]>(
    () => [...initialGame.awayTeam.players].sort((a, b) => a.number - b.number).map(p => p.id)
  );

  // Sync player order when game prop changes (e.g., after team composition updates)
  useEffect(() => {
    setHomeOrder(
      [...game.homeTeam.players].sort((a, b) => a.number - b.number).map(p => p.id)
    );
    setAwayOrder(
      [...game.awayTeam.players].sort((a, b) => a.number - b.number).map(p => p.id)
    );
  }, [game.homeTeam.players.length, game.awayTeam.players.length, game.id]);

  const gameStartTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number | null>(null);
  // NOTE: Don't initialize here — let useEffect set it on game change
  // This prevents stale ref between games
  const lastSyncTimeRef = useRef<number>(600);

  const isLive = game.status === "LIVE";
  const isScheduled = game.status === "SCHEDULED";

  useEffect(() => {
    // 🔴 AGGRESSIVE STATE RESET on game change
    // This effect fires whenever ANY of these change, ensuring clean state
    // (game prop updates are automatic — no setGame needed)

    // STEP 1: Reset ALL refs explicitly (no closure trap)
    gameStartTimeRef.current = null;
    pausedTimeRef.current = null;

    // STEP 2: Reset ALL UI state (substitution, modals, selections)
    setSelectedPlayerId(null);
    setShowSubModal(false);
    setSubPlayerOut(null);
    setSubPlayerIn(null);
    setShowFoulModal(false);
    setCurrentFoulPlayerId(null);
    setCurrentFoulType(null);
    setShowFreeThrowModal(false);
    setActionHistory([]);

    // STEP 3: Sync timer from DB
    const dbTime = game.currentTimeLeft || 600;
    setGameTimeLeft(dbTime);
    lastSyncTimeRef.current = dbTime;

    // STEP 4: Re-initialize timer based on game status (fresh start for new game)
    if (game.status === "LIVE") {
      // Game is live: set ref to calculate elapsed seconds from DB time
      gameStartTimeRef.current = Date.now() - (600 - dbTime) * 1000;
      pausedTimeRef.current = null;
    } else if (game.status === "PAUSED") {
      // Game is paused: set paused ref, don't start timer
      gameStartTimeRef.current = null;
      pausedTimeRef.current = dbTime;
    } else {
      // Game is scheduled: no timer yet
      gameStartTimeRef.current = null;
      pausedTimeRef.current = null;
    }
  }, [
    game.id,              // ← Game ID changed
    game.status,          // ← Status changed (SCHEDULED → LIVE → PAUSED → FINISHED)
    game.currentTimeLeft, // ← Timer synced from DB
    game.quarter,         // ← Quarter advanced
  ]); // STRONG dependency!

  useEffect(() => {
    if (!isLive) {
      // PAUSE: save current time to pausedRef
      if (gameStartTimeRef.current) {
        const elapsedSeconds = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
        pausedTimeRef.current = 600 - elapsedSeconds;
      }
      gameStartTimeRef.current = null;
      return;
    }

    // START: restore timer or begin fresh
    // Note: On new game, refs are reset by first useEffect, so this always starts fresh
    if (!gameStartTimeRef.current && pausedTimeRef.current !== null) {
      // Resume from pause
      const timeToRecover = pausedTimeRef.current;
      gameStartTimeRef.current = Date.now() - (600 - timeToRecover) * 1000;
      pausedTimeRef.current = null;
    } else if (!gameStartTimeRef.current) {
      // Fresh start (new game)
      gameStartTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      if (gameStartTimeRef.current) {
        const elapsedSeconds = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
        const newTimeLeft = Math.max(0, 600 - elapsedSeconds);
        setGameTimeLeft(newTimeLeft);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLive, game.id]); // ← ADD game.id to reset timer on game change

  // Синхронізуємо таймер в БД periодично (мінімум раз на 5 секунд) коли гра активна
  // This prevents excessive DB writes and race conditions
  useEffect(() => {
    if (!isLive || !gameTimeLeft) return;

    // Only sync if time changed by ≥5 seconds (reduce concurrent writes)
    const shouldSync = Math.abs(gameTimeLeft - lastSyncTimeRef.current) >= 5;
    if (!shouldSync) return;

    lastSyncTimeRef.current = gameTimeLeft;

    // Async sync — don't wait for result (fire and forget)
    updateGameTime({
      gameId: game.id,
      currentTimeLeft: gameTimeLeft,
    }).catch(err => console.error("[syncGameTime]", err));
  }, [gameTimeLeft, isLive, game.id]);

  // При SCHEDULED — порядок з drag & drop (homeOrder/awayOrder)
  // При LIVE/PAUSED/FINAL — сортування по номеру (drag & drop неактивний)
  const allHomePlayers = [...game.homeTeam.players];
  const allAwayPlayers = [...game.awayTeam.players];

  const homePlayers = isScheduled
    ? homeOrder.map(id => allHomePlayers.find(p => p.id === id)!).filter(Boolean)
    : allHomePlayers.sort((a, b) => a.number - b.number);
  const awayPlayers = isScheduled
    ? awayOrder.map(id => allAwayPlayers.find(p => p.id === id)!).filter(Boolean)
    : allAwayPlayers.sort((a, b) => a.number - b.number);

  const selectedPlayer = selectedPlayerId ? [...homePlayers, ...awayPlayers].find(p => p.id === selectedPlayerId) : null;
  const selectedTeamId = selectedPlayer ? selectedPlayer.teamId : game.homeTeamId;
  const isHomeTeam = selectedTeamId === game.homeTeamId;

  const allPlayers = [...homePlayers, ...awayPlayers];

  const getDisplayTime = useCallback((playerId: number): string => {
    const boxScore = game.boxScores.find(bs => bs.playerId === playerId);
    if (!boxScore) return "00:00";

    const accumulatedTime = boxScore.timeOnCourtSeconds || 0;

    // CRITICAL: Only show accumulated + session time if ACTIVELY on court during LIVE game
    // When game is PAUSED, show ONLY accumulated time (session delta is frozen)
    if (boxScore.isOnCourt && boxScore.enteredAt !== null && isLive) {
      const entranceGameClock = boxScore.enteredAt;
      const currentGameClock = gameTimeLeft;
      // Formula: time in current session = (when entered) - (now)
      // Example: entered at 600, now at 570 → 30 seconds in session
      const timeInCurrentSession = Math.max(0, entranceGameClock - currentGameClock);
      const totalTime = accumulatedTime + timeInCurrentSession;
      return formatTime(totalTime);
    }

    // Player is on bench, or game is paused → show only accumulated time
    return formatTime(accumulatedTime);
  }, [game.boxScores, gameTimeLeft, isLive]); // Include game.boxScores to update on pause/resume/substitution

  const recordAction = useCallback(async (
    actionType: string,
    payload: Record<string, any> = {}
  ) => {
    if (!selectedPlayerId && !["START_GAME", "START", "PAUSE", "NEXT_QUARTER", "END_GAME", "TIMEOUT"].includes(actionType)) {
      return;
    }

    setIsLoading(true);
    try {
      // 🔴 CRITICAL: Read FRESH values, don't rely on closure
      // This ensures we're always using current game state, not stale closure values
      const currentGame = game;
      const currentGameTimeLeft = gameTimeLeft;
      const gameClockSeconds = isLive ? currentGameTimeLeft : 600;

      if (actionType === "SUBSTITUTION" && subPlayerOut && subPlayerIn) {
        const result = await recordSubstitution({
          gameId: currentGame.id,
          quarter: currentGame.quarter,
          gameClockSeconds,
          playerOutId: subPlayerOut,
          playerInId: subPlayerIn,
        });

        if (result.success && result.updatedGame) {
          // Sync with server data via router refresh
          router.refresh();
          setActionHistory(prev => [...prev, { id: String(Date.now()), type: "SUBSTITUTION" }]);
          setSubPlayerOut(null);
          setSubPlayerIn(null);
        } else {
          console.error("Substitution failed:", result.error);
        }
      } else {
        // Для START_GAME — передати порядок гравців з drag & drop
        const actionPayload = actionType === "START_GAME"
          ? { ...payload, homePlayerOrder: homeOrder, awayPlayerOrder: awayOrder }
          : payload;

        const result = await recordGameAction({
          gameId: currentGame.id,
          actionType,
          playerId: actionType === "TIMEOUT" ? null : selectedPlayerId,
          gameClockSeconds,
          quarter: currentGame.quarter,
          payload: actionPayload,
        });

        if (result.success && result.updatedGame) {
          // Update local game state immediately (optimistic update) + revalidate from server
          setGame(result.updatedGame);
          router.refresh();
          setActionHistory(prev => [...prev, { id: String(result.action?.id || Date.now()), type: actionType }]);
        } else {
          console.error("Action failed:", result.error);
        }
      }
    } catch (error) {
      console.error("Error recording action:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    game,              // ← Full game object (includes all fields)
    gameTimeLeft,      // ← Current timer value
    isLive,            // ← Game status (LIVE vs not)
    selectedPlayerId,  // ← Selected player
    subPlayerOut,      // ← Sub out player
    subPlayerIn,       // ← Sub in player
    homeOrder,         // ← Player order for START_GAME
    awayOrder,         // ← Player order for START_GAME
  ]); // COMPREHENSIVE dependencies!

  const undoLastAction = useCallback(async () => {
    if (actionHistory.length === 0 || !game.events.length) return;

    setIsLoading(true);
    try {
      const lastEvent = game.events[0];
      const result = await undoGameAction({
        gameId: game.id,
        actionId: String(lastEvent.id),
      });

      if (result.success && result.updatedGame) {
        // Sync with server data via router refresh
        router.refresh();
        setActionHistory(prev => prev.slice(1));
      }
    } catch (error) {
      console.error("Error undoing action:", error);
    } finally {
      setIsLoading(false);
    }
  }, [game.id, game.events, actionHistory]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", flex: 1, background: "#f9fafb", overflow: "hidden", margin: 0, padding: 0 }}>
      <header style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "6px 12px", background: "#1a2737", gap: 8, borderBottom: "1px solid #2a3e52", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{game.homeTeam.name}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#6b8caa" }}>Таймаут: <b style={{ color: "#e8a030" }}>{game.homeTimeouts}</b>/5</span>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < game.homeTimeouts ? "#f4cc5a" : "#3a4a5a", border: "1px solid #2a3a4a" }} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: "700", color: "#fff", lineHeight: 1 }}>{game.homeScore} : {game.awayScore}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
            <button onClick={() => {}} disabled={!isLive} style={{ padding: "2px 6px", fontSize: 12, fontWeight: "600", border: "none", borderRadius: 2, cursor: "pointer", background: isLive ? "#1a3a50" : "#1a2e40", color: isLive ? "#5ab3f4" : "#4a7fa5", opacity: isLive ? 1 : 0.5 }}>−1хв</button>
            <div style={{ fontSize: 28, fontWeight: "700", color: "#fff", minWidth: "80px" }} data-time>{String(Math.floor(gameTimeLeft / 60)).padStart(2, "0")}:{String(gameTimeLeft % 60).padStart(2, "0")}</div>
            <button onClick={() => {}} disabled={!isLive} style={{ padding: "2px 6px", fontSize: 12, fontWeight: "600", border: "none", borderRadius: 2, cursor: "pointer", background: isLive ? "#1a3a50" : "#1a2e40", color: isLive ? "#5ab3f4" : "#4a7fa5", opacity: isLive ? 1 : 0.5 }}>+1хв</button>
          </div>
          <div style={{ fontSize: 14, fontWeight: "700", color: "#5ab3f4", marginTop: 2 }}>{game.quarter} чверть</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{game.awayTeam.name}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 2, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#6b8caa" }}>Таймаут: {game.awayTimeouts}/5</span>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < game.awayTimeouts ? "#f4cc5a" : "#3a4a5a", border: "1px solid #2a3a4a" }} />
              ))}
            </div>
          </div>
        </div>
      </header>

      <div style={{ display: "flex", gap: 8, padding: "8px 12px", background: "#0d1520", borderBottom: "1px solid #1a2e40", flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}>
        {isScheduled && <button onClick={() => recordAction("START_GAME")} disabled={isLoading} style={{ border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 11, fontWeight: "700", cursor: "pointer", background: "#10b981", color: "#fff" }}>▶ Почати</button>}
        <button onClick={() => recordAction(isLive ? "PAUSE" : "START")} disabled={isLoading} style={{ border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 11, fontWeight: "700", cursor: "pointer", background: "#3a6fa5", color: "#fff" }}>{isLive ? "⏸ Пауза" : "▶ Старт"}</button>
        <button onClick={() => recordAction("NEXT_QUARTER")} disabled={game.quarter >= 4 || isLoading} style={{ border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 11, fontWeight: "700", cursor: "pointer", background: game.quarter >= 4 ? "#6b7280" : "#3a6fa5", color: "#fff", opacity: game.quarter >= 4 ? 0.6 : 1 }}>→ Наступна</button>
        <button onClick={() => { if (confirm("Завершити матч остаточно?")) recordAction("END_GAME"); }} disabled={isLoading} style={{ border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 11, fontWeight: "700", cursor: "pointer", background: "#dc2626", color: "#fff" }}>Завершити</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 200px", flex: 1, overflow: "hidden", gap: 6, padding: 6, minHeight: 0, height: "100%" }}>
        {isScheduled ? (
          <DraggableRosterPanel
            players={homePlayers}
            order={homeOrder}
            setOrder={setHomeOrder}
            isHome={true}
            team={game.homeTeam}
          />
        ) : (
          <RosterPanel players={homePlayers} teamId={game.homeTeamId} team={game.homeTeam} selectedId={selectedPlayerId} onSelect={setSelectedPlayerId} isHome={true} events={game.events} game={game} getDisplayTime={getDisplayTime} />
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: 2, minHeight: 0 }}>
          <div style={{ flex: "0 0 36px", display: "flex", gap: 2 }}>
            <button onClick={() => { if (selectedPlayerId) { setSubPlayerOut(selectedPlayerId); setShowSubModal(true); } }} disabled={!selectedPlayerId} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#1a2e40", color: !selectedPlayerId ? "#4a7fa5" : "#8ab8d0", fontSize: 26, fontWeight: 600, border: "none", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>Заміна</button>
            <button onClick={() => recordAction("TIMEOUT")} disabled={!selectedPlayerId || isLoading} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#3a2500", color: !selectedPlayerId ? "#4a7fa5" : "#f4cc5a", fontSize: 26, fontWeight: 600, border: "none", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>Тайм-аут</button>
            <button onClick={undoLastAction} disabled={actionHistory.length === 0 || isLoading} style={{ flex: 1, height: "100%", background: actionHistory.length === 0 ? "#1a2e40" : "#3a2500", color: actionHistory.length === 0 ? "#4a7fa5" : "#f4cc5a", fontSize: 26, fontWeight: 600, border: "none", borderRadius: 3, cursor: "pointer", opacity: actionHistory.length === 0 ? 0.5 : 1 }}>↩ Відкат</button>
            <button onClick={() => {}} disabled={true} style={{ flex: 1, height: "100%", background: "#1a2e40", color: "#4a7fa5", fontSize: 26, fontWeight: 600, border: "none", borderRadius: 3, cursor: "pointer", opacity: 0.5 }}>Скасувати</button>
            <button onClick={() => { if (confirm("Завершити матч?")) recordAction("END_GAME"); }} disabled={isLoading} style={{ flex: 1, height: "100%", background: "#0f2a10", color: "#4ef472", fontSize: 26, fontWeight: 600, border: "none", borderRadius: 3, cursor: "pointer" }}>Завершити</button>
          </div>

          <div style={{ flex: 1.2, display: "flex", gap: 2 }}>
            <button onClick={() => { if (selectedPlayerId) { setFreeThrowContext("scoring"); setShowFreeThrowModal(true); } }} disabled={!selectedPlayerId} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#0f3a1a", color: !selectedPlayerId ? "#4a7fa5" : "#4ef472", fontSize: 64, fontWeight: 800, border: !selectedPlayerId ? "none" : "1px solid #1a5028", borderRadius: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}><span>+1</span><span style={{ fontSize: 26 }}>Очко</span></button>
            <button onClick={() => recordAction("POINTS", { points: 2 })} disabled={!selectedPlayerId || isLoading} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#0f3a1a", color: !selectedPlayerId ? "#4a7fa5" : "#4ef472", fontSize: 64, fontWeight: 800, border: !selectedPlayerId ? "none" : "1px solid #1a5028", borderRadius: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}><span>+2</span><span style={{ fontSize: 26 }}>Двоочковий</span></button>
            <button onClick={() => recordAction("POINTS", { points: 3 })} disabled={!selectedPlayerId || isLoading} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#0f3a1a", color: !selectedPlayerId ? "#4a7fa5" : "#4ef472", fontSize: 64, fontWeight: 800, border: !selectedPlayerId ? "none" : "1px solid #1a5028", borderRadius: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}><span>+3</span><span style={{ fontSize: 26 }}>Триочковий</span></button>
            <div style={{ width: 1, background: "#1a2e40" }} />
            <button onClick={() => recordAction("REBOUND_DEF")} disabled={!selectedPlayerId || isLoading} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#1a0f3a", color: !selectedPlayerId ? "#4a7fa5" : "#b07af4", fontSize: 36, fontWeight: 700, border: !selectedPlayerId ? "none" : "1px solid #2a1a5a", borderRadius: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}><span>Підбір</span><span style={{ fontSize: 20 }}>захист</span></button>
            <button onClick={() => recordAction("REBOUND_OFF")} disabled={!selectedPlayerId || isLoading} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#1a0f3a", color: !selectedPlayerId ? "#4a7fa5" : "#b07af4", fontSize: 36, fontWeight: 700, border: !selectedPlayerId ? "none" : "1px solid #2a1a5a", borderRadius: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}><span>Підбір</span><span style={{ fontSize: 20 }}>напад</span></button>
          </div>

          <div style={{ flex: 0.8, display: "flex", gap: 2 }}>
            <button onClick={() => { if (selectedPlayerId) { setFreeThrowContext("miss"); setShowFreeThrowModal(true); } }} disabled={!selectedPlayerId} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#2d0a0a", color: !selectedPlayerId ? "#4a7fa5" : "#f47a7a", fontSize: 30, fontWeight: 700, border: "none", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>1 Невлучно</button>
            <button onClick={() => recordAction("MISS_2P")} disabled={!selectedPlayerId || isLoading} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#2d0a0a", color: !selectedPlayerId ? "#4a7fa5" : "#f47a7a", fontSize: 30, fontWeight: 700, border: "none", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>2 Невлучно</button>
            <button onClick={() => recordAction("MISS_3P")} disabled={!selectedPlayerId || isLoading} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#2d0a0a", color: !selectedPlayerId ? "#4a7fa5" : "#f47a7a", fontSize: 30, fontWeight: 700, border: "none", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>3 Невлучно</button>
            <div style={{ width: 1, background: "#1a2e40" }} />
            <button onClick={() => recordAction("TURNOVER")} disabled={!selectedPlayerId || isLoading} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#2d1a00", color: !selectedPlayerId ? "#4a7fa5" : "#f4cc5a", fontSize: 30, fontWeight: 700, border: "none", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>Втрата</button>
            <button onClick={() => { if (selectedPlayerId) { setCurrentFoulType("PERSONAL"); setCurrentFoulPlayerId(selectedPlayerId); setShowFoulModal(true); } }} disabled={!selectedPlayerId} style={{ flex: 0.7, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#2d0808", color: !selectedPlayerId ? "#4a7fa5" : "#f47a7a", fontSize: 28, fontWeight: 700, border: "none", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>Фол П</button>
            <button onClick={() => { if (selectedPlayerId) { setCurrentFoulType("UNSPORTSMANLIKE"); setCurrentFoulPlayerId(selectedPlayerId); setShowFoulModal(true); } }} disabled={!selectedPlayerId} style={{ flex: 0.7, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#2d0808", color: !selectedPlayerId ? "#4a7fa5" : "#f47a7a", fontSize: 28, fontWeight: 700, border: "none", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>Неспорт.</button>
          </div>

          <div style={{ flex: 1.5, display: "flex", gap: 2 }}>
            <button onClick={() => recordAction("ASSIST")} disabled={!selectedPlayerId || isLoading} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#0a2a10", color: !selectedPlayerId ? "#4a7fa5" : "#4ef472", fontSize: 36, fontWeight: 700, border: !selectedPlayerId ? "none" : "1px solid #1a4020", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>Передача</button>
            <button onClick={() => recordAction("STEAL")} disabled={!selectedPlayerId || isLoading} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#0a1a3a", color: !selectedPlayerId ? "#4a7fa5" : "#5ae8f4", fontSize: 36, fontWeight: 700, border: !selectedPlayerId ? "none" : "1px solid #1a2a5a", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>Перехват</button>
            <button onClick={() => recordAction("BLOCK")} disabled={!selectedPlayerId || isLoading} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#2a1800", color: !selectedPlayerId ? "#4a7fa5" : "#f4a050", fontSize: 36, fontWeight: 700, border: !selectedPlayerId ? "none" : "1px solid #5a3800", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>Блокшот</button>
            <div style={{ width: 1, background: "#1a2e40" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <button onClick={() => { if (selectedPlayerId) { setCurrentFoulType("PERSONAL"); setCurrentFoulPlayerId(selectedPlayerId); setShowFoulModal(true); } }} disabled={!selectedPlayerId} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#2d0808", color: !selectedPlayerId ? "#4a7fa5" : "#f47a7a", fontSize: 28, fontWeight: 700, border: "none", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>Тренеру</button>
              <button onClick={() => { if (selectedPlayerId) { setCurrentFoulType("TECHNICAL"); setCurrentFoulPlayerId(selectedPlayerId); setShowFoulModal(true); } }} disabled={!selectedPlayerId} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#2d0808", color: !selectedPlayerId ? "#4a7fa5" : "#f47a7a", fontSize: 28, fontWeight: 700, border: "none", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>Техніч.</button>
            </div>
          </div>

          <div style={{ flex: "0 0 36px", display: "flex", gap: 2 }}>
            <button onClick={() => setEventType("normal")} style={{ flex: 1, height: "100%", background: eventType === "normal" ? "#163a5c" : "#1a2e40", color: eventType === "normal" ? "#5ab3f4" : "#8ab8d0", fontSize: 26, fontWeight: 600, border: eventType === "normal" ? "1px solid #2a5a8a" : "none", borderRadius: 3, cursor: "pointer" }}>Звичайний ✓</button>
            <button onClick={() => setEventType("second_chance")} style={{ flex: 1, height: "100%", background: eventType === "second_chance" ? "#163a5c" : "#1a2e40", color: eventType === "second_chance" ? "#5ab3f4" : "#8ab8d0", fontSize: 26, fontWeight: 600, border: eventType === "second_chance" ? "1px solid #2a5a8a" : "none", borderRadius: 3, cursor: "pointer" }}>2й шанс</button>
            <button onClick={() => setEventType("fastbreak")} style={{ flex: 1, height: "100%", background: eventType === "fastbreak" ? "#163a5c" : "#1a2e40", color: eventType === "fastbreak" ? "#5ab3f4" : "#8ab8d0", fontSize: 26, fontWeight: 600, border: eventType === "fastbreak" ? "1px solid #2a5a8a" : "none", borderRadius: 3, cursor: "pointer" }}>Швидкий відрив</button>
            <button onClick={() => { if (selectedPlayerId) { setCurrentFoulType("DISQUALIFYING"); setCurrentFoulPlayerId(selectedPlayerId); setShowFoulModal(true); } }} disabled={!selectedPlayerId} style={{ flex: 1, height: "100%", background: !selectedPlayerId ? "#1a2e40" : "#8b0000", color: !selectedPlayerId ? "#4a7fa5" : "#ffaaaa", fontSize: 26, fontWeight: 600, border: "none", borderRadius: 3, cursor: "pointer", opacity: !selectedPlayerId ? 0.5 : 1 }}>Дискв.</button>
          </div>
        </div>

        {isScheduled ? (
          <DraggableRosterPanel
            players={awayPlayers}
            order={awayOrder}
            setOrder={setAwayOrder}
            isHome={false}
            team={game.awayTeam}
          />
        ) : (
          <RosterPanel players={awayPlayers} teamId={game.awayTeamId} team={game.awayTeam} selectedId={selectedPlayerId} onSelect={setSelectedPlayerId} isHome={false} events={game.events} game={game} getDisplayTime={getDisplayTime} />
        )}
      </div>

      <div style={{ background: "#080f18", borderTop: "1px solid #1a2e40", padding: "4px 8px", flex: "0 0 120px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0px" }}>
        {game.events.map((e, i) => {
          let eventColor = "#5a7a9a";
          let eventLabel = e.type;
          if (e.type === "POINTS") {
            eventColor = "#4ef472";
            eventLabel = `+${e.points}`;
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
            <div key={i} style={{ display: "flex", gap: "8px", padding: "2px 0", borderBottom: "0.5px solid #0d1a28", fontSize: "11px", whiteSpace: "nowrap" }}>
              <span style={{ color: "#4a7fa5" }}>Q{e.quarter} 10:00</span>
              <span style={{ color: "#c8d8e8" }}>#{e.player?.number} {e.player?.lastName}</span>
              <span style={{ color: eventColor, fontWeight: "700" }}>{eventLabel}</span>
            </div>
          );
        })}
      </div>

      <FoulPlayerModal
        isOpen={showFoulModal}
        onClose={() => { setShowFoulModal(false); setCurrentFoulType(null); setCurrentFoulPlayerId(null); }}
        onSelect={(fouledPlayerId) => {
          if (currentFoulPlayerId && currentFoulType) {
            recordAction(currentFoulType === "PERSONAL" ? "FOUL" : `FOUL_${currentFoulType}`, {
              fouledPlayerId,
              foulType: currentFoulType,
            });
            setShowFoulModal(false);
            setCurrentFoulType(null);
            setCurrentFoulPlayerId(null);
          }
        }}
        opponentPlayers={isHomeTeam ? awayPlayers : homePlayers}
        foulType={currentFoulType}
      />

      <FreeThrowModal
        isOpen={showFreeThrowModal}
        onClose={() => setShowFreeThrowModal(false)}
        onSelectRegular={() => {
          if (freeThrowContext === "scoring") {
            recordAction("POINTS", { points: 1, isFreeThrow: false });
          } else {
            recordAction("MISS_1P");
          }
          setShowFreeThrowModal(false);
        }}
        onSelectFreeThrow={() => {
          if (freeThrowContext === "scoring") {
            recordAction("POINTS", { points: 1, isFreeThrow: true });
          } else {
            recordAction("MISS_FT");
          }
          setShowFreeThrowModal(false);
        }}
        context={freeThrowContext}
      />

      {showSubModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#1a2737", borderRadius: 10, padding: 16, width: 280, border: "1px solid #2a5a8c" }}>
            <div style={{ fontSize: 13, fontWeight: "700", color: "#fff", marginBottom: 10 }}>↕ Заміна гравця</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={{ fontSize: 13, color: "#4a7fa5", marginBottom: 4, display: "block" }}>Хто ВИХОДИТЬ:</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxHeight: 80, overflow: "auto" }}>
                  {isHomeTeam
                    ? homePlayers
                        .filter(p => game.boxScores.find(bs => bs.playerId === p.id && bs.isOnCourt))
                        .map(p => (
                          <button key={p.id} onClick={() => setSubPlayerOut(p.id)} style={{ border: "1px solid", borderRadius: 4, padding: "3px 7px", fontSize: 13, cursor: "pointer", background: subPlayerOut === p.id ? "#1e4a22" : "#12202e", borderColor: subPlayerOut === p.id ? "#2ecc71" : "#2a4060", color: subPlayerOut === p.id ? "#4ef472" : "#7aaccc", fontWeight: "600" }}>#{p.number} {p.lastName}</button>
                        ))
                    : awayPlayers
                        .filter(p => game.boxScores.find(bs => bs.playerId === p.id && bs.isOnCourt))
                        .map(p => (
                          <button key={p.id} onClick={() => setSubPlayerOut(p.id)} style={{ border: "1px solid", borderRadius: 4, padding: "3px 7px", fontSize: 13, cursor: "pointer", background: subPlayerOut === p.id ? "#1e4a22" : "#12202e", borderColor: subPlayerOut === p.id ? "#2ecc71" : "#2a4060", color: subPlayerOut === p.id ? "#4ef472" : "#7aaccc", fontWeight: "600" }}>#{p.number} {p.lastName}</button>
                        ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#4a7fa5", marginBottom: 4, display: "block" }}>Хто ЗАХОДИТЬ:</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxHeight: 80, overflow: "auto" }}>
                  {isHomeTeam
                    ? homePlayers
                        .filter(p => game.boxScores.find(bs => bs.playerId === p.id && !bs.isOnCourt))
                        .map(p => (
                          <button key={p.id} onClick={() => setSubPlayerIn(p.id)} style={{ border: "1px solid", borderRadius: 4, padding: "3px 7px", fontSize: 13, cursor: "pointer", background: subPlayerIn === p.id ? "#1a3a5c" : "#12202e", borderColor: subPlayerIn === p.id ? "#5ab3f4" : "#2a4060", color: subPlayerIn === p.id ? "#5ab3f4" : "#7aaccc", fontWeight: "600" }}>#{p.number} {p.lastName}</button>
                        ))
                    : awayPlayers
                        .filter(p => game.boxScores.find(bs => bs.playerId === p.id && !bs.isOnCourt))
                        .map(p => (
                          <button key={p.id} onClick={() => setSubPlayerIn(p.id)} style={{ border: "1px solid", borderRadius: 4, padding: "3px 7px", fontSize: 13, cursor: "pointer", background: subPlayerIn === p.id ? "#1a3a5c" : "#12202e", borderColor: subPlayerIn === p.id ? "#5ab3f4" : "#2a4060", color: subPlayerIn === p.id ? "#5ab3f4" : "#7aaccc", fontWeight: "600" }}>#{p.number} {p.lastName}</button>
                        ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button disabled={!subPlayerOut || !subPlayerIn || isLoading} onClick={() => {
                  if (subPlayerOut && subPlayerIn) {
                    recordAction("SUBSTITUTION");
                    setShowSubModal(false);
                    setSubPlayerOut(null);
                    setSubPlayerIn(null);
                  }
                }} style={{ flex: 1, border: "none", borderRadius: 5, padding: "6px", fontSize: 11, cursor: "pointer", background: !subPlayerOut || !subPlayerIn ? "#1a2e40" : "#1a4a22", color: !subPlayerOut || !subPlayerIn ? "#4a7fa5" : "#4ef472", fontWeight: "700", opacity: !subPlayerOut || !subPlayerIn ? 0.5 : 1 }}>✓ Замінити</button>
                <button onClick={() => { setShowSubModal(false); setSubPlayerOut(null); setSubPlayerIn(null); }} style={{ border: "none", borderRadius: 5, padding: "6px 10px", fontSize: 11, cursor: "pointer", background: "#3d1010", color: "#f47a7a", fontWeight: "600" }}>Скасувати</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
