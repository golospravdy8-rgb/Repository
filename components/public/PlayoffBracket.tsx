"use client";

import React from "react";

interface Playoff {
  semifinal1TeamA?: string | null;
  semifinal1TeamB?: string | null;
  semifinal1ScoreA?: number | null;
  semifinal1ScoreB?: number | null;

  semifinal2TeamA?: string | null;
  semifinal2TeamB?: string | null;
  semifinal2ScoreA?: number | null;
  semifinal2ScoreB?: number | null;

  finalTeamA?: string | null;
  finalTeamB?: string | null;
  finalScoreA?: number | null;
  finalScoreB?: number | null;

  thirdPlaceTeamA?: string | null;
  thirdPlaceTeamB?: string | null;
  thirdPlaceScoreA?: number | null;
  thirdPlaceScoreB?: number | null;
}

interface PlayoffBracketProps {
  playoff: Playoff | null;
}

export const PlayoffBracket: React.FC<PlayoffBracketProps> = ({ playoff }) => {
  if (!playoff) {
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-8">
        <h2 className="text-xl font-bold mb-4 text-blue-900">🏆 Плей-офф</h2>
        <p className="text-gray-600">Дані плей-офф ще не додані</p>
      </div>
    );
  }

  const MatchRow = ({
    teamA,
    scoreA,
    scoreB,
    teamB,
    label,
    borderColor = "border-gray-300",
  }: {
    teamA?: string | null;
    scoreA?: number | null;
    scoreB?: number | null;
    teamB?: string | null;
    label: string;
    borderColor?: string;
  }) => (
    <div className="mb-4">
      <div className="text-xs font-bold text-gray-600 mb-2">{label}</div>
      <div className={`flex items-center gap-3 p-3 bg-white border-2 ${borderColor} rounded-lg`}>
        <div className="flex-1 text-center text-sm font-bold text-gray-800">
          {teamA || "TBD"}
        </div>
        <div className="text-sm font-bold text-gray-700 min-w-fit">
          {scoreA !== null && scoreA !== undefined ? scoreA : "—"} :
          {scoreB !== null && scoreB !== undefined ? scoreB : "—"}
        </div>
        <div className="flex-1 text-center text-sm font-bold text-gray-800">
          {teamB || "TBD"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-8">
      <h2 className="text-xl font-bold mb-6 text-blue-900">🏆 Плей-офф</h2>

      <div className="space-y-6">
        {/* ПОЛУФИНАЛЫ */}
        <div>
          <h3 className="text-lg font-bold mb-3 text-blue-800">🎯 ПОЛУФІНАЛІ</h3>
          <MatchRow
            label="ПІВФІНАЛ 1"
            teamA={playoff.semifinal1TeamA}
            scoreA={playoff.semifinal1ScoreA}
            scoreB={playoff.semifinal1ScoreB}
            teamB={playoff.semifinal1TeamB}
            borderColor="border-blue-300"
          />
          <MatchRow
            label="ПІВФІНАЛ 2"
            teamA={playoff.semifinal2TeamA}
            scoreA={playoff.semifinal2ScoreA}
            scoreB={playoff.semifinal2ScoreB}
            teamB={playoff.semifinal2TeamB}
            borderColor="border-blue-300"
          />
        </div>

        {/* ФИНАЛ */}
        <div>
          <MatchRow
            label="🥇 ФІНАЛ"
            teamA={playoff.finalTeamA}
            scoreA={playoff.finalScoreA}
            scoreB={playoff.finalScoreB}
            teamB={playoff.finalTeamB}
            borderColor="border-yellow-400"
          />
        </div>

        {/* ЗА 3 МІСЦЕ */}
        <div>
          <MatchRow
            label="🥉 ЗА 3 МІСЦЕ"
            teamA={playoff.thirdPlaceTeamA}
            scoreA={playoff.thirdPlaceScoreA}
            scoreB={playoff.thirdPlaceScoreB}
            teamB={playoff.thirdPlaceTeamB}
            borderColor="border-orange-400"
          />
        </div>
      </div>
    </div>
  );
};

export default PlayoffBracket;
