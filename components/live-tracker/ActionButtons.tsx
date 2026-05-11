"use client";

// DEPRECATED — використовуй StatEntryGrid замість цього компонента

interface Props {
  gameId: number;
  teamId: number;
  playerId: number | null;
  disabled?: boolean;
  btnBlue?: string;
  btnOrange?: string;
  btnNavy?: string;
  btnRed?: string;
}

export default function ActionButtons({}: Props) {
  return <div>— deprecated —</div>;
}
