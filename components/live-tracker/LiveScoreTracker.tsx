"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { nextQuarter, endGame, startGame, undoLastEvent, addAssist, addSteal, addReboundOff, addReboundDef, addBlock, addTurnover, addScore, addMissFt, addMissFg2, addMissFg3, addFoul, addFoulTechnical, addFoulUnsportsmanlike, addScoreWithType, updateOnCourt, addSubstitution } from "@/actions/game";
import ActionLog from "./ActionLog";
import type { Game, Team, Player, GameEvent } from "@prisma/client";

type GameWithAll = Game & {
  homeTeam: Team & { players: Player[] };
  awayTeam: Team & { players: Player[] };
  events: (GameEvent & {
    player: Pick<Player, "firstName" | "lastName" | "number"> | null;
  })[];
};

const QUARTER_DURATION = 10 * 60; // 600 seconds

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function truncateName(firstName: string, lastName: string): string {
  const first = firstName.length > 10 ? firstName.substring(0, 10) : firstName;
  const last = lastName.length > 10 ? lastName.substring(0, 10) : lastName;
  return `${first} ${last}`;
}

export default function LiveScoreTracker({ game, btnBlue, btnOrange, btnNavy, btnRed }: {
  game: GameWithAll;
  btnBlue?: string;
  btnOrange?: string;
  btnNavy?: string;
  btnRed?: string;
}) {
  // Timer state
  const [timeLeft, setTimeLeft] = useState(QUARTER_DURATION);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quarterRef = useRef(game.quarter);

  // Player selection
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // Event type selector
  const [eventType, setEventType] = useState<"normal" | "fastbreak" | "second_chance" | "off_turnover">("normal");

  // Substitution modal state
  const [showSubModal, setShowSubModal] = useState(false);
  const [subPlayerOut, setSubPlayerOut] = useState<number | null>(null);
  const [subPlayerIn, setSubPlayerIn] = useState<number | null>(null);

  // Fouls and timeouts tracking
  const [homeFouls, setHomeFouls] = useState<number>(0);
  const [awayFouls, setAwayFouls] = useState<number>(0);
  const [homeTimeouts, setHomeTimeouts] = useState<number>(2);
  const [awayTimeouts, setAwayTimeouts] = useState<number>(2);

  // On-court players tracking
  const [onCourtHome, setOnCourtHome] = useState<Set<number>>(new Set());
  const [onCourtAway, setOnCourtAway] = useState<Set<number>>(new Set());

  // Pending для server actions
  const [actionPending, setActionPending] = useState(false);
  const [pending, startTransition] = useTransition();

  // Initialize on-court players from GameOnCourt data on load
  useEffect(() => {
    // This would come from the database, but for now we'll set default starters
    if (game.status === "SCHEDULED" && onCourtHome.size === 0) {
      const homeStarters = game.homeTeam.players.slice(0, 5).map(p => p.id);
      const awayStarters = game.awayTeam.players.slice(0, 5).map(p => p.id);
      setOnCourtHome(new Set(homeStarters));
      setOnCourtAway(new Set(awayStarters));
      // Initialize on-court status in DB
      homeStarters.forEach(playerId => {
        startTransition(() => updateOnCourt(game.id, playerId, game.homeTeamId, true));
      });
      awayStarters.forEach(playerId => {
        startTransition(() => updateOnCourt(game.id, playerId, game.awayTeamId, true));
      });
    }
  }, [game.id, game.status, game.homeTeamId, game.awayTeamId, game.homeTeam.players, game.awayTeam.players, onCourtHome.size, startTransition]);

  // Reset timer when quarter changes
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

  const isLive = game.status === "LIVE";
  const isScheduled = game.status === "SCHEDULED";

  const handleNextQuarter = () => {
    stopTimer();
    setTimeLeft(QUARTER_DURATION);
    startTransition(() => nextQuarter(game.id));
  };

  // Helper функція для запуску дій
  const runAction = async (action: () => Promise<any>) => {
    setActionPending(true);
    try {
      await action();
      setSelectedPlayerId(null); // Скидаємо гравця після дії
    } finally {
      setActionPending(false);
    }
  };

  const disabled = !selectedPlayerId || actionPending || pending;

  // Colors
  const homeColor = btnNavy || "#1a2744";
  const accentColor = btnOrange || "#f97316";
  const blueBtn = btnBlue || "#3b82f6";
  const redBtn = btnRed || "#ef4444";

  // Players sorted by number
  const homePlayers = [...game.homeTeam.players].sort((a, b) => a.number - b.number);
  const awayPlayers = [...game.awayTeam.players].sort((a, b) => a.number - b.number);

  // Get selected player details
  const selectedPlayer = selectedPlayerId
    ? [...homePlayers, ...awayPlayers].find((p) => p.id === selectedPlayerId)
    : null;
  const selectedTeamId = selectedPlayer
    ? selectedPlayer.teamId
    : game.homeTeamId;

  return (
    <div className="flex flex-col bg-white overflow-hidden" style={{ height: "100vh", marginTop: 0, paddingTop: 0 }}>
      {/* ══════════════════════════════════════════════════════════════════════
          HEADER (LIVE - Q1, teams, score, timer, controls) — FIXED HEIGHT, 0 MARGIN
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="flex-shrink-0 px-3 py-1 text-white flex flex-col gap-0.5"
        style={{ backgroundColor: homeColor, margin: 0, padding: "0.25rem 0.75rem" }}
      >
        {/* Top row: Status, Teams, Score, Timer */}
        <div className="flex items-center justify-between gap-2 text-xs">
          {/* Status badge */}
          <div className="font-bold text-xs whitespace-nowrap">
            {isLive ? `🔴 LIVE — Q${game.quarter}` : isScheduled ? "⏱ ЗАПЛАНОВАНО" : "✓ ФІНАЛ"}
          </div>

          {/* Teams and Score */}
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="text-xs font-bold text-center flex-1 line-clamp-1">
              {game.homeTeam.name}
            </div>
            <div className="text-lg font-black tabular-nums whitespace-nowrap">
              {game.homeScore}:{game.awayScore}
            </div>
            <div className="text-xs font-bold text-center flex-1 line-clamp-1">
              {game.awayTeam.name}
            </div>
          </div>

          {/* Timer */}
          <div className="font-mono text-base font-black text-center w-12 whitespace-nowrap">
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Bottom row: Buttons and Counters */}
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center justify-center gap-1 flex-wrap flex-1">
            {isScheduled ? (
              <button
                onClick={() => startTransition(() => startGame(game.id))}
                disabled={pending}
                className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-bold transition-colors disabled:opacity-50"
              >
                ▶ Почати
              </button>
            ) : isLive ? (
              <>
                <button
                  onClick={timerRunning ? stopTimer : startTimer}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-0.5 rounded-full font-bold transition-colors"
                >
                  {timerRunning ? "⏸ Пауза" : "▶ Старт"}
                </button>
                {game.quarter < 4 && (
                  <button
                    onClick={handleNextQuarter}
                    disabled={pending}
                    className="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-0.5 rounded-full font-bold transition-colors disabled:opacity-50"
                  >
                    → Наст.
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm("Завершити матч?")) {
                      stopTimer();
                      startTransition(() => endGame(game.id));
                    }
                  }}
                  disabled={pending}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold transition-colors disabled:opacity-50"
                >
                  Завершити
                </button>
              </>
            ) : null}
          </div>

          {/* Fouls and Timeouts Counters */}
          {isLive && (
            <div className="flex items-center gap-1.5 text-white text-xs font-bold">
              <div className="flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded-full">
                <span>ФОЛ:</span>
                <span>{homeFouls}</span>
              </div>
              <div className="flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded-full">
                <span>⏱:</span>
                <span>{homeTimeouts}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT (Players | Buttons | Players) — FLEX-1
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex gap-1 min-h-0 overflow-hidden bg-white p-1">
        {/* LEFT PANEL — HOME TEAM PLAYERS */}
        <div
          className="rounded p-1 flex flex-col overflow-hidden basis-1/3 text-white"
          style={{ backgroundColor: homeColor }}
        >
          <div className="text-white font-bold text-xs leading-tight mb-0.5 flex items-center justify-between">
            <span>{game.homeTeam.name}</span>
            <span className="text-green-300 text-xs">⚫ {onCourtHome.size}</span>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            {homePlayers.length > 0 ? (
              homePlayers.map((player) => {
                const isSelected = selectedPlayerId === player.id;
                const isOnCourt = onCourtHome.has(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={`w-full text-left px-1 py-0.5 rounded text-xs leading-tight font-medium transition-all flex-shrink-0 text-white flex items-center gap-1 ${
                      isSelected
                        ? "ring-1 font-bold"
                        : "hover:bg-white/10"
                    }`}
                    style={{
                      backgroundColor: isSelected ? "rgba(249, 115, 22, 0.6)" : isOnCourt ? "rgba(34, 197, 94, 0.2)" : "transparent",
                      color: isSelected ? "#ffffff" : "#ffffff",
                    }}
                  >
                    {isOnCourt && <span className="text-green-300 text-xs">●</span>}
                    <span className="font-bold">#{player.number}</span> {truncateName(player.firstName, player.lastName)}
                  </button>
                );
              })
            ) : (
              <div className="text-xs text-white/70">Гравців немає</div>
            )}
          </div>
        </div>

        {/* CENTER PANEL — ACTION BUTTONS (4 rows) */}
        <div className="rounded bg-gray-50 p-1 flex flex-col gap-0.5 basis-1/3 overflow-hidden justify-center">
          {/* Row 1: Stats (Assist, Steal, Rebound Off, Rebound Def) */}
          <div className="flex gap-0.5 justify-center">
            <button
              onClick={() => selectedPlayerId && runAction(() => addAssist(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#10b981" }}
              title="Передача"
            >
              <div className="text-xs font-bold">Передача</div>
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addSteal(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#8b5cf6" }}
              title="Перехват"
            >
              <div className="text-xs font-bold">Перехват</div>
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addReboundOff(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#f59e0b" }}
              title="Підбір (напад)"
            >
              <div className="text-xs font-bold leading-tight">Підбір</div>
              <div className="text-xs font-bold leading-tight">(н)</div>
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addReboundDef(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: blueBtn }}
              title="Підбір (захист)"
            >
              <div className="text-xs font-bold leading-tight">Підбір</div>
              <div className="text-xs font-bold leading-tight">(з)</div>
            </button>
          </div>

          {/* Row 2: More stats (Block, Turnover) */}
          <div className="flex gap-0.5 justify-center">
            <button
              onClick={() => selectedPlayerId && runAction(() => addBlock(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#f97316" }}
              title="Блок"
            >
              <div className="text-xs font-bold">Блок</div>
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addTurnover(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#ec4899" }}
              title="Втрата"
            >
              <div className="text-xs font-bold">Втрата</div>
            </button>
          </div>

          {/* Row 3a: Event Type Selector */}
          <div className="flex gap-0.5 justify-center">
            {["normal", "fastbreak", "second_chance", "off_turnover"].map((type) => (
              <button
                key={type}
                onClick={() => setEventType(type as any)}
                className={`flex-1 px-1 py-1 rounded text-xs font-bold transition-all text-white ${
                  eventType === type ? "ring-1 ring-white" : "hover:opacity-80"
                }`}
                style={{
                  backgroundColor:
                    type === "normal" ? blueBtn :
                    type === "fastbreak" ? "#10b981" :
                    type === "second_chance" ? "#f59e0b" :
                    "#ec4899",
                }}
                title={type === "normal" ? "Звичайний" : type === "fastbreak" ? "Відрив" : type === "second_chance" ? "Другий шанс" : "Після втрат"}
              >
                {type === "normal" && "Звич"}
                {type === "fastbreak" && "⚡Відр"}
                {type === "second_chance" && "🔄Шанс"}
                {type === "off_turnover" && "💥Втр"}
              </button>
            ))}
          </div>

          {/* Row 3b: Scoring (1pt, 2pt, 3pt) + Misses (×1, ×2, ×3) */}
          <div className="flex gap-0.5 justify-center">
            <button
              onClick={() => selectedPlayerId && runAction(() => addScoreWithType(game.id, selectedTeamId, selectedPlayerId, 1, eventType))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: blueBtn }}
              title="Вільний кидок"
            >
              +1
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addScoreWithType(game.id, selectedTeamId, selectedPlayerId, 2, eventType))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: blueBtn }}
              title="2-очковий"
            >
              +2
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addScoreWithType(game.id, selectedTeamId, selectedPlayerId, 3, eventType))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: accentColor }}
              title="3-очковий"
            >
              +3
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addMissFt(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#9ca3af" }}
              title="Промах вільного"
            >
              <div className="text-xs font-bold leading-tight">✕</div>
              <div className="text-xs font-bold leading-tight">1</div>
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addMissFg2(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#9ca3af" }}
              title="Промах 2п"
            >
              <div className="text-xs font-bold leading-tight">✕</div>
              <div className="text-xs font-bold leading-tight">2</div>
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addMissFg3(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#9ca3af" }}
              title="Промах 3п"
            >
              <div className="text-xs font-bold leading-tight">✕</div>
              <div className="text-xs font-bold leading-tight">3</div>
            </button>
          </div>

          {/* Row 4: Fouls (Personal, Technical, Unsportsmanlike) + Substitution/Timeout + Undo */}
          <div className="flex gap-0.5 justify-center">
            <button
              onClick={() => selectedPlayerId && runAction(() => addFoul(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: redBtn }}
              title="Персональний фол"
            >
              <div className="text-xs font-bold">Перс</div>
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addFoulTechnical(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#b91c1c" }}
              title="Технічний фол"
            >
              <div className="text-xs font-bold">Тех</div>
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addFoulUnsportsmanlike(game.id, selectedTeamId, selectedPlayerId))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#7f1d1d" }}
              title="Неспортивний фол"
            >
              <div className="text-xs font-bold leading-tight">Неспор</div>
              <div className="text-xs font-bold leading-tight">т</div>
            </button>

            <button
              onClick={() => setShowSubModal(!showSubModal)}
              disabled={!isLive || actionPending || pending}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#06b6d4" }}
              title="Заміна гравця"
            >
              <div className="text-lg">↕</div>
              <div className="text-xs font-bold">Замін</div>
            </button>

            <button
              onClick={() => homeTimeouts > 0 && setHomeTimeouts(homeTimeouts - 1)}
              disabled={!isLive || actionPending || pending || homeTimeouts === 0}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#f59e0b" }}
              title="Тайм-аут"
            >
              <div className="text-xs font-bold">⏱</div>
              <div className="text-xs font-bold">{homeTimeouts}</div>
            </button>

            <button
              onClick={() => startTransition(() => undoLastEvent(game.id))}
              disabled={actionPending || pending || game.events.length === 0}
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: "#6b7280" }}
              title="Відмінити останню дію"
            >
              <div className="text-lg">↩</div>
            </button>
          </div>
        </div>

        {/* RIGHT PANEL — AWAY TEAM PLAYERS */}
        <div className="rounded p-1 flex flex-col overflow-hidden basis-1/3 bg-gray-100 text-gray-800">
          <div className="text-gray-800 font-bold text-xs leading-tight mb-0.5 flex items-center justify-between">
            <span>{game.awayTeam.name}</span>
            <span className="text-green-600 text-xs">⚫ {onCourtAway.size}</span>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            {awayPlayers.length > 0 ? (
              awayPlayers.map((player) => {
                const isSelected = selectedPlayerId === player.id;
                const isOnCourt = onCourtAway.has(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={`w-full text-left px-1 py-0.5 rounded text-xs leading-tight font-medium transition-all flex-shrink-0 text-gray-800 flex items-center gap-1 ${
                      isSelected
                        ? "ring-1 font-bold"
                        : "hover:bg-gray-200"
                    }`}
                    style={{
                      backgroundColor: isSelected ? "rgba(249, 115, 22, 0.25)" : isOnCourt ? "rgba(34, 197, 94, 0.15)" : "transparent",
                      color: "#1f2937",
                    }}
                  >
                    {isOnCourt && <span className="text-green-600 text-xs">●</span>}
                    <span className="font-bold">#{player.number}</span> {truncateName(player.firstName, player.lastName)}
                  </button>
                );
              })
            ) : (
              <div className="text-xs text-gray-500">Гравців немає</div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ACTION LOG (bottom, compact) — FLEX-SHRINK-0
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 border-t border-gray-300 flex flex-col bg-white overflow-hidden" style={{ height: "160px" }}>
        <div className="flex-1 overflow-y-auto p-1 bg-white text-xs">
          <ActionLog
            events={game.events}
            homeTeam={game.homeTeam}
            awayTeam={game.awayTeam}
            homeScore={game.homeScore}
            awayScore={game.awayScore}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SUBSTITUTION MODAL — OVERLAY
          ══════════════════════════════════════════════════════════════════════ */}
      {showSubModal && isLive && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">Заміна гравця</h2>
              <button
                onClick={() => setShowSubModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Select player OUT (from on-court) */}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Гравець НА ВИХОДІ (з поля)</label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded">
                  {selectedTeamId === game.homeTeamId
                    ? homePlayers.filter(p => onCourtHome.has(p.id)).map(player => (
                        <button
                          key={player.id}
                          onClick={() => setSubPlayerOut(player.id)}
                          className={`w-full text-left px-2 py-1.5 text-xs font-medium transition-all ${
                            subPlayerOut === player.id
                              ? "bg-orange-100 text-orange-700 font-bold"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          #{player.number} {player.firstName} {player.lastName}
                        </button>
                      ))
                    : awayPlayers.filter(p => onCourtAway.has(p.id)).map(player => (
                        <button
                          key={player.id}
                          onClick={() => setSubPlayerOut(player.id)}
                          className={`w-full text-left px-2 py-1.5 text-xs font-medium transition-all ${
                            subPlayerOut === player.id
                              ? "bg-orange-100 text-orange-700 font-bold"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          #{player.number} {player.firstName} {player.lastName}
                        </button>
                      ))
                  }
                </div>
              </div>

              {/* Select player IN (from bench) */}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Гравець НА ВХОДІ (з лавки)</label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded">
                  {selectedTeamId === game.homeTeamId
                    ? homePlayers.filter(p => !onCourtHome.has(p.id)).map(player => (
                        <button
                          key={player.id}
                          onClick={() => setSubPlayerIn(player.id)}
                          className={`w-full text-left px-2 py-1.5 text-xs font-medium transition-all ${
                            subPlayerIn === player.id
                              ? "bg-green-100 text-green-700 font-bold"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          #{player.number} {player.firstName} {player.lastName}
                        </button>
                      ))
                    : awayPlayers.filter(p => !onCourtAway.has(p.id)).map(player => (
                        <button
                          key={player.id}
                          onClick={() => setSubPlayerIn(player.id)}
                          className={`w-full text-left px-2 py-1.5 text-xs font-medium transition-all ${
                            subPlayerIn === player.id
                              ? "bg-green-100 text-green-700 font-bold"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          #{player.number} {player.firstName} {player.lastName}
                        </button>
                      ))
                  }
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowSubModal(false);
                    setSubPlayerOut(null);
                    setSubPlayerIn(null);
                  }}
                  className="flex-1 px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs transition-colors"
                >
                  Скасувати
                </button>
                <button
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
                        // Update on-court state
                        if (selectedTeamId === game.homeTeamId) {
                          const newOnCourt = new Set(onCourtHome);
                          newOnCourt.delete(subPlayerOut);
                          newOnCourt.add(subPlayerIn);
                          setOnCourtHome(newOnCourt);
                        } else {
                          const newOnCourt = new Set(onCourtAway);
                          newOnCourt.delete(subPlayerOut);
                          newOnCourt.add(subPlayerIn);
                          setOnCourtAway(newOnCourt);
                        }
                        setShowSubModal(false);
                        setSubPlayerOut(null);
                        setSubPlayerIn(null);
                      });
                    }
                  }}
                  disabled={!subPlayerOut || !subPlayerIn || actionPending}
                  className="flex-1 px-3 py-1.5 rounded bg-green-500 hover:bg-green-600 text-white font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Замінити
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
