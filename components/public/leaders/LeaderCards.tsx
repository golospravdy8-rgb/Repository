"use client";

import Link from "next/link";
import Image from "next/image";
import type { LeaderStats, StatKey } from "@/lib/leaders/types";
import { STAT_TABS } from "@/lib/leaders/types";
import { getMedal, getInitials } from "@/lib/leaders/utils";

interface LeaderCardsProps {
  leaders: LeaderStats[];
  activeTab: StatKey;
  isEmpty?: boolean;
  ageGroupLabel?: string;
}

export function LeaderCards({
  leaders,
  activeTab,
  isEmpty = false,
  ageGroupLabel = "U-14",
}: LeaderCardsProps) {
  const tabConfig = STAT_TABS.find((t) => t.key === activeTab);

  // Коли немає даних у всій базі
  if (isEmpty) {
    return (
      <div
        className="md:hidden rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-96"
        style={{
          background: "linear-gradient(135deg, rgba(26, 39, 68, 0.9), rgba(26, 39, 68, 0.7))",
          borderColor: "rgba(139, 92, 246, 0.35)",
          border: "1px solid",
        }}
      >
        <div className="text-5xl mb-3 animate-bounce">🏀</div>
        <div className="text-white font-bold text-lg">Статистика з'явиться</div>
        <div className="text-gray-400 text-xs mt-2">
          Лідери сезону групи <span className="font-semibold">{ageGroupLabel}</span> з'являться після перших ігор
        </div>
      </div>
    );
  }

  // Коли є дані, але за фільтрами нічого не знайдено
  if (leaders.length === 0) {
    return (
      <div className="md:hidden rounded-2xl p-8 text-center flex flex-col items-center justify-center"
        style={{ backgroundColor: "rgba(26, 39, 68, 0.1)" }}
      >
        <div className="text-3xl mb-2">🔍</div>
        <div className="font-semibold text-gray-700">Гравців не знайдено</div>
        <div className="text-xs text-gray-500 mt-1">Спробуйте змінити фільтри</div>
      </div>
    );
  }

  // Коли є дані — показуємо карточки
  return (
    <div className="md:hidden space-y-3">
      {leaders.map((player, i) => {
        const medalColor = player.rating >= 75 ? "#b8860b" : player.rating >= 60 ? "#708090" : "#8B4513";
        return (
          <Link
            key={player.playerId}
            href={`/players/${player.playerId}`}
            className="rounded-2xl p-4 border block transition-transform hover:scale-105"
            style={{
              backgroundColor: "#1a2744",
              borderColor: "rgba(139, 92, 246, 0.35)",
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {player.photoUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                    <Image
                      src={player.photoUrl}
                      alt={player.firstName}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-xs font-black flex-shrink-0 text-white">
                    {getInitials(player.firstName, player.lastName)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-white truncate">
                    {player.firstName} {player.lastName}
                  </div>
                  <div className="text-orange-400 text-[10px] font-semibold truncate">{player.teamName}</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[11px] font-black rounded-full w-7 h-7 flex items-center justify-center" style={{ color: medalColor, backgroundColor: "rgba(255,255,255,0.05)" }}>
                  {getMedal(i + 1) || `#${i + 1}`}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 mb-3" style={{ borderColor: "rgba(139, 92, 246, 0.2)" }}></div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[9px] text-gray-400 uppercase font-semibold">Ігри</div>
                <div className="text-sm font-bold text-white">{player.gamesPlayed}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-400 uppercase font-semibold">рейтинг</div>
                <div className="text-sm font-bold" style={{ color: medalColor }}>
                  {player.rating}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-gray-400 uppercase font-semibold">{tabConfig?.label}</div>
                <div className="text-sm font-bold text-orange-400">
                  {typeof player[activeTab] === "number"
                    ? (player[activeTab] as number).toFixed(tabConfig?.decimal || 1)
                    : player[activeTab]}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
