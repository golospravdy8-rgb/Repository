"use client";

import { useState } from "react";
import type { LeaderStats } from "@/lib/stats-calculator";

type StatKey = "ppg" | "rpg" | "apg" | "spg" | "bpg";

const tabs: { key: StatKey; label: string; unit: string }[] = [
  { key: "ppg", label: "Очки", unit: "оч/гру" },
  { key: "rpg", label: "Підбори", unit: "пд/гру" },
  { key: "apg", label: "Передачі", unit: "пе/гру" },
  { key: "bpg", label: "Блоки", unit: "бл/гру" },
  { key: "spg", label: "Перехопи", unit: "пр/гру" },
];

export default function LeadersSection({ leaders }: { leaders: LeaderStats[] }) {
  const [activeTab, setActiveTab] = useState<StatKey>("ppg");

  const sorted = [...leaders].sort((a, b) => b[activeTab] - a[activeTab]).slice(0, 10);
  const top = sorted[0];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
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
          className="rounded-lg p-3 mb-3 text-white"
          style={{ backgroundColor: "#1a2744" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-sm font-black flex-shrink-0">
              {top.firstName[0]}{top.lastName[0]}
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-gray-300 uppercase tracking-wider mb-0.5">
                Лідер — {tabs.find((t) => t.key === activeTab)?.label}
              </div>
              <div className="text-sm font-black">
                {top.firstName} {top.lastName}
              </div>
              <div className="text-orange-400 text-[11px] font-semibold">{top.teamName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-orange-400">{top[activeTab]}</div>
              <div className="text-[10px] text-gray-300">{tabs.find((t) => t.key === activeTab)?.unit}</div>
              <div className="text-[10px] text-gray-400">{top.gamesPlayed} ігор</div>
            </div>
          </div>
        </div>
      )}

      {/* Top 10 table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-500 uppercase" style={{ fontSize: "10px" }}>
              <th className="px-2 py-1.5 text-center w-7">#</th>
              <th className="px-2 py-1.5 text-left">Гравець</th>
              <th className="px-2 py-1.5 text-left">Команда</th>
              <th className="px-2 py-1.5 text-center">Ігри</th>
              <th className="px-2 py-1.5 text-center font-bold">
                {tabs.find((t) => t.key === activeTab)?.label}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, i) => (
              <tr key={player.playerId} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-2 py-1.5 text-center text-gray-400 font-medium">{i + 1}</td>
                <td className="px-2 py-1.5 font-semibold text-gray-800">
                  {player.firstName} {player.lastName}
                </td>
                <td className="px-2 py-1.5 text-gray-500">{player.teamShortName}</td>
                <td className="px-2 py-1.5 text-center text-gray-500">{player.gamesPlayed}</td>
                <td
                  className="px-2 py-1.5 text-center font-bold"
                  style={{ color: i === 0 ? "#f97316" : "#1a2744" }}
                >
                  {player[activeTab]}
                </td>
              </tr>
            ))}
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
