"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const submitMvpVoteSchema = z.object({
  phone: z.string().min(1, "Phone required"),
  playerName: z.string().min(1, "Player name required"),
});

export async function submitMvpVote(phone: string, playerName: string) {
  try {
    // Validate input
    const validated = submitMvpVoteSchema.parse({ phone, playerName });

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Upsert vote (only one vote per phone per month)
    await prisma.chatMvpVote.upsert({
      where: {
        voterPhone_month: {
          voterPhone: validated.phone,
          month,
        },
      },
      update: { playerName: validated.playerName },
      create: {
        voterPhone: validated.phone,
        playerName: validated.playerName,
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
