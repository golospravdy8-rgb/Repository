import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/vip/purchase-request
 *
 * Батько подає заявку на VIP після оплати в Monobank
 * Адміну надсилається сповіщення на активацію
 */

interface VIPPurchaseRequest {
  phone: string;
  firstName: string;
  lastName: string;
  plan: "month" | "season" | "year";
  amount: number;
  telegramId?: string; // Telegram ID батька для сповіщень
}

const PLAN_DURATIONS: Record<string, number> = {
  month: 30,
  season: 90,
  year: 365,
};

const PLAN_NAMES: Record<string, string> = {
  month: "Місячна підписка",
  season: "Сезонна підписка (3 міс)",
  year: "Річна підписка",
};

const PLAN_AMOUNTS: Record<string, number> = {
  month: 99,
  season: 249,
  year: 799,
};

export async function POST(req: NextRequest) {
  try {
    const body: VIPPurchaseRequest = await req.json();
    const { phone, firstName, lastName, plan, amount, telegramId } = body;

    if (!phone || !firstName || !lastName || !plan || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: phone, firstName, lastName, plan, amount" },
        { status: 400 }
      );
    }

    // Знайди або створи користувача
    const user = await prisma.guestContact.upsert({
      where: { phone },
      update: {
        firstName,
        lastName,
        telegramId: telegramId || undefined, // Оновити Telegram ID якщо надано
      },
      create: {
        phone,
        firstName,
        lastName,
        role: "parent", // Батьки мають роль "parent" поки не активують VIP
        telegramId: telegramId || undefined,
      },
    });

    const durationDays = PLAN_DURATIONS[plan] || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Отримай site settings для Telegram credentials
    const settings = await prisma.siteSettings.findMany({
      where: {
        key: {
          in: [
            "shop.tgBotToken",
            "vip.tgAdminChatId",
            "shop.tgChatId",
          ],
        },
      },
    });

    const botToken = settings.find((s) => s.key === "shop.tgBotToken")?.value;
    const adminChatId = settings.find((s) => s.key === "vip.tgAdminChatId")?.value;
    const channelId = settings.find((s) => s.key === "shop.tgChatId")?.value;

    // Надішли Telegram сповіщення адміну (особисто)
    if (botToken && adminChatId) {
      await sendTelegramToAdmin({
        botToken,
        adminChatId,
        userName: `${firstName} ${lastName}`,
        phone,
        plan: PLAN_NAMES[plan],
        amount,
        userId: user.id,
      });
    }

    // Надішли Telegram сповіщення в канал федерації
    if (botToken && channelId) {
      await sendTelegramToChannel({
        botToken,
        channelId,
        childName: user.displayName || `${firstName} ${lastName}`,
        plan: PLAN_NAMES[plan],
      }).catch(() => {
        console.log("Channel notification skipped (optional)");
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: `${firstName} ${lastName}`,
        role: user.role,
      },
      vipRequest: {
        plan,
        amount,
        durationDays,
        message: `✅ Заявка на VIP отримана. Адміну надіслано повідомлення на активацію.`,
      },
    });
  } catch (error) {
    console.error("POST /api/vip/purchase-request error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Надішли Telegram сповіщення адміну (особисто) з inline кнопкою
 */
async function sendTelegramToAdmin(params: {
  botToken: string;
  adminChatId: string;
  userName: string;
  phone: string;
  plan: string;
  amount: number;
  userId: number;
}) {
  const activateSecret = process.env.ADMIN_ACTIVATION_SECRET || "default_secret";
  const activateLink = `https://basket-lviv.com/api/admin/vip-activate-from-telegram?userId=${params.userId}&plan=${params.plan}&secret=${activateSecret}`;

  const message = `🏆 НОВА VIP ЗАЯВКА!

👤 Батько: ${params.userName}
📱 Телефон: ${params.phone}
📦 Тариф: ${params.plan}
💰 Сума: ${params.amount}₴
📅 Дата: ${new Date().toLocaleDateString("uk-UA")} о ${new Date().toLocaleTimeString("uk-UA")}
🆔 User ID: ${params.userId}
──────────────────`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${params.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: params.adminChatId,
          text: message,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              {
                text: "✅ АКТИВУВАТИ VIP",
                url: activateLink,
              }
            ]]
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Telegram admin message failed:", error);
    } else {
      console.log("✅ Telegram admin notification sent with activation button");
    }
  } catch (error) {
    console.error("Failed to send Telegram admin notification:", error);
  }
}

/**
 * Надішли Telegram сповіщення в канал федерації
 */
async function sendTelegramToChannel(params: {
  botToken: string;
  channelId: string;
  childName: string;
  plan: string;
}) {
  const message = `
✅ Новий VIP-учасник!

👨‍👩‍👦 Батько гравця приєднався до VIP
📦 Тариф: ${params.plan}

Дякуємо за підтримку! 🙏
`;

  const response = await fetch(
    `https://api.telegram.org/bot${params.botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: params.channelId,
        text: message,
        parse_mode: "HTML",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("Telegram channel message failed:", error);
    throw error;
  }

  console.log("✅ Telegram channel notification sent to", params.channelId);
}
