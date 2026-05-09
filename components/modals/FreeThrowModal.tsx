"use client";

import React from "react";

interface FreeThrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRegular: (isFreeThrow: boolean) => void;
  onSelectFreeThrow: (isFreeThrow: boolean) => void;
  context: "scoring" | "miss"; // Чи це escolha для очків (+1) чи промахів (1 Невлучно)
}

const contextLabels = {
  scoring: "Яка це дія?",
  miss: "Яка це дія?",
};

const contextDescriptions = {
  scoring: "Вибери тип 1-очкового очка",
  miss: "Вибери тип промаху",
};

export default function FreeThrowModal({
  isOpen,
  onClose,
  onSelectRegular,
  onSelectFreeThrow,
  context,
}: FreeThrowModalProps) {
  if (!isOpen) return null;

  const isScoring = context === "scoring";
  const regularLabel = isScoring ? "Звичайне очко" : "Звичайний промах";
  const ftLabel = isScoring ? "Штрафний кидок" : "Промах штрафного";
  const regularIcon = isScoring ? "✓" : "✗";
  const ftIcon = isScoring ? "✓" : "✗";

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
          padding: "24px",
          width: "90%",
          maxWidth: 380,
          border: "1px solid #2a5a8c",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: "700", color: "#fff", margin: 0 }}>
            {contextLabels[context]}
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

        <p style={{ fontSize: 12, color: "#8ab8d0", margin: "0 0 20px 0" }}>
          {contextDescriptions[context]}
        </p>

        {/* CHOICE BUTTONS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          {/* REGULAR */}
          <button
            onClick={() => {
              onSelectRegular(false);
              onClose();
            }}
            style={{
              padding: "16px 12px",
              background: isScoring ? "#0f3a1a" : "#2d0a0a",
              border: isScoring ? "2px solid #1a5028" : "2px solid #5a0808",
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isScoring ? "#1a5028" : "#3d1010";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isScoring ? "#0f3a1a" : "#2d0a0a";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <span style={{ fontSize: 24, fontWeight: "700", color: isScoring ? "#4ef472" : "#f47a7a" }}>
              {regularIcon}
            </span>
            <span style={{ fontSize: 14, fontWeight: "600", color: isScoring ? "#4ef472" : "#f47a7a" }}>
              {regularLabel}
            </span>
          </button>

          {/* FREE THROW */}
          <button
            onClick={() => {
              onSelectFreeThrow(true);
              onClose();
            }}
            style={{
              padding: "16px 12px",
              background: "#1a0f3a",
              border: "2px solid #2a1a5a",
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#2a1a5a";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#1a0f3a";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <span style={{ fontSize: 24, fontWeight: "700", color: "#b07af4" }}>
              {ftIcon}
            </span>
            <span style={{ fontSize: 14, fontWeight: "600", color: "#b07af4" }}>
              {ftLabel}
            </span>
          </button>
        </div>

        {/* FOOTER */}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
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
    </div>
  );
}
