"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateGameInfo(gameId: number, data: {
  commissioner?: string;
  referee1?: string;
  referee2?: string;
  referee3?: string;
  venue?: string;
  round?: string;
  referee?: string;
  umpire1?: string;
  umpire2?: string;
  scorer?: string;
  assistantScorer?: string;
  timer?: string;
  shotClockOperator?: string;
  gameNumber?: string;
  protest?: boolean;
  protestNote?: string;
}) {
  try {
    await prisma.game.update({
      where: { id: gameId },
      data: {
        commissioner: data.commissioner || null,
        referee1: data.referee || data.referee1 || null,
        referee2: data.umpire1 || data.referee2 || null,
        referee3: data.umpire2 || data.referee3 || null,
        referee: data.referee || null,
        umpire1: data.umpire1 || null,
        umpire2: data.umpire2 || null,
        scorer: data.scorer || null,
        assistantScorer: data.assistantScorer || null,
        timer: data.timer || null,
        shotClockOperator: data.shotClockOperator || null,
        gameNumber: data.gameNumber || null,
        venue: data.venue || null,
        round: data.round || null,
        protest: data.protest ?? false,
        protestNote: data.protestNote || null,
      },
    });
    revalidatePath(`/admin/games/${gameId}`);
    revalidatePath(`/game/${gameId}`);
    revalidatePath(`/game/${gameId}/secretarial-protocol`);
    return { success: true };
  } catch (error) {
    console.error("[updateGameInfo]", error);
    return { success: false, error: String(error) };
  }
}
