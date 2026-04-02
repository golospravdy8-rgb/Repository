"use client";

import { useState } from "react";
import {
  addScore,
  addFoul,
  addFoulTechnical,
  addFoulUnsportsmanlike,
  addRebound,
  addReboundOff,
  addReboundDef,
  addAssist,
  addSteal,
  addBlock,
  addTurnover,
  addMissFg2,
  addMissFg3,
  addMissFt,
} from "@/actions/game";
import { BADGES } from "@/lib/achievements";

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

export default function ActionButtons({
  gameId,
  teamId,
  playerId,
  disabled,
  btnBlue = "#3b82f6",
  btnOrange = "#f97316",
  btnNavy = "#1a2744",
  btnRed = "#ef4444",
}: Props) {
  const [pending, setPending] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  const isDisabled = disabled || pending || !playerId;

  function showAchievementToasts(newIds: string[]) {
    if (!newIds.length) return;
    const now = Date.now();
    const items = newIds.map((id, i) => {
      const badge = BADGES.find((b) => b.id === id);
      return { id: now + i, text: `🏆 Нове досягнення: ${badge ? badge.icon + " " + badge.name : id}!` };
    });
    setToasts((prev) => [...prev, ...items]);
    items.forEach((item) => {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 4000);
    });
  }

  async function run(action: () => Promise<{ newAchievements: string[] } | void>) {
    if (!playerId) return;
    setPending(true);
    try {
      const result = await action();
      if (result && result.newAchievements?.length) {
        showAchievementToasts(result.newAchievements);
      }
    } finally {
      setPending(false);
    }
  }

  const btn = (label: string, onClick: () => void, bg: string, fullWidth = false) => (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${fullWidth ? "w-full" : ""} py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
      style={{ backgroundColor: bg }}
    >
      {pending ? "..." : label}
    </button>
  );

  return (
    <div className="space-y-4 relative">
      {/* Achievement toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-yellow-400 text-yellow-900 font-bold px-4 py-3 rounded-xl shadow-lg text-sm animate-bounce"
            >
              {toast.text}
            </div>
          ))}
        </div>
      )}

      {/* ОЧКИ */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Очки</div>
        <div className="grid grid-cols-3 gap-2">
          {btn("+1 ШТ", () => run(() => addScore(gameId, teamId, playerId!, 1)), btnBlue)}
          {btn("+2", () => run(() => addScore(gameId, teamId, playerId!, 2)), btnOrange)}
          {btn("+3", () => run(() => addScore(gameId, teamId, playerId!, 3)), btnNavy)}
        </div>
      </div>

      {/* ПРОМАХИ */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Промахи</div>
        <div className="grid grid-cols-3 gap-2">
          {btn("×ШТ", () => run(() => addMissFt(gameId, teamId, playerId!)), "#94a3b8")}
          {btn("×2О", () => run(() => addMissFg2(gameId, teamId, playerId!)), "#94a3b8")}
          {btn("×3О", () => run(() => addMissFg3(gameId, teamId, playerId!)), "#94a3b8")}
        </div>
      </div>

      {/* ПІДБОРИ */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Підбори</div>
        <div className="grid grid-cols-2 gap-2">
          {btn("🏀 Напад (OFF)", () => run(() => addReboundOff(gameId, teamId, playerId!)), "#f59e0b")}
          {btn("🛡️ Захист (DEF)", () => run(() => addReboundDef(gameId, teamId, playerId!)), "#64748b")}
        </div>
      </div>

      {/* СТАТ */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Статистика</div>
        <div className="grid grid-cols-2 gap-2">
          {btn("🎯 Передача", () => run(() => addAssist(gameId, teamId, playerId!)), "#22c55e")}
          {btn("✋ Перехват", () => run(() => addSteal(gameId, teamId, playerId!)), "#a855f7")}
          {btn("🚫 Блок", () => run(() => addBlock(gameId, teamId, playerId!)), "#f59e0b")}
          {btn("💔 Втрата", () => run(() => addTurnover(gameId, teamId, playerId!)), "#ec4899")}
        </div>
      </div>

      {/* ФОЛИ */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Фоли</div>
        <div className="grid grid-cols-3 gap-2">
          {btn("Перс", () => run(() => addFoul(gameId, teamId, playerId!)), btnRed)}
          {btn("Техн", () => run(() => addFoulTechnical(gameId, teamId, playerId!)), "#b91c1c")}
          {btn("Неспорт", () => run(() => addFoulUnsportsmanlike(gameId, teamId, playerId!)), "#7f1d1d")}
        </div>
      </div>
    </div>
  );
}
