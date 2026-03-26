"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface VoteCandidate {
  player_id: number;
  count: number;
}

interface VoteState {
  week: number;
  year: number;
  candidates: VoteCandidate[];
  endsAt: string;
  totalVotes: number;
}

interface User {
  id: number;
  name: string;
}

// Top player IDs from boxScores data (manually selected top performers)
const TOP_PLAYER_IDS = [1, 4, 14, 22, 34, 56, 66];

export default function VotePage() {
  const [user, setUser] = useState<User | null>(null);
  const [voteState, setVoteState] = useState<VoteState | null>(null);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check auth
    fetch("http://localhost:3012/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setUser(u))
      .catch(() => {});

    // Load vote state
    fetch("http://localhost:3012/api/vote/current", { credentials: "include" })
      .then((r) => r.json())
      .then(setVoteState)
      .catch(() => {});

    // Load my vote
    fetch("http://localhost:3012/api/vote/my-vote", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setMyVote(d.playerId); })
      .catch(() => {});

  }, []);

  async function castVote(playerId: number) {
    if (!user) return;
    setVoting(true);
    setError("");
    try {
      const res = await fetch("http://localhost:3012/api/vote/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Помилка"); setVoting(false); return; }
      setMyVote(playerId);
      // Refresh vote state
      fetch("http://localhost:3012/api/vote/current", { credentials: "include" })
        .then((r) => r.json()).then(setVoteState).catch(() => {});
    } catch {
      setError("Помилка з'єднання");
    }
    setVoting(false);
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const currentWeek = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);

  const endDate = voteState?.endsAt
    ? new Date(voteState.endsAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })
    : "";

  // Candidates: top players from the league
  const candidateIds = TOP_PLAYER_IDS;
  const totalVotes = voteState?.totalVotes || 0;
  const voteMap = Object.fromEntries((voteState?.candidates || []).map((c) => [c.player_id, c.count]));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black mb-2" style={{ color: "#1e2a4a" }}>
          🏆 Гравець тижня
        </h1>
        <p className="text-gray-500 text-lg">Тиждень {currentWeek}</p>
        {endDate && (
          <p className="text-sm text-gray-400 mt-1">Голосування завершується: {endDate}</p>
        )}
      </div>

      {/* Auth reminder */}
      {!user && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8 text-center">
          <p className="text-orange-700 font-semibold">
            <Link href="/" className="underline">Увійдіть</Link>, щоб проголосувати за улюбленого гравця
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-center text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Candidates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
        {candidateIds.map((pid) => {
          const votes = voteMap[pid] || 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isVoted = myVote === pid;

          return (
            <div
              key={pid}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
              style={{ border: isVoted ? "2px solid #f46f10" : "2px solid transparent" }}
            >
              {/* Card header */}
              <div
                className="h-24 flex items-center justify-center text-4xl font-black text-white/20"
                style={{ backgroundColor: "#1e2a4a" }}
              >
                #{pid}
              </div>

              <div className="p-4">
                <div className="font-black text-gray-800 mb-1">Гравець #{pid}</div>
                <div className="text-xs text-gray-400 mb-3">ЛДБЛ · 2025-2026</div>

                {/* Vote bar */}
                <div className="mb-3">
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: "#f46f10" }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{votes} голосів ({pct}%)</div>
                </div>

                <button
                  onClick={() => castVote(pid)}
                  disabled={!!myVote || !user || voting}
                  className="w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: isVoted ? "#059669" : "#f46f10",
                    color: "white",
                  }}
                >
                  {isVoted ? "✅ Ваш голос" : !user ? "Увійдіть щоб голосувати" : myVote ? "Ви вже проголосували" : "🗳️ Голосувати"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Winners history */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="font-black text-xl mb-4" style={{ color: "#1e2a4a" }}>
          Переможці попередніх тижнів
        </h2>
        <div className="text-center text-gray-400 py-8 text-sm">
          Результати голосувань з&apos;являться після завершення тижня
        </div>
      </div>
    </div>
  );
}
