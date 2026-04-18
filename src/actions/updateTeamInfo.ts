"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateTeamInfo(teamId: number, data: {
  coachName?: string;
  assistantCoach?: string;
}) {
  try {
    await prisma.team.update({
      where: { id: teamId },
      data: {
        coachName: data.coachName || null,
        assistantCoach: data.assistantCoach || null,
      },
    });
    revalidatePath("/admin/teams");
    revalidatePath(`/admin/games`);
    return { success: true };
  } catch (error) {
    console.error("[updateTeamInfo]", error);
    return { success: false, error: String(error) };
  }
}
