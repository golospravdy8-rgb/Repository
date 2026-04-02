"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface TeamCardProps {
  id: number;
  name: string;
  shortName: string;
  logoUrl: string | null;
  wins: number | null;
  losses: number | null;
  playerCount: number;
}

export default function TeamCard({ id, name, shortName, logoUrl, wins, losses, playerCount }: TeamCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [modalOpen]);

  return (
    <>
      <div style={{
        background: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        textAlign: "center",
      }}>
        {/* Logo */}
        <div
          onClick={() => logoUrl && setModalOpen(true)}
          style={{
            width: 224,
            height: 224,
            borderRadius: 12,
            overflow: "hidden",
            background: "#000000",
            flexShrink: 0,
            cursor: logoUrl ? "pointer" : "default",
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: [12, 13, 19].includes(id) ? "cover" : "contain", display: "block" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 64, fontWeight: 900, color: "#94a3b8",
            }}>
              {shortName?.[0] ?? name[0]}
            </div>
          )}
        </div>

        {/* Info */}
        <Link href={`/teams/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <p style={{ fontWeight: 900, fontSize: 15, lineHeight: 1.3, color: "#1e2a4a", marginBottom: 2 }}>{name}</p>
          {shortName && shortName !== name && (
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{shortName}</p>
          )}
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{playerCount} гравців</p>
          {wins !== null && losses !== null && (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 6, fontSize: 13 }}>
              <span style={{ color: "#16a34a", fontWeight: 700 }}>{wins}П</span>
              <span style={{ color: "#e2e8f0" }}>·</span>
              <span style={{ color: "#ef4444", fontWeight: 700 }}>{losses}Р</span>
            </div>
          )}
        </Link>
      </div>

      {/* Modal */}
      {modalOpen && logoUrl && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.9)",
            zIndex: 9999,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <button
            onClick={() => setModalOpen(false)}
            style={{
              position: "absolute", top: 20, right: 24,
              background: "rgba(255,255,255,0.2)", border: "none",
              color: "#fff", fontSize: 28,
              width: 44, height: 44, borderRadius: "50%",
              cursor: "pointer",
            }}
          >×</button>
          <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{name}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={name}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 12 }}
          />
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 16 }}>Натисніть будь-де щоб закрити</p>
        </div>
      )}
    </>
  );
}
