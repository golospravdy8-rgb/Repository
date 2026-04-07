import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Идентификатор события "Порохова" (можно сделать переменной или конфигом)
const POROKHOVA_GAME_ID = 999; // Специальный ID для события Порохова

export async function GET() {
  try {
    // Загружаем все участников события Порохова
    const participants = await prisma.gameRsvp.findMany({
      where: { gameId: POROKHOVA_GAME_ID },
      select: {
        phone: true,
        name: true,
        role: true, // Используем role как status (going/later/needed)
      },
      orderBy: { createdAt: "desc" },
    });

    // Преобразуем в нужный формат
    const formattedParticipants = participants.map((p) => {
      const [firstName, lastName] = p.name.split(" ") || ["", ""];
      return {
        phone: p.phone,
        firstName: firstName || "User",
        lastName: lastName || "",
        status: p.role as "going" | "later" | "needed",
      };
    });

    return NextResponse.json({
      success: true,
      participants: formattedParticipants,
    });
  } catch (error) {
    console.error("[Porokhova GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch participants" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, phone, firstName, lastName, status } = body;

    if (action === "register") {
      // Сохраняем или обновляем участника события Порохова
      const fullName = `${firstName} ${lastName}`.trim();

      const participant = await prisma.gameRsvp.upsert({
        where: { gameId_phone: { gameId: POROKHOVA_GAME_ID, phone } },
        update: {
          name: fullName,
          role: status, // Сохраняем status в поле role
        },
        create: {
          gameId: POROKHOVA_GAME_ID,
          phone,
          name: fullName,
          role: status,
        },
      });

      // Загружаем обновленный список всех участников
      const allParticipants = await prisma.gameRsvp.findMany({
        where: { gameId: POROKHOVA_GAME_ID },
        select: {
          phone: true,
          name: true,
          role: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const formattedParticipants = allParticipants.map((p) => {
        const [fn, ln] = p.name.split(" ") || ["", ""];
        return {
          phone: p.phone,
          firstName: fn || "User",
          lastName: ln || "",
          status: p.role as "going" | "later" | "needed",
        };
      });

      return NextResponse.json({
        success: true,
        participant: {
          phone,
          firstName,
          lastName,
          status,
        },
        participants: formattedParticipants,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Porokhova POST] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to register participant" },
      { status: 500 }
    );
  }
}
