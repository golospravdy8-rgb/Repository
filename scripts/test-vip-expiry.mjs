import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Обновить VIP дату на вчера (истекла)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const updated = await prisma.guestContact.update({
    where: { id: 131 },
    data: { vipExpiresAt: yesterday },
  });

  console.log(`✅ VIP закінчилась ${yesterday.toISOString()}`);
  console.log(`📊 Користувач: ${updated.firstName} ${updated.lastName}`);
  console.log(`📱 Telegram: ${updated.telegramId}`);

  process.exit(0);
}

main().catch(console.error);
