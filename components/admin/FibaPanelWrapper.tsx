"use client";

import { useState } from "react";
import GameInfoForm from "./GameInfoForm";
import TeamInfoForm from "./TeamInfoForm";

interface Game {
  id: number;
  commissioner?: string | null;
  referee1?: string | null;
  referee2?: string | null;
  referee3?: string | null;
  venue?: string | null;
  round?: string | null;
  homeTeam: {
    id: number;
    name: string;
    coachName?: string | null;
    assistantCoach?: string | null;
  };
  awayTeam: {
    id: number;
    name: string;
    coachName?: string | null;
    assistantCoach?: string | null;
  };
}

interface FibaPanelWrapperProps {
  game: Game;
}

export default function FibaPanelWrapper({ game }: FibaPanelWrapperProps) {
  const [showFibaPanel, setShowFibaPanel] = useState(true);

  return (
    <>
      {!showFibaPanel && (
        <button
          onClick={() => setShowFibaPanel(true)}
          style={{
            position: "fixed",
            top: 70,
            right: 10,
            background: "#1a2e40",
            color: "#8ab8d0",
            border: "none",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 12,
            cursor: "pointer",
            zIndex: 1000,
          }}
        >
          ⚙️ FIBA
        </button>
      )}

      {showFibaPanel && (
        <div
          style={{
            position: "relative",
            width: 400,
            overflow: "auto",
            borderLeft: "1px solid #e5e7eb",
            padding: "16px",
            backgroundColor: "#f9fafb",
          }}
        >
          <button
            type="button"
            onClick={() => setShowFibaPanel(false)}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "#666",
              zIndex: 10,
              lineHeight: 1,
              padding: "2px 8px",
            }}
          >
            ×
          </button>

          <div className="space-y-6">
            <GameInfoForm
              gameId={game.id}
              initialData={{
                commissioner: game.commissioner,
                referee1: game.referee1,
                referee2: game.referee2,
                referee3: game.referee3,
                venue: game.venue,
                round: game.round,
              }}
              hideCloseButton={true}
            />
            <div className="border-t pt-4">
              <h2 className="text-sm font-bold mb-4">Тренери команд</h2>
              <TeamInfoForm
                teamId={game.homeTeam.id}
                teamName={game.homeTeam.name}
                initialData={{
                  coachName: game.homeTeam.coachName,
                  assistantCoach: game.homeTeam.assistantCoach,
                }}
                hideCloseButton={true}
              />
              <TeamInfoForm
                teamId={game.awayTeam.id}
                teamName={game.awayTeam.name}
                initialData={{
                  coachName: game.awayTeam.coachName,
                  assistantCoach: game.awayTeam.assistantCoach,
                }}
                hideCloseButton={true}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
