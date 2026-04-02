"use client";

import { useState } from "react";

interface DonateButtonProps {
  cardNumber: string;
  cardName: string;
  cardBank: string;
  donateLabel: string;
  buttonBg?: string;
}

export default function DonateButton({ cardNumber, cardName, cardBank, donateLabel, buttonBg }: DonateButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const label = donateLabel || "Допомогти клубу 💛";
  const hasCard = !!cardNumber;

  function copyCard() {
    if (!cardNumber) return;
    navigator.clipboard.writeText(cardNumber.replace(/\s/g, "")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function formatCard(raw: string) {
    const digits = raw.replace(/\D/g, "");
    return digits.match(/.{1,4}/g)?.join(" ") ?? raw;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 18px",
          borderRadius: 12,
          background: buttonBg ? buttonBg : "linear-gradient(135deg, #f59e0b, #f46f10)",
          color: "white",
          border: "none",
          fontFamily: "inherit",
          fontWeight: 800,
          fontSize: "16px",
          cursor: "pointer",
          boxShadow: `0 3px 15px ${buttonBg ? buttonBg + "66" : "rgba(244,111,16,0.4)"}`,
          letterSpacing: "0.01em",
        }}
      >
        ❤️ {label}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 20,
              padding: "32px 28px",
              maxWidth: 380,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              textAlign: "center",
              position: "relative",
            }}
          >
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute", top: 14, right: 16,
                background: "none", border: "none", fontSize: "24px",
                color: "#9ca3af", cursor: "pointer", lineHeight: 1,
              }}
            >×</button>

            <div style={{ fontSize: "48px", marginBottom: 8 }}>❤️</div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#1a2744", margin: "0 0 6px" }}>
              Підтримати клуб
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px" }}>
              Ваша підтримка допомагає розвитку баскетболу у Львові
            </p>

            {hasCard ? (
              <>
                {cardBank && (
                  <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: 6, fontWeight: 600 }}>
                    {cardBank}
                  </div>
                )}
                <div style={{
                  background: "linear-gradient(135deg, #1a2744, #2d4a8a)",
                  borderRadius: 14,
                  padding: "20px 22px",
                  marginBottom: 16,
                  textAlign: "left",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
                  <div style={{ position: "absolute", bottom: -30, right: 20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: 12, fontWeight: 600, letterSpacing: "0.1em" }}>НОМЕР КАРТКИ</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "0.12em", fontFamily: "monospace" }}>
                    {formatCard(cardNumber)}
                  </div>
                  {cardName && (
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: 12, fontWeight: 600, letterSpacing: "0.05em" }}>
                      {cardName.toUpperCase()}
                    </div>
                  )}
                </div>

                <button
                  onClick={copyCard}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 12,
                    background: copied ? "#16a34a" : "linear-gradient(135deg,#f59e0b,#f46f10)",
                    color: "white",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    marginBottom: 12,
                  }}
                >
                  {copied ? "✓ Скопійовано!" : "📋 Скопіювати номер картки"}
                </button>

                <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                  Скопіюйте номер та здійсніть переказ через додаток вашого банку
                </p>
              </>
            ) : (
              <div style={{ padding: "20px", background: "#f9fafb", borderRadius: 12, color: "#6b7280", fontSize: "14px" }}>
                Реквізити для поповнення ще не вказані.<br />
                Зверніться до адміністратора клубу.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
