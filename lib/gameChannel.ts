import { supabase } from './supabase';

/**
 * PRESENCE-BASED GAME CHANNEL
 * Каждый клиент отправляет только своих игроков через track()
 * Все игроки собираются через presenceState()
 */

export interface GamePlayer {
  id: string; // UUID: userId-timestamp
  name: string;
  owner: string; // userId
  x: number;
  y: number;
  status: 'idle' | 'moving' | 'shooting';
  hp: number;
}

export interface PresencePayload {
  userId: string;
  players: GamePlayer[];
}

/**
 * Присоединиться к игровому каналу
 * @param roomId - ID комнаты (general, parents, etc)
 * @param onSync - callback при синхронизации presence
 */
export function joinGameChannel(
  roomId: string,
  onSync: () => void
) {
  const channel = supabase.channel(`game:${roomId}`, {
    config: { presence: { key: `user-${Date.now()}` } }
  });

  // Подписаться на presence sync события
  channel.on('presence', { event: 'sync' }, () => {
    onSync();
  });

  channel.subscribe();
  return channel;
}

/**
 * Отправить свое состояние (только своих игроков)
 * @param channel - Supabase channel
 * @param userId - ID текущего пользователя
 * @param players - Массив своих игроков
 */
export function trackPlayers(
  channel: any,
  userId: string,
  players: GamePlayer[]
) {
  channel.track({
    userId: userId,
    players: players
  });
}

/**
 * Получить всех игроков из presence (с дедупликацией)
 * @param channel - Supabase channel
 * @returns Массив всех игроков (дедупликированный)
 */
export function getAllPlayers(channel: any): GamePlayer[] {
  const presenceState = channel.presenceState();
  const playerMap = new Map<string, GamePlayer & { timestamp: number }>();

  Object.values(presenceState).forEach((userPresence: any) => {
    if (Array.isArray(userPresence) && userPresence[0]?.players) {
      const timestamp = userPresence[0].timestamp || Date.now();
      const players = userPresence[0].players || [];

      players.forEach((player: GamePlayer) => {
        const existing = playerMap.get(player.id);

        // Если дубликат — берём с большим timestamp
        if (existing) {
          if (timestamp > existing.timestamp) {
            playerMap.set(player.id, { ...player, timestamp });
          }
        } else {
          playerMap.set(player.id, { ...player, timestamp });
        }
      });
    }
  });

  // Вернуть массив без timestamp
  return Array.from(playerMap.values()).map(({ timestamp, ...player }) => player);
}

/**
 * Получить количество активных игроков
 * @param channel - Supabase channel
 */
export function getPlayerCount(channel: any): number {
  return getAllPlayers(channel).length;
}

/**
 * Отписаться от канала
 * @param channel - Supabase channel
 */
export function leaveGameChannel(channel: any) {
  if (channel) {
    channel.unsubscribe();
  }
}
