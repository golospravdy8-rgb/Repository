import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory counter (for production use Redis or database)
let globalOrderCounter: { [room: string]: number } = {};

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

  // Initialize counter for this room if not exists
  if (!globalOrderCounter[gameRoomId]) {
    globalOrderCounter[gameRoomId] = 0;
  }

  // Increment and assign next order
  globalOrderCounter[gameRoomId]++;
  const assignedOrder = globalOrderCounter[gameRoomId];

  console.log(`[GET-ORDER] Room=${gameRoomId}, Assigned order=${assignedOrder}`);

  res.status(200).json({ order: assignedOrder });
}
