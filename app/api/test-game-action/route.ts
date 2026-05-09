"use server";

import { recordGameAction, undoGameAction } from "@/app/actions/game-events";

export async function POST(req: Request) {
  try {
    const { action, gameId, actionType, playerId, quarter, actionId } = await req.json();

    if (action === "record") {
      const result = await recordGameAction({
        gameId,
        actionType,
        playerId,
        gameClockSeconds: 300,
        quarter: quarter || 1,
        payload: { points: 2 },
      });
      return Response.json(result);
    }

    if (action === "undo" && actionId) {
      const result = await undoGameAction({ gameId, actionId: String(actionId) });
      return Response.json(result);
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[test-game-action]", error);
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
