import type { NextApiRequest, NextApiResponse } from 'next';
import { resetOrder } from '../../../lib/gameOrderCounter';

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

  // Reset the counter for this room
  resetOrder(gameRoomId);

  console.log(`[RESET-ORDER] Room=${gameRoomId}, Counter reset to 0`);

  res.status(200).json({ message: 'Order counter reset', gameRoomId });
}
