"use client";

import { useState } from "react";
import Image from "next/image";
import type { LeaderStats } from "@/lib/stats-calculator";

type StatKey = "ppg" | "rpg" | "apg" | "spg" | "bpg";

const tabs: { key: StatKey; label: string; unit: string }[] = [
  { key: "ppg", label: "Очки", unit: "оч/гру" },
  { key: "rpg", label: "Підбори", unit: "пд/гру" },
  { key: "apg", label: "Передачі", unit: "пе/гру" },
  { key: "bpg", label: "Блоки", unit: "бл/гру" },
  { key: "spg", label: "Перехоплення", unit: "пр/гру" },
];

export default function LeadersSection({ leaders }: { leaders: LeaderStats[] }) {
  const [activeTab, setActiveTab] = useState<StatKey>("ppg");

  // Filter players with at least some value in the selected stat, then sort descending
  const sorted = [...leaders]
    .filter(p => {
      // For each stat, require at least some value to appear in leaders
      const value = p[activeTab];
      return value > 0.1; // Allow small decimals like 0.5 assists per game
    })
    .sort((a, b) => b[activeTab] - a[activeTab])
    .slice(0, 10);
  const top = sorted[0];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-2 flex-wrap overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide md:flex-wrap md:overflow-visible md:pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? "text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
            style={activeTab === tab.key ? { backgroundColor: "#1a2744" } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top player hero */}
      {top && (
        <div
          className="rounded-lg px-3 py-2 mb-2 text-white"
          style={{ backgroundColor: "#1a2744" }}
        >
          <div className="flex items-center gap-2.5">
            {top.photoUrl ? (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                <Image
                  src={top.photoUrl}
                  alt={`${top.firstName} ${top.lastName}`}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-black flex-shrink-0">
                {top.firstName[0]}{top.lastName[0]}
              </div>
            )}
            <div className="flex-1">
              <div className="text-[9px] text-gray-300 uppercase tracking-wider">
                Лідер — {tabs.find((t) => t.key === activeTab)?.label}
              </div>
              <div className="text-xs font-black leading-tight">
                {top.firstName} {top.lastName}
              </div>
              <div className="text-orange-400 text-[10px] font-semibold">{top.teamName}</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-orange-400 leading-tight">{top[activeTab]}</div>
              <div className="text-[9px] text-gray-300">{tabs.find((t) => t.key === activeTab)?.unit}</div>
              <div className="text-[9px] text-gray-400">{top.gamesPlayed} ігор</div>
            </div>
          </div>
        </div>
      )}

      {/* Top 10 table */}
      <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-500 uppercase" style={{ fontSize: "9px" }}>
              <th className="px-2 py-1 text-center w-7">#</th>
              <th className="px-2 py-1 text-left">Гравець</th>
              <th className="px-2 py-1 text-left">Команда</th>
              <th className="px-2 py-1 text-center">Ігри</th>
              <th className="px-2 py-1 text-center">Рейтинг</th>
              <th className="px-2 py-1 text-center font-bold">
                {tabs.find((t) => t.key === activeTab)?.label}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, i) => {
              const medal = player.tier === "gold" ? "🥇" : player.tier === "silver" ? "🥈" : "🥉";
              return (
              <tr key={player.playerId} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-2 py-1 text-center text-gray-400 font-medium">{i + 1}</td>
                <td className="px-2 py-1 font-semibold text-gray-800">
                  {player.firstName} {player.lastName}
                </td>
                <td className="px-2 py-1 text-gray-500">{player.teamShortName}</td>
                <td className="px-2 py-1 text-center text-gray-500">{player.gamesPlayed}</td>
                <td className="px-2 py-1 text-center font-bold whitespace-nowrap">
                  <span style={{ color: player.tier === "gold" ? "#b8860b" : player.tier === "silver" ? "#708090" : "#8B4513" }}>
                    {medal} {player.rating}
                  </span>
                </td>
                <td
                  className="px-2 py-1 text-center font-bold"
                  style={{ color: i === 0 ? "#f97316" : "#1a2744" }}
                >
                  {player[activeTab]}
                </td>
              </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-gray-400">
                  Статистика відсутня
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Premium Cards */}
      <div className="md:hidden space-y-2">
        {sorted.length > 0 ? (
          sorted.map((player, i) => {
            const medal = player.tier === "gold" ? "🥇" : player.tier === "silver" ? "🥈" : "🥉";
            const medalColor = player.tier === "gold" ? "#b8860b" : player.tier === "silver" ? "#708090" : "#8B4513";
            return (
              <div
                key={player.playerId}
                className="rounded-3xl p-5 border"
                style={{
                  backgroundColor: "#1a2744",
                  borderColor: "rgba(139, 92, 246, 0.35)",
                  minHeight: "152px"
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    {player.photoUrl ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                        <Image
                          src={player.photoUrl}
                          alt={`${player.firstName} ${player.lastName}`}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-xs font-black flex-shrink-0 text-white">
                        {player.firstName[0]}{player.lastName[0]}
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
                    <div className="text-[11px] font-black rounded-full w-8 h-8 flex items-center justify-center" style={{ color: medalColor, backgroundColor: "rgba(255,255,255,0.05)" }}>
                      #{i + 1}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 my-3" style={{ borderColor: "rgba(139, 92, 246, 0.2)" }}></div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[9px] text-gray-400 uppercase">Ігри</div>
                    <div className="text-sm font-bold text-white">{player.gamesPlayed}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-400 uppercase">рейтинг</div>
                    <div className="text-sm font-bold" style={{ color: medalColor }}>{player.rating}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-400 uppercase">{tabs.find((t) => t.key === activeTab)?.label}</div>
                    <div className="text-sm font-bold text-orange-400">{player[activeTab]}</div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div
            className="rounded-3xl p-6 text-center flex flex-col items-center justify-center min-h-96"
            style={{
              background: "linear-gradient(135deg, rgba(26, 39, 68, 0.9), rgba(26, 39, 68, 0.7))",
              borderColor: "rgba(139, 92, 246, 0.35)",
              border: "1px solid"
            }}
          >
            <div className="text-5xl mb-3 animate-bounce">🏀</div>
            <div className="text-white font-bold text-lg">Статистика ще не доступна</div>
            <div className="text-gray-400 text-xs mt-2">Лідери сезону з'являться після перших ігор групи</div>
          </div>
        )}
      </div>
    </div>
  );
}
