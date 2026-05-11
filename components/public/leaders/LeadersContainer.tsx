"use client";

import { useState, useMemo } from "react";
import type { LeaderStats, StatKey, Position, LeaderFilters } from "@/lib/leaders/types";
import { LeaderTabs } from "./LeaderTabs";
import { LeaderFilters as LeaderFiltersWidget } from "./LeaderFilters";
import { LeaderHero } from "./LeaderHero";
import { LeaderTable } from "./LeaderTable";
import { LeaderCards } from "./LeaderCards";
import { filterLeaders, sortLeaders } from "@/lib/leaders/utils";

interface LeadersContainerProps {
  initialLeaders: LeaderStats[];
  seasonName: string;
  ageGroupLabel: string;
}

export function LeadersContainer({
  initialLeaders,
  seasonName,
  ageGroupLabel,
}: LeadersContainerProps) {
  const [activeTab, setActiveTab] = useState<StatKey>("ppg");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<number | undefined>();
  const [selectedPosition, setSelectedPosition] = useState<Position | undefined>();
  const [limit, setLimit] = useState<10 | 20 | 999>(10);

  // Виділяємо унікальні команди
  const teams = useMemo(() => {
    const teamMap = new Map<number, LeaderStats>();
    for (const leader of initialLeaders) {
      if (!teamMap.has(leader.teamId)) {
        teamMap.set(leader.teamId, leader);
      }
    }
    return Array.from(teamMap.values()).map((p) => ({
      id: p.teamId,
      name: p.teamName,
      shortName: p.teamShortName,
    }));
  }, [initialLeaders]);

  // Застосовуємо фільтри та сортування
  const processedLeaders = useMemo(() => {
    const filters: Partial<LeaderFilters> = {
      search: searchQuery,
      teamId: selectedTeam,
      position: selectedPosition,
    };

    let result = filterLeaders(initialLeaders, filters);
    result = sortLeaders(result, activeTab, "desc");

    if (limit !== 999) {
      result = result.slice(0, limit);
    }

    return result;
  }, [initialLeaders, searchQuery, selectedTeam, selectedPosition, activeTab, limit]);

  const isEmpty = initialLeaders.length === 0;
  const hasResults = processedLeaders.length > 0;
  const heroLeader = processedLeaders[0];

  return (
    <div className="w-full space-y-4">
      {/* Табы — ВСЕГДА показуются */}
      <LeaderTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Фільтри — тільки якщо є дані */}
      {!isEmpty && (
        <LeaderFiltersWidget
          teams={teams}
          selectedTeam={selectedTeam}
          selectedPosition={selectedPosition}
          searchQuery={searchQuery}
          limit={limit}
          onTeamChange={setSelectedTeam}
          onPositionChange={setSelectedPosition}
          onSearchChange={setSearchQuery}
          onLimitChange={setLimit}
        />
      )}

      {/* Герой-карточка — тільки якщо є результати */}
      {hasResults && heroLeader && <LeaderHero leader={heroLeader} activeTab={activeTab} />}

      {/* Таблиця та карточки — ВСЕГДА показуються (з або без даних) */}
      <LeaderTable
        leaders={processedLeaders}
        activeTab={activeTab}
        isEmpty={isEmpty}
        ageGroupLabel={ageGroupLabel}
      />

      <LeaderCards
        leaders={processedLeaders}
        activeTab={activeTab}
        isEmpty={isEmpty}
        ageGroupLabel={ageGroupLabel}
      />
    </div>
  );
}
