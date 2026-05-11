"use client";

// DEPRECATED — використовуй StatEntryGrid замість цього компонента

interface Props {
  gameId: number;
  teamId: number;
  playerId: number | null;
  disabled?: boolean;
}

export default function ScoreButtons({}: Props) {
  return <div>— deprecated —</div>;
}
