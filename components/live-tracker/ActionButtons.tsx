"use client";

import { useTransition } from "react";
import { addScore, addFoul, addRebound, addAssist, addSteal, addBlock } from "@/actions/game";

interface Props {
  gameId: number;
  teamId: number;
  playerId: number | null;
  disabled?: boolean;
  btnBlue?: string;
  btnOrange?: string;
  btnNavy?: string;
  btnRed?: string;
}

export default function ActionButtons({ gameId, teamId, playerId, disabled, btnBlue = "#3b82f6", btnOrange = "#f97316", btnNavy = "#1a2744", btnRed = "#ef4444" }: Props) {
  const [pending, startTransition] = useTransition();

  const isDisabled = disabled || pending || !playerId;

  const handleScore = (points: 1 | 2 | 3) => {
    if (!playerId) return;
    startTransition(() => addScore(gameId, teamId, playerId, points));
  };

  const handleFoul = () => {
    if (!playerId) return;
    startTransition(() => addFoul(gameId, teamId, playerId));
  };

  const handleRebound = () => {
    if (!playerId) return;
    startTransition(() => addRebound(gameId, teamId, playerId));
  };

  const handleAssist = () => {
    if (!playerId) return;
    startTransition(() => addAssist(gameId, teamId, playerId));
  };

  const handleSteal = () => {
    if (!playerId) return;
    startTransition(() => addSteal(gameId, teamId, playerId));
  };

  const handleBlock = () => {
    if (!playerId) return;
    startTransition(() => addBlock(gameId, teamId, playerId));
  };

  const btn = (
    label: string,
    onClick: () => void,
    bg: string,
    fullWidth = false
  ) => (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${fullWidth ? "w-full" : ""} py-4 rounded-xl font-bold text-base text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
      style={{ backgroundColor: bg }}
    >
      {pending ? "..." : label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Score block */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Очки</div>
        <div className="grid grid-cols-2 gap-3">
          {btn("+1 Штрафний", () => handleScore(1), btnBlue)}
          {btn("+2 Двоочковий", () => handleScore(2), btnOrange)}
        </div>
        <div className="mt-3">
          {btn("+3 Триочковий", () => handleScore(3), btnNavy, true)}
        </div>
        <div className="mt-3">
          {btn("Фол", handleFoul, btnRed, true)}
        </div>
      </div>

      {/* Stats block */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Статистика гравця</div>
        <div className="grid grid-cols-2 gap-3">
          {btn("Підбір", handleRebound, "#64748b")}
          {btn("Передача", handleAssist, "#22c55e")}
          {btn("Перехват", handleSteal, "#a855f7")}
          {btn("Блокшот", handleBlock, "#f59e0b")}
        </div>
      </div>
    </div>
  );
}
