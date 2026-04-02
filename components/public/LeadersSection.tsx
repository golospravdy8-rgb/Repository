"use client";

import { useState } from "react";
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

  const sorted = [...leaders].sort((a, b) => b[activeTab] - a[activeTab]).slice(0, 10);
  const top = sorted[0];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-2 flex-wrap">
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
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-black flex-shrink-0">
              {top.firstName[0]}{top.lastName[0]}
            </div>
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
      <div className="bg-white rounded-xl shadow overflow-hidden">
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
    </div>
  );
}
