"use client";
import { useState, useEffect } from "react";

type AgeGroup = "younger" | "older";

type Standing = {
  id: number;
  teamId: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  team?: { name: string };
};

type EditState = {
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

const fields: { key: keyof EditState; label: string }[] = [
  { key: "gamesPlayed", label: "І" },
  { key: "wins", label: "П" },
  { key: "losses", label: "ПР" },
  { key: "pointsFor", label: "+" },
  { key: "pointsAgainst", label: "-" },
];

export default function StandingsManageTab() {
  const [ag, setAg] = useState<AgeGroup>("younger");
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/standings?ag=${ag}`)
      .then(r => r.json())
      .then(d => { setStandings(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => {
    setEditingId(null);
    setEditValues(null);
    load();
  }, [ag]);

  const startEdit = (st: Standing) => {
    setEditingId(st.id);
    setEditValues({
      gamesPlayed: st.gamesPlayed,
      wins: st.wins,
      losses: st.losses,
      pointsFor: st.pointsFor,
      pointsAgainst: st.pointsAgainst,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const save = async (standingId: number) => {
    if (!editValues) return;
    setSaving(true);
    await fetch("/api/admin/standings/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ standingId, ...editValues }),
    });
    setSaving(false);
    setEditingId(null);
    setEditValues(null);
    load();
  };

  const resetAll = async () => {
    if (!confirm(`Обнулити всю таблицю для ${ag === "younger" ? "U-14" : "U-16"}?`)) return;
    await fetch("/api/admin/standings/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ag }),
    });
    cancelEdit();
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black" style={{ color: "#1a2744" }}>🏆 Таблиця змагань</h2>
        <div className="flex gap-2 items-center">
          {(["younger", "older"] as AgeGroup[]).map(g => (
            <button key={g} onClick={() => setAg(g)}
              className="px-3 py-1 rounded-full text-sm font-bold"
              style={{ background: ag === g ? "#f97316" : "#f1f5f9", color: ag === g ? "white" : "#64748b" }}>
              {g === "younger" ? "U-14" : "U-16"}
            </button>
          ))}
          <button onClick={resetAll}
            className="px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-600 hover:bg-red-200">
            🗑 Обнулити все
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#1a2744", color: "white" }}>
              <th className="px-3 py-2 text-left">Команда</th>
              {fields.map(f => <th key={f.key} className="px-2 py-2 text-center">{f.label}</th>)}
              <th className="px-2 py-2 text-center">Дії</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Завантаження...</td></tr>
            ) : standings.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Немає даних</td></tr>
            ) : standings.map((st, i) => {
              const isEditing = editingId === st.id;
              return (
                <tr key={st.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                  <td className="px-3 py-2 font-medium">{st.team?.name ?? `Команда ${st.teamId}`}</td>
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
                        <span className="font-bold">{st[f.key] ?? 0}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center">
                    {isEditing ? (
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => save(st.id)}
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
                      <button
                        onClick={() => startEdit(st)}
                        className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200">
                        Редагувати
                      </button>
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
