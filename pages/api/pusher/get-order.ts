import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameRoomId } = req.body;

  if (!gameRoomId) {
    return res.status(400).json({ error: 'gameRoomId required' });
  }

  try {
    // 🏀 RUCHEEK: Persistent counter in database (survives hot-reload)
    const counterKey = `game_order_${gameRoomId}`;

    // Get current counter value
    let counterSetting = await prisma.siteSettings.findUnique({
      where: { key: counterKey }
    });

    // Initialize if doesn't exist
    if (!counterSetting) {
      counterSetting = await prisma.siteSettings.create({
        data: {
          key: counterKey,
          value: '0'
        }
      });
    }

    // Increment counter atomically
    const currentValue = parseInt(counterSetting.value, 10);
    const nextValue = currentValue + 1;

    await prisma.siteSettings.update({
      where: { key: counterKey },
      data: { value: nextValue.toString() }
    });

    console.log(`[GET-ORDER] Room=${gameRoomId}, Assigned order=${nextValue}`);

    res.status(200).json({ order: nextValue });
  } catch (error) {
    console.error('[GET-ORDER] Error:', error);
    res.status(500).json({ error: 'Failed to get order', details: String(error) });
  }
}
