import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/vip-activate-manual
 *
 * Активує VIP для користувача (з адмін панелі)
 * Вимагає userId і план
 */

interface VIPActivateRequest {
  userId: number;
  plan?: 'month' | 'season' | 'year';
}

const PLAN_DURATIONS: Record<string, number> = {
  month: 30,
  season: 90,
  year: 365,
};

const PLAN_NAMES: Record<string, string> = {
  month: 'Місячна підписка',
  season: 'Сезонна підписка (3 міс)',
  year: 'Річна підписка',
};

export async function POST(req: NextRequest) {
  try {
    const body: VIPActivateRequest = await req.json();
    const { userId, plan = 'month' } = body;

    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json(
        { error: 'Invalid userId' },
        { status: 400 }
      );
    }

    if (!PLAN_DURATIONS[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan. Use: month, season, or year' },
        { status: 400 }
      );
    }

    // Знайти користувача
    const user = await prisma.guestContact.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Обчислити дату закінчення VIP
    const durationDays = PLAN_DURATIONS[plan];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Активувати VIP
    const updated = await prisma.guestContact.update({
      where: { id: Number(userId) },
      data: {
        vipStatus: true,
        vipExpiresAt: expiresAt,
        role: 'vip', // Змініть роль на VIP
      },
    });

    // Надіслати Telegram сповіщення батькові
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    let notificationSent = false;

    if (botToken && updated.telegramId) {
      // Спроба відправити через Telegram ID (якщо є)
      const message = `✅ ВІД АДМІНІСТРАЦІЇ!

Ваша заявка на VIP була затверджена адміністратором!

📦 Активований тариф: ${PLAN_NAMES[plan]}
📅 Дійсна до: ${expiresAt.toLocaleDateString('uk-UA')}

Тепер у вас є повний доступ до:
📊 Детальної статистики дитини
📈 Прогресу по матчах
📷 Ексклюзивних фото
🎬 Видео моментів

Радимо з вами! 🎉

👉 Перейти до VIP-кабінету: https://basket-lviv.com/vip`;

      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: updated.telegramId,
            text: message,
            parse_mode: 'HTML',
          }),
        }
      ).then(() => {
        notificationSent = true;
      }).catch(() => {
        console.log('Telegram notification to Telegram ID failed, trying phone...');
      });
    }

    // Якщо не вдалось через Telegram ID - спробувати через номер телефону
    if (!notificationSent && botToken && updated.phone) {
      const phoneId = updated.phone.replace('+', '');
      const message = `✅ ВІД АДМІНІСТРАЦІЇ!

Ваша заявка на VIP була затверджена адміністратором!

📦 Активований тариф: ${PLAN_NAMES[plan]}
📅 Дійсна до: ${expiresAt.toLocaleDateString('uk-UA')}

Тепер у вас є повний доступ до:
📊 Детальної статистики дитини
📈 Прогресу по матчах
📷 Ексклюзивних фото
🎬 Видео моментів

Радимо з вами! 🎉

👉 Перейти до VIP-кабінету: https://basket-lviv.com/vip`;

      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: phoneId,
            text: message,
            parse_mode: 'HTML',
          }),
        }
      ).catch(() => {
        console.log('User Telegram notification skipped (optional)');
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        phone: updated.phone,
        name: `${updated.firstName} ${updated.lastName}`,
        vipStatus: updated.vipStatus,
        vipExpiresAt: updated.vipExpiresAt,
      },
      message: `✅ VIP активовано для ${updated.firstName} ${updated.lastName} на ${durationDays} днів`,
    });
  } catch (error) {
    console.error('POST /api/admin/vip-activate-manual error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
