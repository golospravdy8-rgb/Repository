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
    // 🏀 RUCHEEK: Reset counter in database
    const counterKey = `game_order_${gameRoomId}`;

    // Delete the counter setting to reset it
    await prisma.siteSettings.delete({
      where: { key: counterKey }
    }).catch(() => {
      // It's OK if it doesn't exist
    });

    console.log(`[RESET-ORDER] Room=${gameRoomId}, Counter reset`);

    res.status(200).json({ message: 'Order counter reset', gameRoomId });
  } catch (error) {
    console.error('[RESET-ORDER] Error:', error);
    res.status(500).json({ error: 'Failed to reset order', details: String(error) });
  }
}
