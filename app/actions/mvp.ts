"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const submitMvpVoteSchema = z.object({
  phone: z.string().min(1, "Phone required"),
  playerId: z.number().int().positive("Invalid player ID"),
});

export async function submitMvpVote(phone: string, playerId: number) {
  try {
    // Validate input
    const validated = submitMvpVoteSchema.parse({ phone, playerId });

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Verify player exists and belongs to an active season
    const player = await prisma.player.findUnique({
      where: { id: validated.playerId },
      include: {
        team: {
          include: {
            season: true,
          },
        },
      },
    });

    if (!player) {
      return { success: false, error: "Player not found" };
    }

    if (!player.team.season.isActive) {
      return { success: false, error: "Player's season is not active" };
    }

    // Upsert vote (only one vote per phone per month)
    await prisma.chatMvpVote.upsert({
      where: {
        voterPhone_month: {
          voterPhone: validated.phone,
          month,
        },
      },
      update: { playerId: validated.playerId },
      create: {
        voterPhone: validated.phone,
        playerId: validated.playerId,
        month,
      },
    });

    revalidatePath("/chat");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input" };
    }
    console.error("MVP vote error:", error);
    return { success: false, error: "Failed to submit vote" };
  }
}
