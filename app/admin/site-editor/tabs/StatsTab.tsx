"use client";
import { useState, useEffect } from "react";

type AgeGroup = "younger" | "older";

type PlayerStat = {
  id: number;
  firstName: string;
  lastName: string;
  points: number;
  rebounds: number;
  assists: number;
  blocks: number;
  steals: number;
};

type EditState = {
  points: number;
  rebounds: number;
  assists: number;
  blocks: number;
  steals: number;
};

const fields: { key: keyof EditState; label: string }[] = [
  { key: "points", label: "Очки" },
  { key: "rebounds", label: "Підбори" },
  { key: "assists", label: "Передачі" },
  { key: "blocks", label: "Блоки" },
  { key: "steals", label: "Перехоплення" },
];

export default function StatsTab() {
  const [ag, setAg] = useState<AgeGroup>("younger");
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/stats/players?ag=${ag}`)
      .then(r => r.json())
      .then(d => { setPlayers(d.players || []); setLoading(false); });
  };

  useEffect(() => {
    setEditingId(null);
    setEditValues(null);
    load();
  }, [ag]);

  const startEdit = (pl: PlayerStat) => {
    setEditingId(pl.id);
    setEditValues({
      points: pl.points,
      rebounds: pl.rebounds,
      assists: pl.assists,
      blocks: pl.blocks,
      steals: pl.steals,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const save = async (playerId: number) => {
    if (!editValues) return;
    setSaving(true);
    await fetch("/api/admin/stats/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, ...editValues }),
    });
    setSaving(false);
    setEditingId(null);
    setEditValues(null);
    load();
  };

  const reset = async (playerId: number) => {
    if (!confirm("Обнулити статистику цього гравця?")) return;
    setResetting(playerId);
    await fetch("/api/admin/stats/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    setResetting(null);
    if (editingId === playerId) cancelEdit();
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black" style={{ color: "#1a2744" }}>📊 Статистика гравців</h2>
        <div className="flex gap-2">
          {(["younger", "older"] as AgeGroup[]).map(g => (
            <button key={g} onClick={() => setAg(g)}
              className="px-3 py-1 rounded-full text-sm font-bold transition-all"
              style={{ background: ag === g ? "#f97316" : "#f1f5f9", color: ag === g ? "white" : "#64748b" }}>
              {g === "younger" ? "U-14" : "U-16"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#1a2744", color: "white" }}>
              <th className="px-3 py-2 text-left">Гравець</th>
              {fields.map(f => <th key={f.key} className="px-2 py-2 text-center">{f.label}</th>)}
              <th className="px-2 py-2 text-center">Дії</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Завантаження...</td></tr>
            ) : players.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Немає гравців</td></tr>
            ) : players.map((pl, i) => {
              const isEditing = editingId === pl.id;
              return (
                <tr key={pl.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                  <td className="px-3 py-2 font-medium">{pl.firstName} {pl.lastName}</td>
                  {fields.map(f => (
                    <td key={f.key} className="px-2 py-1 text-center">
                      {isEditing && editValues ? (
                        <input
                          type="number"
                          min={0}
                          value={editValues[f.key]}
                          onChange={e => setEditValues(prev => prev ? { ...prev, [f.key]: Math.max(0, parseInt(e.target.value) || 0) } : prev)}
                          className="w-14 text-center border border-orange-300 rounded px-1 py-0.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                      ) : (
                        <span className="font-bold">{pl[f.key] ?? 0}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center">
                    {isEditing ? (
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => save(pl.id)}
                          disabled={saving}
                          className="px-2 py-1 rounded text-xs font-bold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50">
                          {saving ? "..." : "Зберегти"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 rounded text-xs font-bold bg-gray-200 text-gray-600 hover:bg-gray-300">
                          Скасувати
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => startEdit(pl)}
                          className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200">
                          Редагувати
                        </button>
                        <button
                          onClick={() => reset(pl.id)}
                          disabled={resetting === pl.id}
                          className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50">
                          {resetting === pl.id ? "..." : "Скинути"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
