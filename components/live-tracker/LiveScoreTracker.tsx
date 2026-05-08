"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { nextQuarter, endGame, startGameRefactored, undoLastEvent, addAssist, addSteal, addReboundOff, addReboundDef, addBlock, addTurnover, addMissFt, addMissFg2, addMissFg3, addFoul, addFoulTechnical, addFoulUnsportsmanlike, addFoulDisqualifying, addCoachFoul, addScoreWithType, addSubstitutionRefactored, addTimeout, addFreeThrow } from "@/actions/game";
import type { Game, Team, Player, GameEvent, BoxScore } from "@prisma/client";
import StatEntryGrid from "./StatEntryGrid";
import type { PlayerOnCourtState, TeamPlayersState, GameStateCompact, SubstitutionMode } from "@/types/live-tracker";

type GameWithAll = Game & {
  homeTeam: Team & { players: Player[] };
  awayTeam: Team & { players: Player[] };
  events: (GameEvent & {
    player: Pick<Player, "firstName" | "lastName" | "number"> | null;
  })[];
  onCourt: Array<{
    gameId: number
    playerId: number
    teamId: number
    onCourt: boolean
    isStarter: boolean
    timeOnCourtSeconds: number
    lastSubInTimestamp: number | null
  }>;
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

/** Helper: Calculate display time for a player (current + accumulated) */
function getDisplayTime(player: PlayerOnCourtState, gameClock: number): string {
  let totalSeconds = player.timeOnCourtSeconds;

  if (player.onCourt && player.lastSubInTimestamp !== null) {
    totalSeconds += gameClock - player.lastSubInTimestamp;
  }

  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** Helper: Update a single player's stats in gameState */
function updatePlayerStats(
  state: GameStateCompact,
  teamId: number,
  playerId: number,
  updates: Partial<PlayerOnCourtState>
): GameStateCompact {
  const isHome = teamId === state.homeTeam.teamId;
  const team = isHome ? state.homeTeam : state.awayTeam;

  const player = team.players[playerId];
  if (!player) return state;

  const updated = { ...team };
  updated.players = { ...team.players };
  updated.players[playerId] = { ...player, ...updates };

  return isHome
    ? { ...state, homeTeam: updated }
    : { ...state, awayTeam: updated };
}

interface RosterPanelProps {
  gameState: GameStateCompact;
  teamSide: 'home' | 'away';
  selectedPlayerId: number | null;
  onSelectPlayer: (id: number) => void;
  events: GameEvent[];
  isScheduled: boolean;
  isLive: boolean;
  onToggleStarter: (playerId: number) => void;
  onInitiateSubstitution: (playerId: number, teamId: number) => void;
  substitutionMode: SubstitutionMode;
}

function RosterPanel({
  gameState,
  teamSide,
  selectedPlayerId,
  onSelectPlayer,
  events,
  isScheduled,
  isLive,
  onToggleStarter,
  onInitiateSubstitution,
  substitutionMode,
}: RosterPanelProps) {
  const team = teamSide === 'home' ? gameState.homeTeam : gameState.awayTeam;
  const isHome = teamSide === 'home';

  const allPlayers = Object.values(team.players).sort((a, b) => a.number - b.number);
  const onCourt = allPlayers.filter(p => p.onCourt);
  const bench = allPlayers.filter(p => !p.onCourt);

  // Check if we're in bench selection mode for this team
  const isBenchSelectionMode =
    substitutionMode.phase === 'selecting_bench' &&
    substitutionMode.teamId === team.teamId;

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

      {/* На площадці */}
      <div style={{
        fontSize: "9px",
        color: isHome ? "#2ecc71" : "#059669",
        background: "transparent",
        padding: "1px 3px",
        marginBottom: "0px",
        fontWeight: "bold",
        marginTop: "1px"
      }}>
        ● На площадці ({onCourt.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
        {onCourt.map(p => {
          const foulCount = getPlayerFoulCount(events, p.playerId);
          const displayTime = getDisplayTime(p, gameState.gameClock);

          return (
            <div
              key={p.playerId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2px",
                padding: "2px 4px",
                borderRadius: "1px",
                background: selectedPlayerId === p.playerId ? (isHome ? "#163a5c" : "#fed7aa") : "transparent",
                fontSize: "10px",
                color: isHome ? (selectedPlayerId === p.playerId ? "#5ab3f4" : "#c8d8e8") : (selectedPlayerId === p.playerId ? "#92400e" : "#374151"),
              }}
            >
              {/* Лампочка (на площадці = зелена) */}
              <button
                onClick={() => {
                  if (isScheduled) {
                    onToggleStarter(p.playerId);
                  } else if (isLive) {
                    onSelectPlayer(p.playerId);
                  }
                }}
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: p.onCourt ? (isHome ? "#2ecc71" : "#059669") : (isHome ? "#2a4060" : "#d1d5db"),
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                }}
              />

              {/* Номер */}
              <span style={{ minWidth: "18px", fontWeight: 700, fontSize: "16px" }}>#{p.number}</span>

              {/* Имя */}
              <span style={{ fontSize: "15px" }}>
                {p.lastName}
              </span>

              {/* Время на площадці (для live) */}
              {isLive && (
                <span style={{ fontSize: "9px", color: isHome ? "#6b8caa" : "#6b7280", marginLeft: "auto", marginRight: "4px" }}>
                  {displayTime}
                </span>
              )}

              {/* Кнопка "Замена" (для live, на площадці) */}
              {isLive && p.onCourt && (
                <button
                  onClick={() => onInitiateSubstitution(p.playerId, team.teamId)}
                  style={{
                    padding: "1px 4px",
                    fontSize: "8px",
                    background: "#f97316",
                    color: "#fff",
                    border: "none",
                    borderRadius: "2px",
                    cursor: "pointer",
                    flexShrink: 0,
                    fontWeight: "600",
                  }}
                >
                  Заміна
                </button>
              )}

              {/* Foul indicators — 5 квадратів */}
              <div style={{ display: "flex", gap: "2px", marginLeft: "auto", flexShrink: 0 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "1px",
                      background: foulCount > i ? "#ef4444" : "#3a3a3a",
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* На скамейці */}
      <div style={{
        fontSize: "9px",
        color: isHome ? "#4a7fa5" : "#6b7280",
        padding: "1px 3px",
        marginBottom: "0px",
        fontWeight: "bold",
        marginTop: "1px"
      }}>
        ○ На скамейці ({bench.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0px", flex: 1, overflowY: "auto" }}>
        {bench.map(p => {
          const foulCount = getPlayerFoulCount(events, p.playerId);
          const isSelectableBench = isBenchSelectionMode;
          const displayTime = getDisplayTime(p, gameState.gameClock);

          return (
            <div
              key={p.playerId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2px",
                padding: "2px 4px",
                borderRadius: "1px",
                background: isSelectableBench
                  ? "#3a5028"
                  : selectedPlayerId === p.playerId
                  ? (isHome ? "#163a5c" : "#fed7aa")
                  : "transparent",
                fontSize: "10px",
                color: isHome ? (selectedPlayerId === p.playerId ? "#5ab3f4" : "#c8d8e8") : (selectedPlayerId === p.playerId ? "#92400e" : "#6b7280"),
                cursor: isSelectableBench ? "pointer" : "default",
              }}
              onClick={() => {
                if (isSelectableBench) {
                  onSelectPlayer(p.playerId);
                }
              }}
            >
              {/* Лампочка (на скамейці = сіра) */}
              <button
                onClick={() => {
                  if (isScheduled) {
                    onToggleStarter(p.playerId);
                  } else if (isLive && isSelectableBench) {
                    onSelectPlayer(p.playerId);
                  }
                }}
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: isHome ? "#2a4060" : "#d1d5db",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                }}
              />

              {/* Номер */}
              <span style={{ minWidth: "18px", fontWeight: 700, fontSize: "16px" }}>#{p.number}</span>

              {/* Имя */}
              <span style={{ fontSize: "15px" }}>
                {p.lastName}
              </span>

              {/* Время на скамейці */}
              {isLive && (
                <span style={{ fontSize: "9px", color: isHome ? "#6b8caa" : "#6b7280", marginLeft: "auto", marginRight: "4px" }}>
                  {displayTime}
                </span>
              )}

              {/* Foul indicators */}
              <div style={{ display: "flex", gap: "2px", marginLeft: "auto", flexShrink: 0 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "1px",
                      background: foulCount > i ? "#ef4444" : "#3a3a3a",
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Foul Indicators */}
      <div style={{ background: isHome ? "#0d1520" : "#f3f4f6", padding: "4px 3px", borderTop: "1px solid " + (isHome ? "#1a2e40" : "#e5e7eb"), display: "flex", gap: "4px", justifyContent: "center", fontSize: "9px", color: isHome ? "#3a6fa5" : "#6b7280" }}>
        {[1, 2, 3, 4, 5].map(i => {
          const teamFouls = getTeamFoulCount(events, team.teamId, gameState.quarter);
          return (
            <div
              key={i}
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "2px",
                background: teamFouls >= i ? (teamFouls >= 5 ? "#dc2626" : "#f97316") : (isHome ? "#1a3a50" : "#e5e7eb"),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                color: teamFouls >= i ? "#fff" : (isHome ? "#666" : "#999"),
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
  // ============= GAME STATE (new Record-based structure) =============
  const [gameState, setGameState] = useState<GameStateCompact>(() => ({
    gameId: game.id,
    status: (game.status as 'SCHEDULED' | 'LIVE' | 'FINAL') || 'SCHEDULED',
    quarter: game.quarter,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    homeTimeouts: game.homeTimeouts,
    awayTimeouts: game.awayTimeouts,
    gameClock: 0,
    isClockRunning: false,
    homeTeam: { teamId: game.homeTeamId, name: game.homeTeam.name, players: {} },
    awayTeam: { teamId: game.awayTeamId, name: game.awayTeam.name, players: {} },
  }));

  // ============= STARTER SELECTION (SCHEDULED mode only) =============
  const [selectedStarters, setSelectedStarters] = useState<{
    home: Set<number>;
    away: Set<number>;
  }>({ home: new Set(), away: new Set() });

  // ============= SUBSTITUTION MODE (two-phase) =============
  const [substitutionMode, setSubstitutionMode] = useState<SubstitutionMode>({ phase: 'idle' });

  // ============= TIMER & CLOCK =============
  const [timeLeft, setTimeLeft] = useState(QUARTER_DURATION);
  const [timerRunning, setTimerRunning] = useState(false);

  // ============= PLAYER SELECTION & EVENT TYPE =============
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [eventType, setEventType] = useState<"normal" | "fastbreak" | "second_chance" | "off_turnover">("normal");

  // ============= UI STATE =============
  const [showGridView, setShowGridView] = useState(false);
  const [pending, startTransition] = useTransition();

  // ============= REFS =============
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quarterRef = useRef(game.quarter);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // ============= INITIALIZE gameState FROM PROPS =============
  useEffect(() => {
    if (!game.boxScores || !game.onCourt) return;

    const buildTeamPlayers = (teamId: number): Record<number, PlayerOnCourtState> => {
      const players: Record<number, PlayerOnCourtState> = {};

      const teamPlayers = teamId === game.homeTeamId
        ? game.homeTeam.players
        : game.awayTeam.players;

      teamPlayers.forEach(p => {
        const boxScore = game.boxScores.find(bs => bs.playerId === p.id);
        const onCourtRecord = game.onCourt.find(oc => oc.playerId === p.id);

        players[p.id] = {
          playerId: p.id,
          number: p.number,
          firstName: p.firstName,
          lastName: p.lastName,
          teamId: p.teamId,

          onCourt: onCourtRecord?.onCourt ?? false,
          isStarter: onCourtRecord?.isStarter ?? false,
          timeOnCourtSeconds: onCourtRecord?.timeOnCourtSeconds ?? 0,
          lastSubInTimestamp: onCourtRecord?.lastSubInTimestamp ?? null,

          points: boxScore?.points ?? 0,
          rebounds: boxScore?.rebounds ?? 0,
          assists: boxScore?.assists ?? 0,
          steals: boxScore?.steals ?? 0,
          blocks: boxScore?.blocks ?? 0,
          fouls: boxScore?.fouls ?? 0,
          turnovers: boxScore?.turnovers ?? 0,
          plusMinus: boxScore?.plusMinus ?? 0,
        };
      });

      return players;
    };

    setGameState(prev => ({
      ...prev,
      status: (game.status as 'SCHEDULED' | 'LIVE' | 'FINAL') || 'SCHEDULED',
      quarter: game.quarter,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      homeTimeouts: game.homeTimeouts,
      awayTimeouts: game.awayTimeouts,

      homeTeam: {
        ...prev.homeTeam,
        players: buildTeamPlayers(game.homeTeamId),
      },
      awayTeam: {
        ...prev.awayTeam,
        players: buildTeamPlayers(game.awayTeamId),
      },
    }));
  }, [game.id, game.boxScores, game.onCourt, game.status, game.homeTeamId, game.awayTeamId]);

  // ============= UPDATE FROM REAL-TIME STATS =============
  // When a stat is added (points, rebounds, etc.), merge into gameState
  useEffect(() => {
    if (!game.boxScores) return;

    setGameState(prev => {
      let changed = false;
      const newHome = { ...prev.homeTeam };
      const newAway = { ...prev.awayTeam };
      newHome.players = { ...prev.homeTeam.players };
      newAway.players = { ...prev.awayTeam.players };

      game.boxScores.forEach(bs => {
        const isHome = bs.teamId === game.homeTeamId;
        const team = isHome ? newHome : newAway;
        const existing = team.players[bs.playerId];

        if (!existing) return;

        const updated: PlayerOnCourtState = {
          ...existing,
          points: bs.points,
          rebounds: bs.rebounds,
          assists: bs.assists,
          steals: bs.steals,
          blocks: bs.blocks,
          fouls: bs.fouls,
          turnovers: bs.turnovers,
          plusMinus: bs.plusMinus,
        };

        if (JSON.stringify(existing) !== JSON.stringify(updated)) {
          team.players[bs.playerId] = updated;
          changed = true;
        }
      });

      return changed ? { ...prev, homeTeam: newHome, awayTeam: newAway } : prev;
    });
  }, [game.boxScores, game.homeTeamId]);

  // ============= QUARTER CHANGE =============
  useEffect(() => {
    if (quarterRef.current !== game.quarter) {
      quarterRef.current = game.quarter;
      setTimeLeft(QUARTER_DURATION);
      setTimerRunning(false);
    }
  }, [game.quarter]);

  // ============= TIMER FUNCTIONS =============
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

  // Update gameClock every second for live time display
  useEffect(() => {
    const gameClock = QUARTER_DURATION - timeLeft;
    setGameState(prev => ({
      ...prev,
      gameClock: gameClock,
    }));
  }, [timeLeft]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ============= SCROLL TO LATEST EVENT =============
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [game.events]);

  // ============= STATUS CHECKS =============
  const isScheduled = gameState.status === "SCHEDULED";
  const isLive = gameState.status === "LIVE";

  // ============= STARTER SELECTION LOGIC (SCHEDULED mode) =============
  const handleToggleStarter = (teamSide: 'home' | 'away', playerId: number) => {
    if (!isScheduled) return;

    setSelectedStarters(prev => {
      const updated = { ...prev };
      const starters = new Set(prev[teamSide]);

      if (starters.has(playerId)) {
        starters.delete(playerId);
      } else if (starters.size < 5) {
        starters.add(playerId);
      }

      updated[teamSide] = starters;
      return updated;
    });
  };

  const canStartGame = selectedStarters.home.size === 5 && selectedStarters.away.size === 5;

  const handleStartGame = async () => {
    try {
      await startTransition(async () => {
        await startGameRefactored(
          game.id,
          Array.from(selectedStarters.home),
          Array.from(selectedStarters.away)
        );
      });

      // Update local state: set status to LIVE, mark starters as onCourt
      setGameState(prev => {
        const newHome = { ...prev.homeTeam };
        const newAway = { ...prev.awayTeam };
        newHome.players = { ...prev.homeTeam.players };
        newAway.players = { ...prev.awayTeam.players };

        selectedStarters.home.forEach(playerId => {
          if (newHome.players[playerId]) {
            newHome.players[playerId] = {
              ...newHome.players[playerId],
              onCourt: true,
              isStarter: true,
              lastSubInTimestamp: 0,
            };
          }
        });

        selectedStarters.away.forEach(playerId => {
          if (newAway.players[playerId]) {
            newAway.players[playerId] = {
              ...newAway.players[playerId],
              onCourt: true,
              isStarter: true,
              lastSubInTimestamp: 0,
            };
          }
        });

        return {
          ...prev,
          status: 'LIVE',
          homeTeam: newHome,
          awayTeam: newAway,
        };
      });
    } catch (error) {
      console.error('[handleStartGame]', error);
    }
  };

  // ============= SUBSTITUTION LOGIC (two-phase) =============
  const handleInitiateSubstitution = (playerOutId: number, teamId: number) => {
    setSubstitutionMode({
      phase: 'selecting_bench',
      teamId,
      playerOutId,
    });
  };

  const handleCompleteSubstitution = async (playerInId: number) => {
    if (substitutionMode.phase !== 'selecting_bench') return;

    const playerOutId = substitutionMode.playerOutId;
    const teamId = substitutionMode.teamId;
    const currentGameClock = QUARTER_DURATION - timeLeft;

    try {
      await startTransition(async () => {
        await addSubstitutionRefactored(
          game.id,
          teamId,
          playerOutId,
          playerInId,
          currentGameClock
        );
      });

      // Optimistically update local state
      setGameState(prev => {
        const isHome = teamId === prev.homeTeam.teamId;
        const team = isHome ? prev.homeTeam : prev.awayTeam;

        const playerOut = team.players[playerOutId];
        const playerIn = team.players[playerInId];

        if (!playerOut || !playerIn) return prev;

        const updated = { ...team };
        updated.players = { ...team.players };

        // Player OUT: add played time, mark off-court
        if (playerOut.onCourt && playerOut.lastSubInTimestamp !== null) {
          const playedTime = currentGameClock - playerOut.lastSubInTimestamp;
          updated.players[playerOutId] = {
            ...playerOut,
            onCourt: false,
            timeOnCourtSeconds: playerOut.timeOnCourtSeconds + playedTime,
            lastSubInTimestamp: null,
          };
        } else {
          updated.players[playerOutId] = {
            ...playerOut,
            onCourt: false,
            lastSubInTimestamp: null,
          };
        }

        // Player IN: mark on-court, record entry time
        updated.players[playerInId] = {
          ...playerIn,
          onCourt: true,
          lastSubInTimestamp: currentGameClock,
        };

        return isHome
          ? { ...prev, homeTeam: updated }
          : { ...prev, awayTeam: updated };
      });

      // Reset substitution mode
      setSubstitutionMode({ phase: 'idle' });
    } catch (error) {
      console.error('[handleCompleteSub stitution]', error);
    }
  };

  // ============= ACTION HELPER =============
  const runAction = async (action: () => Promise<any>) => {
    try {
      const result = await action();
      setSelectedPlayerId(null);
      setEventType("normal");
    } catch (error) {
      console.error('[runAction]', error instanceof Error ? error.message : String(error));
    }
  };

  // ============= SELECTED PLAYER INFO =============
  const allPlayers = [
    ...Object.values(gameState.homeTeam.players),
    ...Object.values(gameState.awayTeam.players),
  ];
  const selectedPlayer = selectedPlayerId ? allPlayers.find(p => p.playerId === selectedPlayerId) : null;
  const selectedTeamId = selectedPlayer?.teamId ?? game.homeTeamId;
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
          <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{gameState.homeTeam.name}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#6b8caa" }}>
              Таймаут: <b style={{ color: "#e8a030" }}>{gameState.homeTimeouts}</b>/5
            </span>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: i < gameState.homeTimeouts ? "#f4cc5a" : "#3a4a5a",
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
            {gameState.homeScore} : {gameState.awayScore}
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
            {gameState.quarter} чверть
          </div>
        </div>

        {/* Away Team */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{gameState.awayTeam.name}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 2, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#6b8caa" }}>Таймаут: {gameState.awayTimeouts}/5</span>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: i < gameState.awayTimeouts ? "#f4cc5a" : "#3a4a5a",
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
        flexShrink: 0,
        alignItems: "center",
      }}>
        {isScheduled ? (
          <>
            <button
              onClick={handleStartGame}
              disabled={!canStartGame}
              style={{
                border: "none",
                borderRadius: 5,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: "700",
                cursor: canStartGame ? "pointer" : "not-allowed",
                background: canStartGame ? "#10b981" : "#4a5a6a",
                color: canStartGame ? "#fff" : "#8a9aaa",
              }}
            >
              ▶ Почати гру
            </button>
            <span style={{ fontSize: 10, color: "#6b8caa" }}>
              Вибрати 5 гравців на команду
            </span>
          </>
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

      {/* MAIN CONTENT */}
      {showGridView ? (
        <StatEntryGrid game={game} gameState={gameState} />
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
              gameState={gameState}
              teamSide="home"
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={setSelectedPlayerId}
              events={game.events}
              isScheduled={isScheduled}
              isLive={isLive}
              onToggleStarter={(playerId) => handleToggleStarter('home', playerId)}
              onInitiateSubstitution={handleInitiateSubstitution}
              substitutionMode={substitutionMode}
            />
          </div>

          {/* CENTER — Action buttons (same as before, kept for compatibility) */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            gap: 2, padding: 2, minHeight: 0
          }}>
            {/* Заміна модаль (если в режиме выбора) */}
            {substitutionMode.phase === 'selecting_bench' && (
              <div style={{
                background: "#1a2e40",
                border: "2px solid #f97316",
                borderRadius: 4,
                padding: 8,
                marginBottom: 8,
                color: "#fff",
                fontSize: 12,
              }}>
                <div style={{ marginBottom: 4, fontWeight: "bold" }}>
                  Виберіть гравця на скамейці для заміни:
                </div>
                <button
                  onClick={() => setSubstitutionMode({ phase: 'idle' })}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    background: "#6b7280",
                    color: "#fff",
                    border: "none",
                    borderRadius: 2,
                    cursor: "pointer",
                  }}
                >
                  Скасувати
                </button>
              </div>
            )}

            {/* Action Buttons Row 1 */}
            <div style={{ flex: "0 0 36px", display: "flex", gap: 2 }}>
              <button
                onClick={() => {
                  if (!selectedPlayerId) {
                    alert("Спочатку виберіть гравця на площадці");
                    return;
                  }
                  handleInitiateSubstitution(selectedPlayerId, selectedTeamId);
                }}
                disabled={!isLive || !selectedPlayerId}
                style={{ flex:1, height:"100%", background: (!isLive || !selectedPlayerId) ? "#1a2e40" : "#1a2e40", color: (!isLive || !selectedPlayerId) ? "#4a7fa5" : "#8ab8d0", fontSize:26, fontWeight:600, border:"none", borderRadius:3, cursor: (!isLive || !selectedPlayerId) ? "not-allowed" : "pointer", opacity: (!isLive || !selectedPlayerId) ? 0.5 : 1 }}
              >Замена</button>
              <button
                onClick={() => {
                  if (!selectedPlayerId) {
                    alert("Спочатку виберіть гравця");
                    return;
                  }
                  const player = allPlayers.find(p => p.playerId === selectedPlayerId);
                  if (player) {
                    startTransition(async () => {
                      await addTimeout(game.id, player.teamId);
                    });
                  }
                }}
                disabled={!selectedPlayerId || !isLive}
                style={{ flex:1, height:"100%", background: (!selectedPlayerId || !isLive) ? "#1a2e40" : "#3a2500", color: (!selectedPlayerId || !isLive) ? "#4a7fa5" : "#f4cc5a", fontSize:26, fontWeight:600, border:"none", borderRadius:3, cursor: (!selectedPlayerId || !isLive) ? "not-allowed" : "pointer", opacity: (!selectedPlayerId || !isLive) ? 0.5 : 1 }}
              >Тайм-аут</button>
              <button
                onClick={() => startTransition(() => undoLastEvent(game.id))}
                disabled={!isLive || game.events.length === 0}
                style={{ flex:1, height:"100%", background: (!isLive || game.events.length === 0) ? "#1a2e40" : "#3a2500", color: (!isLive || game.events.length === 0) ? "#4a7fa5" : "#f4cc5a", fontSize:26, fontWeight:600, border:"none", borderRadius:3, cursor: (!isLive || game.events.length === 0) ? "not-allowed" : "pointer", opacity: (!isLive || game.events.length === 0) ? 0.5 : 1 }}
              >↩ Відкат</button>
              <button
                onClick={() => setSubstitutionMode({ phase: 'idle' })}
                disabled={!isLive}
                style={{ flex:1, height:"100%", background: !isLive ? "#1a2e40" : "#1a2e40", color: !isLive ? "#4a7fa5" : "#8ab8d0", fontSize:26, fontWeight:600, border:"none", borderRadius:3, cursor: !isLive ? "not-allowed" : "pointer", opacity: !isLive ? 0.5 : 1 }}
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

            {/* Scoring buttons Row 2 */}
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
            </div>

            {/* Stats buttons Rows 3-5 */}
            <div style={{ flex: 1.2, display: "flex", gap: 2 }}>
              <button
                onClick={() => selectedPlayerId && runAction(() => addReboundDef(game.id, selectedTeamId, selectedPlayerId))}
                disabled={disabled}
                style={{ flex: 1, background: disabled ? "#1a2e40" : "#003300", color: disabled ? "#4a7fa5" : "#4ef472", fontWeight: 600, border: "none", borderRadius: 3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
              >Ріб. зах.</button>
              <button
                onClick={() => selectedPlayerId && runAction(() => addReboundOff(game.id, selectedTeamId, selectedPlayerId))}
                disabled={disabled}
                style={{ flex: 1, background: disabled ? "#1a2e40" : "#1a3a00", color: disabled ? "#4a7fa5" : "#7ef48e", fontWeight: 600, border: "none", borderRadius: 3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
              >Ріб. атак.</button>
              <button
                onClick={() => selectedPlayerId && runAction(() => addAssist(game.id, selectedTeamId, selectedPlayerId))}
                disabled={disabled}
                style={{ flex: 1, background: disabled ? "#1a2e40" : "#003333", color: disabled ? "#4a7fa5" : "#4ef4e4", fontWeight: 600, border: "none", borderRadius: 3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
              >Асист</button>
              <button
                onClick={() => selectedPlayerId && runAction(() => addSteal(game.id, selectedTeamId, selectedPlayerId))}
                disabled={disabled}
                style={{ flex: 1, background: disabled ? "#1a2e40" : "#1a1a3a", color: disabled ? "#4a7fa5" : "#7e8ef4", fontWeight: 600, border: "none", borderRadius: 3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
              >Перехоп</button>
              <button
                onClick={() => selectedPlayerId && runAction(() => addBlock(game.id, selectedTeamId, selectedPlayerId))}
                disabled={disabled}
                style={{ flex: 1, background: disabled ? "#1a2e40" : "#3a1a1a", color: disabled ? "#4a7fa5" : "#f47e4e", fontWeight: 600, border: "none", borderRadius: 3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
              >Блокування</button>
            </div>

            {/* Stats buttons Row 4 */}
            <div style={{ flex: 1, display: "flex", gap: 2 }}>
              <button
                onClick={() => selectedPlayerId && runAction(() => addTurnover(game.id, selectedTeamId, selectedPlayerId))}
                disabled={disabled}
                style={{ flex: 1, background: disabled ? "#1a2e40" : "#3a0000", color: disabled ? "#4a7fa5" : "#ef4444", fontWeight: 600, border: "none", borderRadius: 3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
              >Втрата</button>
              <button
                onClick={() => selectedPlayerId && runAction(() => addFoul(game.id, selectedTeamId, selectedPlayerId))}
                disabled={disabled}
                style={{ flex: 1, background: disabled ? "#1a2e40" : "#3a2200", color: disabled ? "#4a7fa5" : "#f4a644", fontWeight: 600, border: "none", borderRadius: 3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
              >Фол</button>
              <button
                onClick={() => selectedPlayerId && runAction(() => addMissFg2(game.id, selectedTeamId, selectedPlayerId))}
                disabled={disabled}
                style={{ flex: 1, background: disabled ? "#1a2e40" : "#3a0a00", color: disabled ? "#4a7fa5" : "#ff6b4a", fontWeight: 600, border: "none", borderRadius: 3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
              >Мс. 2</button>
              <button
                onClick={() => selectedPlayerId && runAction(() => addMissFg3(game.id, selectedTeamId, selectedPlayerId))}
                disabled={disabled}
                style={{ flex: 1, background: disabled ? "#1a2e40" : "#3a1500", color: disabled ? "#4a7fa5" : "#ff8a4a", fontWeight: 600, border: "none", borderRadius: 3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
              >Мс. 3</button>
              <button
                onClick={() => selectedPlayerId && runAction(() => addMissFt(game.id, selectedTeamId, selectedPlayerId))}
                disabled={disabled}
                style={{ flex: 1, background: disabled ? "#1a2e40" : "#3a1a00", color: disabled ? "#4a7fa5" : "#ffaa4a", fontWeight: 600, border: "none", borderRadius: 3, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
              >Мс. ШТ</button>
            </div>

            {/* Event type selection Row 5 */}
            <div style={{ flex: 0.8, display: "flex", gap: 2 }}>
              <button
                onClick={() => setEventType("normal")}
                style={{ flex: 1, background: eventType === "normal" ? "#003a3a" : "#1a2e40", color: eventType === "normal" ? "#4ef4e4" : "#4a7fa5", fontWeight: 600, border: "none", borderRadius: 3, cursor: "pointer" }}
              >Звичайний</button>
              <button
                onClick={() => setEventType("fastbreak")}
                style={{ flex: 1, background: eventType === "fastbreak" ? "#3a3a00" : "#1a2e40", color: eventType === "fastbreak" ? "#f4f44e" : "#4a7fa5", fontWeight: 600, border: "none", borderRadius: 3, cursor: "pointer" }}
              >Швидкої прорив</button>
              <button
                onClick={() => setEventType("second_chance")}
                style={{ flex: 1, background: eventType === "second_chance" ? "#3a1a00" : "#1a2e40", color: eventType === "second_chance" ? "#f4a44e" : "#4a7fa5", fontWeight: 600, border: "none", borderRadius: 3, cursor: "pointer" }}
              >2-й шанс</button>
              <button
                onClick={() => setEventType("off_turnover")}
                style={{ flex: 1, background: eventType === "off_turnover" ? "#3a001a" : "#1a2e40", color: eventType === "off_turnover" ? "#f44e7e" : "#4a7fa5", fontWeight: 600, border: "none", borderRadius: 3, cursor: "pointer" }}
              >Від втрати</button>
            </div>

            {/* Bench selection for substitution */}
            {substitutionMode.phase === 'selecting_bench' && (
              <div style={{
                flex: 1,
                background: "#0d1520",
                border: "2px solid #f97316",
                borderRadius: 4,
                padding: 8,
                overflowY: "auto",
                color: "#fff",
                fontSize: 11,
              }}>
                <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                  Гравці на скамейці:
                </div>
                {(() => {
                  const team = substitutionMode.teamId === gameState.homeTeam.teamId
                    ? gameState.homeTeam
                    : gameState.awayTeam;
                  const benchPlayers = Object.values(team.players)
                    .filter(p => !p.onCourt)
                    .sort((a, b) => a.number - b.number);

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {benchPlayers.map(p => (
                        <button
                          key={p.playerId}
                          onClick={() => handleCompleteSubstitution(p.playerId)}
                          style={{
                            background: "#1a3a1a",
                            border: "1px solid #4ef472",
                            color: "#4ef472",
                            padding: "6px 8px",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontWeight: 600,
                            textAlign: "left",
                          }}
                        >
                          #{p.number} {p.lastName}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* RIGHT — Away Players */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 0 }}>
            <RosterPanel
              gameState={gameState}
              teamSide="away"
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={setSelectedPlayerId}
              events={game.events}
              isScheduled={isScheduled}
              isLive={isLive}
              onToggleStarter={(playerId) => handleToggleStarter('away', playerId)}
              onInitiateSubstitution={handleInitiateSubstitution}
              substitutionMode={substitutionMode}
            />
          </div>
        </div>
      )}

      {/* EVENT LOG (at bottom) */}
      <div style={{
        height: "120px",
        background: "#1a2737",
        borderTop: "1px solid #2a3e52",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0
      }}>
        <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: "600", color: "#8ab8d0", background: "#0d1520", borderBottom: "1px solid #1a2e40" }}>
          Останні подій ({game.events.length})
        </div>
        <div
          ref={logContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            fontSize: "10px",
            color: "#c8d8e8",
            padding: "4px 8px",
            lineHeight: "1.4"
          }}
        >
          {recentEvents.length === 0 ? (
            <div style={{ color: "#6b8caa" }}>Немає подій</div>
          ) : (
            recentEvents.map((event, i) => (
              <div key={i} style={{ marginBottom: "2px", borderBottom: "1px solid #2a3e52", paddingBottom: "2px" }}>
                <span style={{ color: "#f4a644" }}>Q{event.quarter}</span> {event.player?.lastName || "Team"}: {event.type}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
