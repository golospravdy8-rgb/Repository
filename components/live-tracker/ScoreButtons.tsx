"use client";

import { useTransition } from "react";
import { addScore, addFoul } from "@/actions/game";

interface Props {
  gameId: number;
  teamId: number;
  playerId: number | null;
  disabled?: boolean;
}

export default function ScoreButtons({ gameId, teamId, playerId, disabled }: Props) {
  const [pending, startTransition] = useTransition();

  const handleScore = (points: 1 | 2 | 3) => {
    if (!playerId) return;
    startTransition(async () => { await addScore(gameId, teamId, playerId, points); });
  };

  const handleFoul = () => {
    if (!playerId) return;
    startTransition(async () => { await addFoul(gameId, teamId, playerId); });
  };

  const isDisabled = disabled || pending || !playerId;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleScore(1)}
          disabled={isDisabled}
          className="py-4 rounded-xl font-bold text-lg text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#3b82f6" }}
        >
          +1 Штрафний
        </button>
        <button
          onClick={() => handleScore(2)}
          disabled={isDisabled}
          className="py-4 rounded-xl font-bold text-lg text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#f97316" }}
        >
          +2 Двоочковий
        </button>
      </div>
      <button
        onClick={() => handleScore(3)}
        disabled={isDisabled}
        className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#1a2744" }}
      >
        +3 Триочковий
      </button>
      <button
        onClick={handleFoul}
        disabled={isDisabled}
        className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-red-500 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Фол
      </button>
    </div>
  );
}
