"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { nextQuarter, endGame, startGame, undoLastEvent } from "@/actions/game";
import ActionButtons from "./ActionButtons";
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

export default function LiveScoreTracker({ game }: { game: GameWithAll }) {
  const [activeTeamId, setActiveTeamId] = useState<number>(game.homeTeamId);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  // Timer state
  const [timeLeft, setTimeLeft] = useState(QUARTER_DURATION);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quarterRef = useRef(game.quarter);

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

  const activePlayers =
    activeTeamId === game.homeTeamId ? game.homeTeam.players : game.awayTeam.players;

  const handleTeamSelect = (teamId: number) => {
    setActiveTeamId(teamId);
    setSelectedPlayerId(null);
  };

  const handleNextQuarter = () => {
    stopTimer();
    setTimeLeft(QUARTER_DURATION);
    startTransition(() => nextQuarter(game.id));
  };

  return (
    <div className="space-y-6">
      {/* Scoreboard */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div
          className="px-6 py-3 flex items-center justify-between text-white text-sm"
          style={{ backgroundColor: "#1a2744" }}
        >
          <span className="font-bold">
            {isLive ? `LIVE — Q${game.quarter}` : isScheduled ? "Заплановано" : "ФІНАЛ"}
          </span>
          <div className="flex gap-2">
            {isLive && game.quarter < 4 && (
              <button
                onClick={handleNextQuarter}
                disabled={pending}
                className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                Наступна чверть →
              </button>
            )}
            {isScheduled && (
              <button
                onClick={() => startTransition(() => startGame(game.id))}
                disabled={pending}
                className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                Почати матч
              </button>
            )}
            {isLive && (
              <button
                onClick={() => {
                  if (confirm("Завершити матч?")) {
                    stopTimer();
                    startTransition(() => endGame(game.id));
                  }
                }}
                disabled={pending}
                className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                Завершити матч
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <div className="font-black text-lg text-gray-800">{game.homeTeam.name}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black" style={{ color: "#1a2744" }}>
                {game.homeScore} : {game.awayScore}
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="font-black text-lg text-gray-800">{game.awayTeam.name}</div>
            </div>
          </div>

          {/* Timer */}
          {isLive && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <span
                className="text-3xl font-mono font-black tabular-nums"
                style={{ color: timeLeft === 0 ? "#ef4444" : "#1a2744" }}
              >
                {formatTime(timeLeft)}
              </span>
              <div className="flex gap-2">
                {!timerRunning ? (
                  <button
                    onClick={startTimer}
                    disabled={timeLeft === 0}
                    className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-40"
                  >
                    ▶ Старт
                  </button>
                ) : (
                  <button
                    onClick={stopTimer}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors"
                  >
                    ⏸ Пауза
                  </button>
                )}
                <button
                  onClick={() => { stopTimer(); setTimeLeft(QUARTER_DURATION); }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors"
                >
                  ↺ Скинути
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLive && (
        <>
          {/* Team selector */}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">
              Активна команда:
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[game.homeTeam, game.awayTeam].map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleTeamSelect(team.id)}
                  className={`py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${
                    activeTeamId === team.id
                      ? "text-white border-transparent"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
                  style={
                    activeTeamId === team.id ? { backgroundColor: "#1a2744", borderColor: "#1a2744" } : {}
                  }
                >
                  {team.name}
                </button>
              ))}
            </div>
          </div>

          {/* Player selector */}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">
              Гравець:
            </div>
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "#1a2744" } as React.CSSProperties}
              value={selectedPlayerId ?? ""}
              onChange={(e) => setSelectedPlayerId(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Оберіть гравця...</option>
              {activePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.number} {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <ActionButtons
            gameId={game.id}
            teamId={activeTeamId}
            playerId={selectedPlayerId}
            disabled={pending}
          />

          {/* Undo button */}
          {game.events.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (confirm("Відмінити останню дію?")) {
                    startTransition(() => undoLastEvent(game.id));
                  }
                }}
                disabled={pending}
                className="flex items-center gap-2 bg-gray-100 hover:bg-red-50 border border-gray-200 hover:border-red-300 text-gray-600 hover:text-red-600 text-sm px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-40"
              >
                ↩ Відмінити останню дію
              </button>
            </div>
          )}
        </>
      )}

      {/* Action log */}
      <ActionLog
        events={game.events}
        homeTeam={game.homeTeam}
        awayTeam={game.awayTeam}
        homeScore={game.homeScore}
        awayScore={game.awayScore}
      />
    </div>
  );
}
