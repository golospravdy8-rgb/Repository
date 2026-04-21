import { supabase } from './supabase';

export function joinGameChannel(roomId: string, onEvent: (ev: any) => void) {
  const channel = supabase.channel(`game:${roomId}`, {
    config: { broadcast: { self: false } }
  });
  channel.on('broadcast', { event: 'game' }, ({ payload }) => onEvent(payload));
  channel.subscribe();
  return channel;
}

export function sendGameEvent(channel: any, data: any) {
  channel.send({ type: 'broadcast', event: 'game', payload: data });
}
