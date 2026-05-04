"use client";

import { useMemo } from "react";

interface RunningScoreRendererProps {
  events: Array<{
    type: string;
    teamId: number | null;
    playerId: number | null;
    points: number | null;
    quarter: number;
    createdAt: string | Date;
  }>;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName?: string;
  awayTeamName?: string;
  homePlayers: Array<{ playerId: number; number: number }>;
  awayPlayers: Array<{ playerId: number; number: number }>;
}

interface ScoreEntry {
  team: "home" | "away";
  playerId: number | null;
  playerNumber: number | null;
  points: number;
  homeScore: number;
  awayScore: number;
  quarter: number;
  combinedTotal: number;
  isEndOfQuarter: boolean;
}

export default function RunningScoreRenderer({
  events,
  homeTeamId,
  awayTeamId,
  homePlayers = [],
  awayPlayers = [],
}: RunningScoreRendererProps) {
  const data = useMemo(() => {
    const pointsEvents = events.filter((e) => e.type === "POINTS" && e.points);
    const sortedEvents = [...pointsEvents].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const entries: ScoreEntry[] = [];
    let homeTotal = 0;
    let awayTotal = 0;

    sortedEvents.forEach((event) => {
      const isHome = event.teamId === homeTeamId;
      if (isHome) {
        homeTotal += event.points || 0;
      } else {
        awayTotal += event.points || 0;
      }

      const playerNumber = isHome
        ? homePlayers.find((p) => p.playerId === event.playerId)?.number ?? null
        : awayPlayers.find((p) => p.playerId === event.playerId)?.number ?? null;

      entries.push({
        team: isHome ? "home" : "away",
        playerId: event.playerId,
        playerNumber,
        points: event.points || 0,
        homeScore: homeTotal,
        awayScore: awayTotal,
        quarter: event.quarter,
        combinedTotal: homeTotal + awayTotal,
        isEndOfQuarter: false,
      });
    });

    // Mark quarter ends
    for (let q = 1; q <= 4; q++) {
      const lastIdxInQuarter = entries.findLastIndex((e) => e.quarter === q);
      if (lastIdxInQuarter >= 0) {
        entries[lastIdxInQuarter].isEndOfQuarter = true;
      }
    }

    // Split into halves
    const maxScore = entries.length > 0 ? Math.max(entries[entries.length - 1].combinedTotal, 80) : 80;
    const firstHalf: (ScoreEntry | undefined)[] = new Array(Math.min(80, maxScore)).fill(undefined);
    const secondHalf: (ScoreEntry | undefined)[] = new Array(Math.max(0, maxScore - 80)).fill(undefined);

    entries.forEach((e) => {
      if (e.combinedTotal <= 80) {
        firstHalf[e.combinedTotal - 1] = e;
      } else {
        secondHalf[e.combinedTotal - 81] = e;
      }
    });

    return { firstHalf, secondHalf, maxScore };
  }, [events, homeTeamId, awayTeamId, homePlayers, awayPlayers]);

  const { firstHalf, secondHalf } = data;

  const ScoreEntryViz = ({ playerNumber }: { playerNumber: number | null }) => (
    <svg width="20" height="12" style={{ overflow: "visible" }}>
      <circle cx="10" cy="6" r="5" fill="none" stroke="black" strokeWidth="0.8" />
      <text x="10" y="9" textAnchor="middle" fontSize="6" fontWeight="bold">
        {playerNumber ?? "?"}
      </text>
      <line x1="16" y1="2" x2="20" y2="10" stroke="black" strokeWidth="0.8" />
    </svg>
  );

  const HalfTable = ({ entries }: { entries: (ScoreEntry | undefined)[] }) => (
    <table style={{ width: "50%", borderCollapse: "collapse", borderRight: "2px solid black" }}>
      <thead>
        <tr style={{ background: "#f0f0f0", borderBottom: "1px solid black" }}>
          <th style={{ width: "35%", border: "1px solid #ccc", fontSize: "8px", padding: "2px" }}>A</th>
          <th style={{ width: "30%", border: "1px solid #ccc", fontSize: "8px", padding: "2px" }}>Score</th>
          <th style={{ width: "35%", border: "1px solid #ccc", fontSize: "8px", padding: "2px" }}>B</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 80 }, (_, i) => {
          const entry = entries[i];
          return (
            <tr
              key={i}
              style={{
                height: "12px",
                borderBottom: entry?.isEndOfQuarter ? "3px solid black" : "1px solid #eee",
              }}
            >
              <td style={{ textAlign: "center", fontSize: "8px", border: "1px solid #eee" }}>
                {entry?.team === "home" && <ScoreEntryViz playerNumber={entry.playerNumber} />}
              </td>
              <td style={{ textAlign: "center", fontSize: "8px", fontWeight: "bold", border: "1px solid #ddd" }}>
                {entry ? `${entry.homeScore}:${entry.awayScore}` : ""}
              </td>
              <td style={{ textAlign: "center", fontSize: "8px", border: "1px solid #eee" }}>
                {entry?.team === "away" && <ScoreEntryViz playerNumber={entry.playerNumber} />}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <HalfTable entries={firstHalf} />
      <HalfTable entries={secondHalf} />
    </div>
  );
}
