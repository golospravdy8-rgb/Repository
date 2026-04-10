import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

/**
 * GET /api/admin/vip-activate-from-telegram?userId=X&plan=month
 *
 * Активується VIP для користувача через посилання з Telegram
 * Передбачається для адміна, який натискає посилання з Telegram сповіщення
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const plan = searchParams.get("plan") || "month";
    const secret = searchParams.get("secret");

    // Перевірка secret токену для безпеки
    const expectedSecret = process.env.ADMIN_ACTIVATION_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing secret token" },
        { status: 401 }
      );
    }

    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json(
        { error: "Invalid userId parameter" },
        { status: 400 }
      );
    }

    // Знайти користувача
    const user = await prisma.guestContact.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const PLAN_DURATIONS: Record<string, number> = {
      month: 30,
      season: 90,
      year: 365,
    };

    const durationDays = PLAN_DURATIONS[plan] || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Активувати VIP
    const updated = await prisma.guestContact.update({
      where: { id: Number(userId) },
      data: {
        role: "vip", // Встанови роль як VIP
      },
    });

    // Telegram сповіщення батькові про активацію
    const settings = await prisma.siteSettings.findMany({
      where: {
        key: {
          in: ["shop.tgBotToken"],
        },
      },
    });

    const botToken = settings.find((s) => s.key === "shop.tgBotToken")?.value;

    if (botToken && updated.phone) {
      const message = `
✅ ВІД АДМІНІСТРАЦІЇ!

Ваша заявка на VIP була затверджена!

📦 Активований тариф: ${plan === "month" ? "Місячна" : plan === "season" ? "Сезонна (3 міс)" : "Річна"}
📅 Дійсна до: ${expiresAt.toLocaleDateString("uk-UA")}

Тепер у вас є повний доступ до:
📊 Детальної статистики дитини
📈 Прогресу по матчах
📷 Ексклюзивних фото
🎬 Видео моментів

Радимо з вами! 🎉

👉 Перейти до VIP-кабінету: https://basket-lviv.com/vip
`;

      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: updated.phone.replace("+", ""),
            text: message,
            parse_mode: "HTML",
          }),
        }
      ).catch(() => {
        console.log("User Telegram notification skipped (optional)");
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        phone: updated.phone,
        name: `${updated.firstName} ${updated.lastName}`,
      },
      message: `✅ VIP активовано для ${updated.firstName} ${updated.lastName} на ${durationDays} днів`,
    });
  } catch (error) {
    console.error("GET /api/admin/vip-activate-from-telegram error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
