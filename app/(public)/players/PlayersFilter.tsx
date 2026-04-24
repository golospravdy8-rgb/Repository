"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";

export default function PlayersFilter({
  teams,
  positions,
  activeTeam,
  activePosition,
}: {
  teams: string[];
  positions: string[];
  activeTeam: string;
  activePosition: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [team, setTeam] = useState(activeTeam);
  const [position, setPosition] = useState(activePosition);

  // Sync local state with server-rendered props on navigation
  useEffect(() => { setTeam(activeTeam); }, [activeTeam]);
  useEffect(() => { setPosition(activePosition); }, [activePosition]);

  function apply(newTeam: string, newPosition: string) {
    const params = new URLSearchParams();
    if (newTeam) params.set("team", newTeam);
    if (newPosition) params.set("position", newPosition);
    const ag = searchParams?.get("ag");
    if (ag) params.set("ag", ag);
    const qs = params.toString();
    startTransition(() => {
      router.push("/players" + (qs ? "?" + qs : ""));
    });
  }

  return (
    <div className="bg-white rounded-xl shadow p-2 mb-2 flex flex-wrap gap-2 items-center">
      <select
        value={team}
        disabled={isPending}
        onChange={(e) => { setTeam(e.target.value); apply(e.target.value, position); }}
        className="px-3 py-2 rounded-lg border border-gray-200 text-2xl font-medium text-gray-700 bg-white cursor-pointer"
      >
        <option value="">Всі команди</option>
        {teams.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        value={position}
        disabled={isPending}
        onChange={(e) => { setPosition(e.target.value); apply(team, e.target.value); }}
        className="px-3 py-2 rounded-lg border border-gray-200 text-2xl font-medium text-gray-700 bg-white cursor-pointer"
      >
        <option value="">Всі позиції</option>
        {positions.map((pos) => (
          <option key={pos} value={pos}>{pos}</option>
        ))}
      </select>

      {position && !isPending && (
        <button
          onClick={() => { setPosition(""); apply(team, ""); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-2xl text-gray-500 hover:bg-gray-50 cursor-pointer"
        >
          Всі позиції ✕
        </button>
      )}

      {isPending && <span className="text-2xl text-gray-400">Завантаження...</span>}
    </div>
  );
}
