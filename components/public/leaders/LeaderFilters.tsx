"use client";

import { useState } from "react";
import type { Position } from "@/lib/leaders/types";
import { POSITIONS, POSITION_NAMES } from "@/lib/leaders/types";

interface LeaderFiltersProps {
  teams: Array<{ id: number; name: string; shortName: string }>;
  selectedTeam?: number;
  selectedPosition?: Position;
  searchQuery?: string;
  limit: 10 | 20 | 999;
  onTeamChange: (teamId?: number) => void;
  onPositionChange: (position?: Position) => void;
  onSearchChange: (query: string) => void;
  onLimitChange: (limit: 10 | 20 | 999) => void;
}

export function LeaderFilters({
  teams,
  selectedTeam,
  selectedPosition,
  searchQuery = "",
  limit,
  onTeamChange,
  onPositionChange,
  onSearchChange,
  onLimitChange,
}: LeaderFiltersProps) {
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isPositionOpen, setIsPositionOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
      {/* Поиск по имени */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Поіск</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Введіть імя гравця..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Команда */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Команда</label>
        <button
          onClick={() => setIsTeamOpen(!isTeamOpen)}
          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-left flex justify-between items-center hover:bg-gray-100"
        >
          <span className="text-gray-700">
            {selectedTeam ? teams.find((t) => t.id === selectedTeam)?.name : "Усі команди"}
          </span>
          <span className="text-gray-400">▼</span>
        </button>
        {isTeamOpen && (
          <div className="absolute bg-white border border-gray-300 rounded-lg shadow mt-1 z-10 min-w-64 max-h-48 overflow-y-auto">
            <button
              onClick={() => {
                onTeamChange(undefined);
                setIsTeamOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                !selectedTeam ? "bg-blue-50 text-blue-700 font-semibold" : ""
              }`}
            >
              Усі команди
            </button>
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => {
                  onTeamChange(team.id);
                  setIsTeamOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                  selectedTeam === team.id ? "bg-blue-50 text-blue-700 font-semibold" : ""
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Позиція */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Позиція</label>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onPositionChange(undefined)}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
              !selectedPosition
                ? "text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            style={!selectedPosition ? { backgroundColor: "#1a2744" } : {}}
          >
            Усі
          </button>
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => onPositionChange(selectedPosition === pos ? undefined : pos)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                selectedPosition === pos
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={selectedPosition === pos ? { backgroundColor: "#1a2744" } : {}}
              title={POSITION_NAMES[pos]}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Ліміт */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Скільки показувати</label>
        <div className="flex gap-2">
          {[10, 20, 999].map((lim) => (
            <button
              key={lim}
              onClick={() => onLimitChange(lim as 10 | 20 | 999)}
              className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded transition-all ${
                limit === lim
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={limit === lim ? { backgroundColor: "#1a2744" } : {}}
            >
              {lim === 999 ? "Всі" : `Топ ${lim}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
