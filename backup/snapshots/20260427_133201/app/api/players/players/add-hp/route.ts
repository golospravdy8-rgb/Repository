import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';
export const dynamic = "force-dynamic";

/**
 * POST /api/players/add-hp
 * Добавляет HP (здоровье/очки) игроку
 *
 * Тело запроса:
 * {
 *   playerId: string,      // ID игрока или имя
 *   hp: number,            // Количество HP для добавления
 *   reason: string,        // Причина (например, "Rucheek game win")
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerId, hp, reason } = body;

    if (!playerId || !hp || typeof hp !== 'number') {
      return NextResponse.json(
        { error: "Missing required fields: playerId, hp" },
        { status: 400 }
      );
    }

    // Попытаться найти игрока по ID
    let player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    // Если не найден по ID, попробовать найти по имени (для fallback)
    if (!player && typeof playerId === 'string') {
      player = await prisma.player.findFirst({
        where: {
          OR: [
            { firstName: { contains: playerId, mode: 'insensitive' } },
            { lastName: { contains: playerId, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!player) {
      console.warn(`[ADD-HP] Player not found: ${playerId}`);
      // Не выбрасываем ошибку, просто логируем (игрок может быть локальным)
      return NextResponse.json({
        success: false,
        message: `Player not found: ${playerId}`,
      });
    }

    // Добавить HP к текущему значению
    const updatedPlayer = await prisma.player.update({
      where: { id: player.id },
      data: {
        hp: (player.hp || 0) + hp,
      },
    });

    console.log(
      `[ADD-HP] +${hp} HP to ${player.firstName} ${player.lastName} (Reason: ${reason}). Total: ${updatedPlayer.hp}`
    );

    return NextResponse.json({
      success: true,
      message: `Added ${hp} HP to ${player.firstName} ${player.lastName}`,
      player: {
        id: updatedPlayer.id,
        name: `${updatedPlayer.firstName} ${updatedPlayer.lastName}`,
        hp: updatedPlayer.hp,
      },
    });
  } catch (e) {
    console.error('[ADD-HP] Error:', e);
    return NextResponse.json(
      { error: String(e), success: false },
      { status: 500 }
    );
  }
}
