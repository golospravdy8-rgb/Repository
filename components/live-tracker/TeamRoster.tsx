"use client";

// DEPRECATED — використовуй DraggableRosterPanel замість цього компонента

import type { Player } from "@prisma/client";

interface Props {
  team: { id: number; name: string; players: Player[] };
  gameId: number;
}

export default function TeamRoster({}: Props) {
  return <div>— deprecated —</div>;
}
