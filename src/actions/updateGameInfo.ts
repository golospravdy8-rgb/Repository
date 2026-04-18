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
}) {
  try {
    await prisma.game.update({
      where: { id: gameId },
      data: {
        commissioner: data.commissioner || null,
        referee1: data.referee1 || null,
        referee2: data.referee2 || null,
        referee3: data.referee3 || null,
        venue: data.venue || null,
        round: data.round || null,
      },
    });
    revalidatePath(`/admin/games/${gameId}`);
    revalidatePath(`/game/${gameId}`);
    return { success: true };
  } catch (error) {
    console.error("[updateGameInfo]", error);
    return { success: false, error: String(error) };
  }
}
