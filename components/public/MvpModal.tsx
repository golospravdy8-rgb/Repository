"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMvpData } from "@/lib/hooks/useMvpData";
import { submitMvpVote } from "@/app/actions/mvp";
import Image from "next/image";

interface MvpModalProps {
  phone: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MvpModal({ phone, isOpen, onClose }: MvpModalProps) {
  const queryClient = useQueryClient();
  const { data: mvpData, isLoading } = useMvpData(phone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  if (!isOpen) return null;

  const handleVote = async (playerId: number) => {
    if (!phone || !mvpData) return;

    // Check if voting is allowed
    if (mvpData.status === "not_started") {
      setSubmitMessage("❌ Голосування ще не розпочалось");
      return;
    }

    if (mvpData.status === "finished") {
      setSubmitMessage("❌ Період голосування завершився");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");

    // Optimistic update
    const previousData = queryClient.getQueryData<typeof mvpData>(["mvp-data", phone]);

    queryClient.setQueryData(["mvp-data", phone], (old: typeof mvpData) => {
      if (!old) return old;

      // Update vote counts (increment by 1 if first vote, or 0 if changing vote)
      const hadPreviousVote = old.userVote !== null;
      const prevVotedPlayerId = old.userVote?.playerId;

      const updatedResults = old.allResults.map((player) => {
        if (player.playerId === playerId && !hadPreviousVote) {
          // First vote: increment count
          return { ...player, votes: player.votes + 1 };
        }
        if (player.playerId === playerId && hadPreviousVote && player.playerId === prevVotedPlayerId) {
          // Changing to same player: no change
          return player;
        }
        if (player.playerId === playerId && hadPreviousVote && player.playerId !== prevVotedPlayerId) {
          // Changing vote: increment new one
          return { ...player, votes: player.votes + 1 };
        }
        if (player.playerId === prevVotedPlayerId && hadPreviousVote) {
          // Decrement old vote
          return { ...player, votes: Math.max(0, player.votes - 1) };
        }
        return player;
      });

      // Resort
      updatedResults.sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        if (a.lastName !== b.lastName) return a.lastName.localeCompare(b.lastName);
        return a.firstName.localeCompare(b.firstName);
      });

      return {
        ...old,
        currentLeader: updatedResults[0] || null,
        allResults: updatedResults,
        userVote: updatedResults.find((p) => p.playerId === playerId) || null,
        status: "active_voted", // User has voted now
        totalVotes: hadPreviousVote ? old.totalVotes : old.totalVotes + 1,
      };
    });

    // Get player name from allResults
    const selectedPlayer = mvpData.allResults.find((p) => p.playerId === playerId);
    if (!selectedPlayer) return;
    const playerName = `${selectedPlayer.firstName} ${selectedPlayer.lastName}`;

    try {
      const result = await submitMvpVote(phone, playerName);
      if (result.success) {
        setSubmitMessage("✅ Ваш голос записаний!");
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["mvp-data", phone] });
        }, 500);
      } else {
        queryClient.setQueryData(["mvp-data", phone], previousData);
        setSubmitMessage(`❌ ${result.error || "Помилка при голосуванні"}`);
      }
    } catch (error) {
      queryClient.setQueryData(["mvp-data", phone], previousData);
      setSubmitMessage("❌ Помилка при голосуванні");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLeaderboard = () => {
    if (!mvpData?.allResults || mvpData.allResults.length === 0) {
      return null;
    }

    const isVotingActive = mvpData.status === "active_not_voted" || mvpData.status === "active_voted";

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          {mvpData.month} — Результати голосування ({mvpData.allResults.length} гравців)
        </h3>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {mvpData.allResults.map((player, idx) => {
            const isLeader = mvpData.currentLeader?.playerId === player.playerId;

            return (
              <button
                key={player.playerId}
                onClick={() => handleVote(player.playerId)}
                disabled={isSubmitting || !isVotingActive}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                  isLeader
                    ? "bg-gradient-to-r from-orange-600/40 to-yellow-600/40 border border-orange-500/50 shadow-lg shadow-orange-500/20"
                    : "bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700"
                } ${
                  isSubmitting || !isVotingActive
                    ? "opacity-50 cursor-not-allowed"
                    : !isVotingActive ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <div className="text-lg font-bold w-6 flex items-center justify-center flex-shrink-0">
                  {isLeader ? <span className="text-2xl">🏆</span> : <span className="text-gray-400">{idx + 1}</span>}
                </div>

                {player.photoUrl ? (
                  <Image
                    src={player.photoUrl}
                    alt={`${player.firstName} ${player.lastName}`}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                    {player.number}
                  </div>
                )}

                <div className="flex-1 min-w-0 text-left">
                  <div className={`font-semibold text-base truncate ${isLeader ? "text-orange-300" : "text-white"}`}>
                    {isLeader && "⭐ "}
                    {player.firstName} {player.lastName}
                  </div>
                  <div className="text-xs text-gray-400">
                    {player.teamName} • №{player.number}
                  </div>
                </div>

                <span
                  className={`font-bold px-3 py-1 rounded-full text-xs whitespace-nowrap flex-shrink-0 ${
                    isLeader ? "bg-orange-500/30 text-orange-300" : "bg-slate-700/50 text-gray-300"
                  }`}
                >
                  {player.votes} 🗳️
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center text-gray-400 py-8">Завантаження...</div>;
    }

    if (!mvpData) {
      return <div className="text-center text-gray-400 py-8">Помилка завантаження</div>;
    }

    // STATO 1: Voting hasn't started yet
    if (mvpData.status === "not_started") {
      return (
        <div className="space-y-4">
          <div className="text-center text-gray-400 py-8">
            <div className="text-6xl mb-3">🗳️</div>
            <p className="text-sm font-semibold">Голосування ще не розпочато</p>
            <p className="text-xs text-gray-500 mt-2">Буде доступно з 1-го по 10-е число місяця</p>
          </div>
        </div>
      );
    }

    // STATUS 2: Voting finished
    if (mvpData.status === "finished") {
      return (
        <div className="space-y-4">
          <div className="text-center text-gray-400 py-8">
            <div className="text-6xl mb-3">🏆</div>
            <p className="text-sm font-semibold">Голосування завершено</p>
            <p className="text-xs text-gray-500 mt-2">Період голосування: 1-10 число кожного місяця</p>
          </div>

          {/* Show winner */}
          {mvpData.currentLeader && (
            <div className="bg-gradient-to-r from-orange-600/20 to-yellow-600/20 border border-orange-500/30 rounded-xl p-4">
              <div className="text-xs font-semibold text-orange-300 uppercase mb-2">🏆 Переможець місяця</div>
              <div className="flex items-center gap-3">
                {mvpData.currentLeader.photoUrl ? (
                  <Image
                    src={mvpData.currentLeader.photoUrl}
                    alt={`${mvpData.currentLeader.firstName} ${mvpData.currentLeader.lastName}`}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-lg">
                    {mvpData.currentLeader.number}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-bold text-white text-lg">
                    {mvpData.currentLeader.firstName} {mvpData.currentLeader.lastName}
                  </div>
                  <div className="text-sm text-gray-300">
                    {mvpData.currentLeader.teamName} • №{mvpData.currentLeader.number}
                  </div>
                </div>
                <div className="bg-orange-500/30 text-orange-300 font-bold px-3 py-1 rounded-full text-sm">
                  {mvpData.currentLeader.votes} голосів
                </div>
              </div>
            </div>
          )}

          {/* Show leaderboard */}
          {renderLeaderboard()}
        </div>
      );
    }

    // STATUS 3 & 4: Active voting (not_voted or already_voted)
    return (
      <div className="space-y-4">
        {/* Voting active message */}
        <div className="text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
          ✓ Голосування активне | Всього голосів: {mvpData.totalVotes}
        </div>

        {/* Leader Highlight (if votes exist) */}
        {mvpData.currentLeader && (
          <div className="bg-gradient-to-r from-orange-600/20 to-yellow-600/20 border border-orange-500/30 rounded-xl p-4">
            <div className="text-xs font-semibold text-orange-300 uppercase mb-2">⭐ Поточний лідер</div>
            <div className="flex items-center gap-3">
              {mvpData.currentLeader.photoUrl ? (
                <Image
                  src={mvpData.currentLeader.photoUrl}
                  alt={`${mvpData.currentLeader.firstName} ${mvpData.currentLeader.lastName}`}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-lg">
                  {mvpData.currentLeader.number}
                </div>
              )}
              <div className="flex-1">
                <div className="font-bold text-white text-lg flex items-center gap-2">
                  🏆 {mvpData.currentLeader.firstName} {mvpData.currentLeader.lastName}
                </div>
                <div className="text-sm text-gray-300">
                  {mvpData.currentLeader.teamName} • №{mvpData.currentLeader.number}
                </div>
              </div>
              <div className="bg-orange-500/30 text-orange-300 font-bold px-3 py-1 rounded-full text-sm">
                {mvpData.currentLeader.votes} 🗳️
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {renderLeaderboard()}

        {/* User's Vote (only show if already voted) */}
        {mvpData.status === "active_voted" && mvpData.userVote && (
          <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-3">
            <div className="text-xs font-semibold text-purple-300 uppercase mb-2">✓ Ви вже проголосували</div>
            <div className="flex items-center gap-3">
              {mvpData.userVote.photoUrl ? (
                <Image
                  src={mvpData.userVote.photoUrl}
                  alt={`${mvpData.userVote.firstName} ${mvpData.userVote.lastName}`}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">
                  {mvpData.userVote.number}
                </div>
              )}
              <div>
                <div className="font-semibold text-white">Ваш вибір: {mvpData.userVote.firstName} {mvpData.userVote.lastName}</div>
                <div className="text-xs text-gray-400">№{mvpData.userVote.number}</div>
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        {submitMessage && (
          <div className="text-center text-sm py-2 px-3 rounded-lg bg-slate-800/80 text-purple-300">
            {submitMessage}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center">
      <div className="w-full md:max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 rounded-t-3xl md:rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">🏆 Гравець місяця</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        {renderContent()}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold rounded-lg transition"
        >
          Закрити
        </button>
      </div>
    </div>
  );
}
