import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/vip/player-stats?playerId=X
 *
 * Отримання статистики гравця з реальних ігрових даних
 * Включає: голи, передачі, фоли, хвилини, прогрес по матчах
 */

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId");

    if (!playerId || isNaN(Number(playerId))) {
      return NextResponse.json(
        { error: "Invalid playerId" },
        { status: 400 }
      );
    }

    const player = await prisma.player.findUnique({
      where: { id: Number(playerId) },
      include: {
        team: {
          include: { season: true },
        },
        boxScores: {
          include: {
            game: true,
          },
          orderBy: {
            game: {
              scheduledAt: "desc",
            },
          },
          take: 20, // Останні 20 матчів
        },
        gameEvents: {
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
        },
      },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    // Обчисли статистику
    const totalStats = {
      gamesPlayed: player.boxScores.length,
      totalPoints: player.boxScores.reduce((sum, bs) => sum + bs.points, 0),
      totalRebounds: player.boxScores.reduce((sum, bs) => sum + bs.rebounds, 0),
      totalAssists: player.boxScores.reduce((sum, bs) => sum + bs.assists, 0),
      totalSteals: player.boxScores.reduce((sum, bs) => sum + bs.steals, 0),
      totalBlocks: player.boxScores.reduce((sum, bs) => sum + bs.blocks, 0),
      totalFouls: player.boxScores.reduce((sum, bs) => sum + bs.fouls, 0),
      starterGames: player.boxScores.filter((bs) => bs.isStarter).length,
      benchGames: player.boxScores.filter((bs) => !bs.isStarter).length,
    };

    // Середні показники на матч
    const avgStats = totalStats.gamesPlayed > 0 ? {
      pointsPerGame: (totalStats.totalPoints / totalStats.gamesPlayed).toFixed(1),
      reboundsPerGame: (totalStats.totalRebounds / totalStats.gamesPlayed).toFixed(1),
      assistsPerGame: (totalStats.totalAssists / totalStats.gamesPlayed).toFixed(1),
    } : { pointsPerGame: "0", reboundsPerGame: "0", assistsPerGame: "0" };

    // Прогрес по матчах (останні 10)
    const recentGames = player.boxScores.slice(0, 10).map((bs) => ({
      date: bs.game.scheduledAt,
      points: bs.points,
      rebounds: bs.rebounds,
      assists: bs.assists,
      fouls: bs.fouls,
      isStarter: bs.isStarter,
      homeTeamScore: bs.game.homeScore,
      awayTeamScore: bs.game.awayScore,
    }));

    return NextResponse.json({
      player: {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        number: player.number,
        position: player.position,
        photoUrl: player.photoUrl,
        team: {
          id: player.team.id,
          name: player.team.name,
          shortName: player.team.shortName,
          season: {
            ageGroup: player.team.season.ageGroup,
          },
        },
      },
      totalStats,
      avgStats,
      recentGames,
      eventCounts: {
        points: player.gameEvents.filter((e) => e.type === "POINTS").length,
        fouls: player.gameEvents.filter(
          (e) => e.type === "FOUL" || e.type === "FOUL_TECHNICAL"
        ).length,
        steals: player.gameEvents.filter((e) => e.type === "STEAL").length,
        blocks: player.gameEvents.filter((e) => e.type === "BLOCK").length,
      },
    });
  } catch (error) {
    console.error("GET /api/vip/player-stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
