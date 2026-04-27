// 🏀 RUCHEEK: Global game order counter (in-memory)
// For production: use Redis or database instead
let globalOrderCounter: { [room: string]: number } = {};

export function getNextOrder(gameRoomId: string): number {
  if (!globalOrderCounter[gameRoomId]) {
    globalOrderCounter[gameRoomId] = 0;
  }
  globalOrderCounter[gameRoomId]++;
  return globalOrderCounter[gameRoomId];
}

export function resetOrder(gameRoomId: string): void {
  globalOrderCounter[gameRoomId] = 0;
}

export function getCurrentOrder(gameRoomId: string): number {
  return globalOrderCounter[gameRoomId] || 0;
}
