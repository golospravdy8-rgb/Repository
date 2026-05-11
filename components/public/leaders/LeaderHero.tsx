"use client";

import Image from "next/image";
import type { LeaderStats, StatKey } from "@/lib/leaders/types";
import { STAT_TABS } from "@/lib/leaders/types";
import { getInitials } from "@/lib/leaders/utils";

interface LeaderHeroProps {
  leader: LeaderStats;
  activeTab: StatKey;
}

export function LeaderHero({ leader, activeTab }: LeaderHeroProps) {
  const tabConfig = STAT_TABS.find((t) => t.key === activeTab);
  if (!tabConfig) return null;

  const statValue = leader[activeTab];

  return (
    <div
      className="rounded-lg px-4 py-3 mb-4 text-white"
      style={{ backgroundColor: "#1a2744" }}
    >
      <div className="flex items-center gap-3">
        {leader.photoUrl ? (
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
            <Image
              src={leader.photoUrl}
              alt={`${leader.firstName} ${leader.lastName}`}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-xs font-black flex-shrink-0">
            {getInitials(leader.firstName, leader.lastName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-gray-300 uppercase tracking-widest">
            Лідер — {tabConfig.label}
          </div>
          <div className="text-sm font-black leading-tight truncate">
            {leader.firstName} {leader.lastName}
          </div>
          <div className="text-orange-400 text-[11px] font-semibold truncate">{leader.teamShortName}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-black text-orange-400 leading-tight">
            {typeof statValue === "number" ? statValue.toFixed(tabConfig.decimal) : statValue}
          </div>
          <div className="text-[9px] text-gray-300">{tabConfig.unit}</div>
          <div className="text-[9px] text-gray-400">{leader.gamesPlayed} ігор</div>
        </div>
      </div>
    </div>
  );
}
