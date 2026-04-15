"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { nextQuarter, endGame, startGame, undoLastEvent, addAssist, addSteal, addReboundOff, addReboundDef, addBlock, addTurnover, addScore, addMissFt, addMissFg2, addMissFg3, addFoul, addFoulTechnical, addFoulUnsportsmanlike } from "@/actions/game";
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

  // Pending для server actions
  const [actionPending, setActionPending] = useState(false);
  const [pending, startTransition] = useTransition();

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

        {/* Bottom row: Buttons */}
        <div className="flex items-center justify-center gap-1 flex-wrap">
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
          <div className="text-white font-bold text-xs leading-tight mb-0.5">
            {game.homeTeam.name}
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            {homePlayers.length > 0 ? (
              homePlayers.map((player) => {
                const isSelected = selectedPlayerId === player.id;
                return (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={`w-full text-left px-1 py-0.5 rounded text-xs leading-tight font-medium transition-all flex-shrink-0 text-white ${
                      isSelected
                        ? "ring-1 font-bold"
                        : "hover:bg-white/10"
                    }`}
                    style={{
                      backgroundColor: isSelected ? "rgba(249, 115, 22, 0.6)" : "transparent",
                      color: isSelected ? "#ffffff" : "#ffffff",
                    }}
                  >
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

          {/* Row 3: Scoring (1pt, 2pt, 3pt) + Misses (×1, ×2, ×3) */}
          <div className="flex gap-0.5 justify-center">
            <button
              onClick={() => selectedPlayerId && runAction(() => addScore(game.id, selectedTeamId, selectedPlayerId, 1))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: blueBtn }}
              title="Вільний кидок"
            >
              +1
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addScore(game.id, selectedTeamId, selectedPlayerId, 2))}
              disabled={disabled}
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm hover:shadow-md hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: blueBtn }}
              title="2-очковий"
            >
              +2
            </button>

            <button
              onClick={() => selectedPlayerId && runAction(() => addScore(game.id, selectedTeamId, selectedPlayerId, 3))}
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

          {/* Row 4: Fouls (Personal, Technical, Unsportsmanlike) + Undo */}
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
          <div className="text-gray-800 font-bold text-xs leading-tight mb-0.5">
            {game.awayTeam.name}
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            {awayPlayers.length > 0 ? (
              awayPlayers.map((player) => {
                const isSelected = selectedPlayerId === player.id;
                return (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={`w-full text-left px-1 py-0.5 rounded text-xs leading-tight font-medium transition-all flex-shrink-0 text-gray-800 ${
                      isSelected
                        ? "ring-1 font-bold"
                        : "hover:bg-gray-200"
                    }`}
                    style={{
                      backgroundColor: isSelected ? "rgba(249, 115, 22, 0.25)" : "transparent",
                      color: "#1f2937",
                    }}
                  >
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
    </div>
  );
}
