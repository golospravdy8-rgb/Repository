"use client";

import { useMemo, useTransition } from "react";
import { voteOnChatPoll } from "@/actions/chat-poll";

export interface ChatPollData {
  id: number;
  question: string;
  options: string[];
  createdBy: string;
  createdAt: string;
  votes: Record<string, number>; // { voterPhone: optionIdx }
  voteCounts: number[]; // counts per option
}

interface ChatActivePollProps {
  poll: ChatPollData | null;
  userPhone: string;
  userName: string;
  onPollUpdated?: (updatedPoll: ChatPollData) => void;
}

export default function ChatActivePoll({
  poll,
  userPhone,
  userName,
  onPollUpdated,
}: ChatActivePollProps) {
  const [isPending, startTransition] = useTransition();

  if (!poll || poll.options.length === 0) return null;

  // Calculate stats
  const stats = useMemo(() => {
    const total = Object.keys(poll.votes).length;
    const optionStats = poll.options.map((_, idx) => {
      const count = poll.voteCounts[idx] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const voters = Object.entries(poll.votes)
        .filter(([, voteIdx]) => voteIdx === idx)
        .map(([phone]) => phone);
      return { count, percentage, voters };
    });
    return { total, optionStats };
  }, [poll]);

  const userVote = poll.votes[userPhone];
  const hasVoted = userPhone in poll.votes;

  const handleVote = (optionIdx: number) => {
    if (hasVoted || isPending) return;

    startTransition(async () => {
      const result = await voteOnChatPoll(poll.id, optionIdx, userPhone);
      if (result && onPollUpdated) {
        onPollUpdated(result);
      }
    });
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(244,111,16,0.15), rgba(249,115,22,0.1))",
        border: "1px solid rgba(244,111,16,0.4)",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "16px",
        animation: "slideIn 0.3s ease-out",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
        <span style={{ fontSize: "24px", flexShrink: 0 }}>📊</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#f46f10",
              marginBottom: "4px",
            }}
          >
            Активне опитування
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#e2e8f0",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {poll.question}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px" }}>
            {stats.total} голос{stats.total === 1 ? "" : stats.total < 5 ? "и" : "ів"}
          </div>
        </div>
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
        {poll.options.map((option, idx) => {
          const stat = stats.optionStats[idx];
          const isSelected = userVote === idx;
          const barWidth = stat.percentage || 0;

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={hasVoted || isPending}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: isSelected ? "2px solid #f46f10" : "1px solid rgba(244,111,16,0.3)",
                background: isSelected
                  ? "rgba(244,111,16,0.2)"
                  : "rgba(255,255,255,0.04)",
                color: "#e2e8f0",
                cursor: hasVoted || isPending ? "default" : "pointer",
                position: "relative",
                overflow: "hidden",
                fontSize: "13px",
                fontWeight: 500,
                textAlign: "left",
                transition: "all 0.2s ease",
                opacity: isPending ? 0.7 : 1,
              }}
              title={
                hasVoted
                  ? "Ви вже проголосували"
                  : "Натисніть щоб голосувати"
              }
            >
              {/* Progress bar */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${barWidth}%`,
                  background: isSelected
                    ? "rgba(244,111,16,0.3)"
                    : "rgba(244,111,16,0.15)",
                  transition: "width 0.3s ease",
                  zIndex: 0,
                }}
              />

              {/* Content */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span style={{ fontWeight: isSelected ? 700 : 500 }}>
                  {isSelected ? "✓ " : ""}{option}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#f46f10",
                      fontWeight: 700,
                    }}
                  >
                    {stat.percentage}%
                  </span>
                  {stat.count > 0 && (
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      ({stat.count})
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Vote status */}
      {!hasVoted ? (
        <div
          style={{
            fontSize: "12px",
            color: "#94a3b8",
            textAlign: "center",
            fontStyle: "italic",
            paddingTop: "8px",
            borderTop: "1px solid rgba(244,111,16,0.2)",
          }}
        >
          Натисніть на варіант щоб голосувати
        </div>
      ) : (
        <div
          style={{
            fontSize: "12px",
            color: "#16a34a",
            textAlign: "center",
            fontWeight: 600,
            paddingTop: "8px",
            borderTop: "1px solid rgba(244,111,16,0.2)",
          }}
        >
          ✓ Ви проголосували за {poll.options[userVote]}
        </div>
      )}

      {/* Author info */}
      <div
        style={{
          marginTop: "10px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(244,111,16,0.2)",
          fontSize: "11px",
          color: "#64748b",
        }}
      >
        Автор: {poll.createdBy}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
