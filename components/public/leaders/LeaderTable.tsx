"use client";

import Link from "next/link";
import Image from "next/image";
import type { LeaderStats, StatKey } from "@/lib/leaders/types";
import { STAT_TABS } from "@/lib/leaders/types";
import { getMedal, getInitials } from "@/lib/leaders/utils";

interface LeaderTableProps {
  leaders: LeaderStats[];
  activeTab: StatKey;
  isEmpty?: boolean;
  ageGroupLabel?: string;
  onSort?: (column: StatKey) => void;
}

export function LeaderTable({
  leaders,
  activeTab,
  isEmpty = false,
  ageGroupLabel = "U-14",
  onSort,
}: LeaderTableProps) {
  const tabConfig = STAT_TABS.find((t) => t.key === activeTab);

  return (
    <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b text-gray-600 uppercase" style={{ fontSize: "10px" }}>
            <th className="px-3 py-2 text-center w-8 font-semibold">#</th>
            <th className="px-3 py-2 text-left font-semibold cursor-pointer hover:text-blue-600">Гравець</th>
            <th className="px-3 py-2 text-left font-semibold cursor-pointer hover:text-blue-600">Команда</th>
            <th className="px-3 py-2 text-center font-semibold cursor-pointer hover:text-blue-600">Ігри</th>
            <th className="px-3 py-2 text-center font-semibold cursor-pointer hover:text-blue-600">Рейтинг</th>
            <th className="px-3 py-2 text-center font-bold cursor-pointer hover:text-blue-600 text-blue-700">
              {tabConfig?.label}
            </th>
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            // Коли немає даних — показуємо заповідник-повідомлення
            <tr>
              <td colSpan={6} className="px-3 py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="text-4xl">🏀</div>
                  <div className="font-semibold text-gray-700">Статистика з'явиться після перших ігор групи</div>
                  <div className="text-sm text-gray-500">Групи: <span className="font-medium">{ageGroupLabel}</span></div>
                </div>
              </td>
            </tr>
          ) : leaders.length === 0 ? (
            // Коли є дані, але за обраними фільтрами — нічого не знайдено
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                Гравців не знайдено за обраними критеріями
              </td>
            </tr>
          ) : (
            // Коли є дані — показуємо таблицю
            leaders.map((player, i) => (
              <tr key={player.playerId} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 text-center text-gray-600 font-medium">
                  {getMedal(i + 1) || i + 1}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/players/${player.playerId}`} className="group flex items-center gap-2 hover:underline">
                    {player.photoUrl ? (
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-gray-300">
                        <Image
                          src={player.photoUrl}
                          alt={player.firstName}
                          width={28}
                          height={28}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-orange-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {getInitials(player.firstName, player.lastName)}
                      </div>
                    )}
                    <span className="font-semibold text-gray-800 group-hover:text-blue-600">
                      {player.firstName} {player.lastName}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-gray-600 font-medium">{player.teamShortName}</td>
                <td className="px-3 py-2 text-center text-gray-600 font-medium">{player.gamesPlayed}</td>
                <td className="px-3 py-2 text-center font-bold" style={{ color: player.rating >= 75 ? "#b8860b" : player.rating >= 60 ? "#708090" : "#8B4513" }}>
                  {player.rating}
                </td>
                <td
                  className="px-3 py-2 text-center font-bold"
                  style={{ color: i === 0 ? "#f97316" : "#1a2744" }}
                >
                  {typeof player[activeTab] === "number"
                    ? (player[activeTab] as number).toFixed(tabConfig?.decimal || 1)
                    : player[activeTab]}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
