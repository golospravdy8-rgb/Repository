import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const mode = req.nextUrl.searchParams.get("mode") || "weekly";

    // Get all guests with HP (excluding anonymous)
    const guests = await prisma.guestContact.findMany({
      select: {
        phone: true,
        firstName: true,
        lastName: true,
        hp: true,
      },
      where: {
        firstName: { not: "" },
      },
    });

    type LeaderboardEntry = {
      phone: string;
      firstName: string;
      lastName: string;
      hp: number;
      weeklyHp?: number;
    };

    let leaderboard: LeaderboardEntry[] = guests;
    let weekStart = "";

    if (mode === "weekly") {
      // Calculate Monday of current week
      const now = new Date();
      const dayOfWeek = now.getDay() || 7; // Sunday = 7
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      monday.setHours(0, 0, 0, 0);
      weekStart = monday.toISOString();

      // Get weekly HP from spins this week
      const weeklySpins = await prisma.chatDailySpin.findMany({
        where: {
          createdAt: {
            gte: monday,
            lte: new Date(),
          },
        },
        select: {
          phone: true,
          hpGained: true,
        },
      });

      // Group by phone and sum HP
      const weeklyHpMap = new Map<string, number>();
      weeklySpins.forEach((spin) => {
        weeklyHpMap.set(
          spin.phone,
          (weeklyHpMap.get(spin.phone) || 0) + spin.hpGained
        );
      });

      // Merge weekly HP into leaderboard
      leaderboard = guests.map((guest) => ({
        ...guest,
        weeklyHp: weeklyHpMap.get(guest.phone) || 0,
      }));
    }

    // Sort by mode
    const sorted = [...leaderboard].sort((a, b) => {
      if (mode === "weekly") {
        return (b.weeklyHp ?? 0) - (a.weeklyHp ?? 0);
      }
      return b.hp - a.hp;
    });

    // Limit to top 20
    const top20 = sorted.slice(0, 20);

    return NextResponse.json({
      leaderboard: top20,
      weekStart,
      mode,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard", leaderboard: [] },
      { status: 500 }
    );
  }
}
