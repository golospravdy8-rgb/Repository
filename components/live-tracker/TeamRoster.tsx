"use client";

import { useState, useTransition } from "react";
import { addPlayer, removePlayer } from "@/actions/game";
import type { Player } from "@prisma/client";

interface Props {
  team: { id: number; name: string; players: Player[] };
  gameId: number;
}

export default function TeamRoster({ team, gameId }: Props) {
  const [open, setOpen] = useState(false);
  const [num, setNum] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [pos, setPos] = useState("");
  const [pending, startTransition] = useTransition();

  const handleAdd = () => {
    const n = parseInt(num);
    if (!first.trim() || !last.trim() || isNaN(n)) return;
    startTransition(async () => {
      await addPlayer(team.id, gameId, first.trim(), last.trim(), n, pos.trim());
      setNum(""); setFirst(""); setLast(""); setPos(""); setOpen(false);
    });
  };

  const handleRemove = (playerId: number) => {
    if (!confirm("Видалити гравця?")) return;
    startTransition(() => removePlayer(playerId, gameId));
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-4 py-3 text-white font-bold text-sm flex items-center justify-between" style={{ backgroundColor: "#1a2744" }}>
        <span>{team.name}</span>
        <button
          onClick={() => setOpen(v => !v)}
          className="text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-lg transition-colors"
        >
          {open ? "✕" : "+ Гравець"}
        </button>
      </div>

      {open && (
        <div className="p-3 border-b border-gray-100 bg-gray-50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-full"
              placeholder="Ім'я"
              value={first}
              onChange={e => setFirst(e.target.value)}
            />
            <input
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-full"
              placeholder="Прізвище"
              value={last}
              onChange={e => setLast(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-full"
              placeholder="№ (номер)"
              type="number"
              value={num}
              onChange={e => setNum(e.target.value)}
            />
            <input
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-full"
              placeholder="Позиція (PG…)"
              value={pos}
              onChange={e => setPos(e.target.value)}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={pending || !first || !last || !num}
            className="w-full py-1.5 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: "#f97316" }}
          >
            {pending ? "..." : "Додати"}
          </button>
        </div>
      )}

      <div className="divide-y">
        {team.players.map(p => (
          <div key={p.id} className="px-4 py-2 flex items-center gap-3 text-sm group">
            <span className="font-bold text-xs w-6 text-center" style={{ color: "#f97316" }}>
              #{p.number}
            </span>
            <span className="text-gray-800 flex-1">
              {p.firstName} {p.lastName}
            </span>
            {p.position && <span className="text-gray-400 text-xs">{p.position}</span>}
            <button
              onClick={() => handleRemove(p.id)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity"
              title="Видалити"
            >
              ✕
            </button>
          </div>
        ))}
        {team.players.length === 0 && (
          <div className="px-4 py-4 text-gray-400 text-sm text-center">
            Гравців не додано
          </div>
        )}
      </div>
    </div>
  );
}
