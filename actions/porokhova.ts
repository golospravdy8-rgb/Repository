"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Спеціальний ID для події "Порохова"
const POROKHOVA_GAME_ID = 999;

export interface PorokhovaParticipant {
  phone: string;
  firstName: string;
  lastName: string;
  status: "going" | "later" | "needed";
}

/**
 * Загружає всіх учасників події "Порохова" з БД
 * @returns Список учасників з статусами
 */
export async function loadPorokhovaParticipants(): Promise<PorokhovaParticipant[]> {
  try {
    const participants = await prisma.gameRsvp.findMany({
      where: { gameId: POROKHOVA_GAME_ID },
      select: {
        phone: true,
        name: true,
        role: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return participants.map((p) => {
      const [firstName, lastName] = p.name.split(" ");
      return {
        phone: p.phone,
        firstName: firstName || "User",
        lastName: lastName || "",
        status: (p.role || "going") as "going" | "later" | "needed",
      };
    });
  } catch (error) {
    console.error("[loadPorokhovaParticipants] Error:", error);
    return [];
  }
}

/**
 * Реєструє/оновлює учасника події "Порохова"
 * Зберігає вибір на сервері через GameRsvp модель
 * @param phone Номер телефону учасника
 * @param firstName Ім'я
 * @param lastName Прізвище
 * @param status Вибір: "going" | "later" | "needed"
 * @returns Оновлений список всіх учасників
 */
export async function registerPorokhovaParticipant(
  phone: string,
  firstName: string,
  lastName: string,
  status: "going" | "later" | "needed"
): Promise<PorokhovaParticipant[]> {
  try {
    const fullName = `${firstName} ${lastName}`.trim();

    // Зберігаємо/оновлюємо учасника
    await prisma.gameRsvp.upsert({
      where: { gameId_phone: { gameId: POROKHOVA_GAME_ID, phone } },
      update: {
        name: fullName,
        role: status,
      },
      create: {
        gameId: POROKHOVA_GAME_ID,
        phone,
        name: fullName,
        role: status,
      },
    });

    // Завантажуємо оновлений список
    const participants = await loadPorokhovaParticipants();

    // Перевалідуємо шлях для оновлення кеша
    revalidatePath("/chat");

    return participants;
  } catch (error) {
    console.error("[registerPorokhovaParticipant] Error:", error);
    throw new Error("Failed to register participant");
  }
}
