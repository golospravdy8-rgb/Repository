"use client";

import Link from "next/link";
import Image from "next/image";
import type { Game, Team, Season } from "@prisma/client";
import { useState } from "react";

type GameWithTeams = Game & { homeTeam: Team; awayTeam: Team; season?: Season | null };

function TeamLogo({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const inner = logoUrl ? (
    <Image src={logoUrl} alt={name} fill style={{ objectFit: "contain" }} />
  ) : (
    <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>{name[0]}</span>
  );
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      border: "2px solid #e2e8f0", overflow: "hidden",
      flexShrink: 0, background: "#f8fafc",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      {inner}
    </div>
  );
}

export default function GameCard({ game }: { game: GameWithTeams }) {
  const [shadow, setShadow] = useState("0 1px 3px rgba(0,0,0,0.08)");
  const isLive  = game.status === "LIVE";
  const isFinal = game.status === "FINAL";
  const hasScore = isFinal || isLive;

  const homeWins = hasScore && game.homeScore > game.awayScore;
  const awayWins = hasScore && game.awayScore > game.homeScore;

  const ageLabel    = game.season?.ageGroup === "older" ? "U-16" : "U-14";
  const seasonLabel = game.season?.name ? `${ageLabel} ${game.season.name}` : ageLabel;

  const statusLabel = isLive
    ? `● LIVE Q${game.quarter}`
    : isFinal
    ? "ФІНАЛ"
    : "ЗАПЛАНОВАНО";

  const statusColor = isLive ? "#ef4444" : isFinal ? "#f97316" : "#2563eb";

  const dateShort = new Date(game.scheduledAt).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <Link href={`/game/${game.id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
      <div style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        overflow: "hidden",
        width: 210,
        boxShadow: shadow,
        transition: "box-shadow 0.2s",
        cursor: "pointer",
      }}
        onMouseEnter={() => setShadow("0 4px 12px rgba(0,0,0,0.15)")}
        onMouseLeave={() => setShadow("0 1px 3px rgba(0,0,0,0.08)")}
      >

        {/* ЗОНА 1 — світло-сіра: ліга + статус */}
        <div style={{
          background: "#f1f5f9",
          borderBottom: "1px solid #e2e8f0",
          padding: "4px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>
            {seasonLabel}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: statusColor, flexShrink: 0, marginLeft: 4 }}>
            {statusLabel}
          </span>
        </div>

        {/* ЗОНА 2 — біла: команди + рахунок */}
        <div style={{ background: "#ffffff", padding: "10px 12px" }}>

          {/* Home */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <TeamLogo logoUrl={game.homeTeam.logoUrl ?? null} name={game.homeTeam.name} />
              <span style={{
                fontSize: 13,
                fontWeight: homeWins ? 700 : 500,
                color: homeWins ? "#0f172a" : "#94a3b8",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {game.homeTeam.name.charAt(0).toUpperCase() + game.homeTeam.name.slice(1, 3)}
              </span>
            </div>
            <span style={{
              fontSize: 22,
              fontWeight: 800,
              color: homeWins ? "#0f172a" : "#94a3b8",
              minWidth: 30,
              textAlign: "right",
              lineHeight: 1,
            }}>
              {hasScore ? game.homeScore : ""}
            </span>
          </div>

          {/* Away */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <TeamLogo logoUrl={game.awayTeam.logoUrl ?? null} name={game.awayTeam.name} />
              <span style={{
                fontSize: 13,
                fontWeight: awayWins ? 700 : 500,
                color: awayWins ? "#f97316" : "#94a3b8",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {game.awayTeam.name.charAt(0).toUpperCase() + game.awayTeam.name.slice(1, 3)}
              </span>
            </div>
            <span style={{
              fontSize: 22,
              fontWeight: 800,
              color: awayWins ? "#f97316" : "#94a3b8",
              minWidth: 30,
              textAlign: "right",
              lineHeight: 1,
            }}>
              {hasScore ? game.awayScore : ""}
            </span>
          </div>

          {/* VS для запланованих */}
          {!hasScore && (
            <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginTop: 4 }}>VS</div>
          )}
        </div>

        {/* ЗОНА 3 — чорна: дата + вік */}
        <div style={{
          background: "#0f172a",
          padding: "4px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 10, color: "#cbd5e1", fontWeight: 500 }}>{dateShort}</span>
          <span style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>{ageLabel}</span>
        </div>

      </div>
    </Link>
  );
}
