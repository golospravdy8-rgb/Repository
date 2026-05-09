"use client";

import React from "react";
import type { Player } from "@prisma/client";

interface FoulPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (fouledPlayerId: number) => void;
  opponentPlayers: Player[];
  foulType: "PERSONAL" | "TECHNICAL" | "UNSPORTSMANLIKE" | "DISQUALIFYING" | "COACH" | null;
  selectedPlayerName?: string;
}

const foulTypeLabels: Record<string, string> = {
  PERSONAL: "На кого був фол П (персональний)?",
  TECHNICAL: "На кого був технічний фол?",
  UNSPORTSMANLIKE: "На кого був неспортивний фол?",
  DISQUALIFYING: "На кого була дисквалімікуюча дія?",
  COACH: "На кого буває тренерський фол?",
};

export default function FoulPlayerModal({
  isOpen,
  onClose,
  onSelect,
  opponentPlayers,
  foulType,
  selectedPlayerName,
}: FoulPlayerModalProps) {
  if (!isOpen) return null;

  const modalTitle = foulType ? foulTypeLabels[foulType] : "На кого був фол?";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a2737",
          borderRadius: 12,
          padding: "20px",
          width: "90%",
          maxWidth: 400,
          border: "1px solid #2a5a8c",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: "700", color: "#fff", margin: 0 }}>
            {modalTitle}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 24,
              color: "#8ab8d0",
              cursor: "pointer",
              padding: "0 4px",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ff6b6b")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8ab8d0")}
          >
            ✕
          </button>
        </div>

        {/* PLAYERS LIST */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 300,
            overflowY: "auto",
            marginBottom: 16,
            paddingRight: 4,
          }}
        >
          {opponentPlayers.length === 0 ? (
            <div style={{ color: "#8ab8d0", fontSize: 12, padding: "16px 8px", textAlign: "center" }}>
              Немає гравців команди суперника
            </div>
          ) : (
            opponentPlayers
              .sort((a, b) => a.number - b.number)
              .map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    onSelect(player.id);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "#0d1520",
                    border: "1px solid #2a4060",
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    color: "#c8d8e8",
                    fontSize: 13,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#163a5c";
                    e.currentTarget.style.borderColor = "#2a7aaa";
                    e.currentTarget.style.color = "#5ab3f4";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#0d1520";
                    e.currentTarget.style.borderColor = "#2a4060";
                    e.currentTarget.style.color = "#c8d8e8";
                  }}
                >
                  <span style={{ fontWeight: "700", fontSize: 14, minWidth: "28px" }}>
                    #{player.number}
                  </span>
                  <span>{player.lastName}</span>
                  {player.firstName && (
                    <span style={{ fontSize: 11, color: "#8ab8d0", marginLeft: "auto" }}>
                      {player.firstName[0]}.
                    </span>
                  )}
                </button>
              ))
          )}
        </div>

        {/* FOOTER BUTTONS */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              onSelect(0); // 0 означає "не вказано"
              onClose();
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: "#2d1a00",
              border: "1px solid #5a3800",
              borderRadius: 6,
              color: "#f4cc5a",
              fontSize: 12,
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#3d2800";
              e.currentTarget.style.borderColor = "#8a5800";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2d1a00";
              e.currentTarget.style.borderColor = "#5a3800";
            }}
          >
            ⊗ Пропустити
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: "#1a2e40",
              border: "1px solid #2a4060",
              borderRadius: 6,
              color: "#8ab8d0",
              fontSize: 12,
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#0d1520";
              e.currentTarget.style.borderColor = "#1a3a50";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#1a2e40";
              e.currentTarget.style.borderColor = "#2a4060";
            }}
          >
            ✕ Закрити
          </button>
        </div>

        {/* INFO TEXT */}
        <div style={{ fontSize: 10, color: "#5a7a9a", marginTop: 12, textAlign: "center" }}>
          Вибір гравця не обов'язковий — натисніть "Пропустити" для швидкої гри
        </div>
      </div>
    </div>
  );
}
