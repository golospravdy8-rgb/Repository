"use client";

import { useMemo } from "react";

interface PollData {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, string>; // { userPhone: optionIndex }
  createdBy: string;
}

interface ActivePollSidebarProps {
  poll: PollData | null;
  userPhone: string;
  onVote: (optionIndex: number) => Promise<void>;
  isVoting?: boolean;
}

export default function ActivePollSidebar({ poll, userPhone, onVote, isVoting = false }: ActivePollSidebarProps) {
  if (!poll || poll.options.length === 0) return null;

  // Calculate stats
  const stats = useMemo(() => {
    const total = Object.keys(poll.votes).length;
    const optionStats = poll.options.map((_, idx) => {
      const count = Object.values(poll.votes).filter((v) => v === String(idx)).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return { count, percentage, voters: Object.entries(poll.votes).filter(([, v]) => v === String(idx)).map(([phone]) => phone) };
    });
    return { total, optionStats };
  }, [poll.votes, poll.options]);

  const userVote = poll.votes[userPhone];
  const hasVoted = userPhone in poll.votes;

  return (
    <div
      style={{
        position: "sticky",
        top: "220px",
        background: "linear-gradient(135deg, rgba(244,111,16,0.15), rgba(249,115,22,0.1))",
        border: "1px solid rgba(244,111,16,0.4)",
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "12px",
        maxHeight: "fit-content",
        zIndex: 30,
        animation: "slideIn 0.3s ease-out",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "20px", flexShrink: 0 }}>📊</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#f46f10", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Активне опитування
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#e2e8f0",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {poll.question}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
            {stats.total} голос{stats.total === 1 ? "" : stats.total < 5 ? "и" : "ів"}
          </div>
        </div>
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {poll.options.map((option, idx) => {
          const stat = stats.optionStats[idx];
          const isSelected = userVote === String(idx);
          const barWidth = stat.percentage || 0;

          return (
            <button
              key={idx}
              onClick={() => !hasVoted && onVote(idx)}
              disabled={hasVoted || isVoting}
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: "8px",
                border: isSelected ? "2px solid #f46f10" : "1px solid rgba(244,111,16,0.3)",
                background: isSelected ? "rgba(244,111,16,0.2)" : "rgba(255,255,255,0.04)",
                color: "#e2e8f0",
                cursor: hasVoted || isVoting ? "default" : "pointer",
                position: "relative",
                overflow: "hidden",
                fontSize: "12px",
                fontWeight: 500,
                textAlign: "left",
                transition: "all 0.2s ease",
                opacity: isVoting ? 0.7 : 1,
              }}
              title={hasVoted ? "Ви вже проголосували" : "Голосувати"}
            >
              {/* Progress bar background */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${barWidth}%`,
                  background: isSelected ? "rgba(244,111,16,0.3)" : "rgba(244,111,16,0.15)",
                  transition: "width 0.3s ease",
                  zIndex: 0,
                }}
              />

              {/* Content */}
              <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: isSelected ? 700 : 500 }}>
                  {isSelected ? "✓ " : ""}{option}
                </span>
                <span style={{ fontSize: "11px", color: "#f46f10", fontWeight: 700, flexShrink: 0 }}>
                  {stat.percentage}%
                  {stat.count > 0 && <span style={{ color: "#94a3b8" }}> ({stat.count})</span>}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Vote count by user (collapsed) */}
      {stats.total > 0 && (
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(244,111,16,0.2)" }}>
          <details style={{ cursor: "pointer" }}>
            <summary
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                fontWeight: 600,
                userSelect: "none",
                listStyle: "none",
              }}
            >
              👥 Проголосували ({stats.total})
            </summary>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {stats.optionStats.map((stat, idx) => (
                <div key={idx} style={{ fontSize: "10px", color: "#cbd5e1" }}>
                  {poll.options[idx]} ({stat.count}):
                  <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {stat.voters.slice(0, 3).map((phone) => (
                      <span key={phone} style={{ background: "rgba(244,111,16,0.2)", padding: "1px 4px", borderRadius: "3px" }}>
                        {phone.slice(0, 3)}...
                      </span>
                    ))}
                    {stat.voters.length > 3 && <span style={{ color: "#94a3b8" }}>+{stat.voters.length - 3}</span>}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Info text */}
      {!hasVoted && (
        <div style={{ marginTop: "10px", fontSize: "11px", color: "#94a3b8", textAlign: "center", fontStyle: "italic" }}>
          Натисніть щоб проголосувати
        </div>
      )}
      {hasVoted && (
        <div style={{ marginTop: "10px", fontSize: "11px", color: "#16a34a", textAlign: "center", fontWeight: 600 }}>
          ✓ Ви проголосували
        </div>
      )}

      {/* Author info */}
      <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(244,111,16,0.2)", fontSize: "10px", color: "#64748b" }}>
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
