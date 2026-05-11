"use client";

import type { StatKey } from "@/lib/leaders/types";
import { STAT_TABS } from "@/lib/leaders/types";

interface LeaderTabsProps {
  activeTab: StatKey;
  onTabChange: (tab: StatKey) => void;
}

export function LeaderTabs({ activeTab, onTabChange }: LeaderTabsProps) {
  return (
    <div className="flex gap-1 mb-4 flex-wrap overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide md:flex-wrap md:overflow-visible md:pb-0">
      {STAT_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === tab.key
              ? "text-white shadow-lg"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
          }`}
          style={activeTab === tab.key ? { backgroundColor: "#1a2744" } : {}}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
