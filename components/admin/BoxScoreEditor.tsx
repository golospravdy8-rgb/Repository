"use client";

import { useState, useEffect } from "react";

interface BoxScoreEntry {
  playerId: number;
  teamId: number;
  firstName: string;
  lastName: string;
  number: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fouls: number;
  minutes: number;
}

export default function BoxScoreEditor({
  gameId,
  homeTeamId,
  awayTeamId,
}: {
  gameId: number;
  homeTeamId: number;
  awayTeamId: number;
}) {
  const [entries, setEntries] = useState<BoxScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadBoxScores = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/games/${gameId}/boxscore`);
        if (!res.ok) throw new Error("Failed to load BoxScores");
        const data = await res.json();
        setEntries(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    loadBoxScores();
  }, [gameId]);

  const handleChange = (playerId: number, field: string, value: number) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.playerId === playerId ? { ...e, [field]: value } : e
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = entries.map((e) => ({
        playerId: e.playerId,
        teamId: e.teamId,
        points: e.points,
        rebounds: e.rebounds,
        assists: e.assists,
        steals: e.steals,
        blocks: e.blocks,
        fouls: e.fouls,
        minutes: e.minutes,
      }));

      const res = await fetch(`/api/admin/games/${gameId}/boxscore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save BoxScores");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500 text-sm">Завантаження...</div>;

  const homeTeamEntries = entries.filter((e) => e.teamId === homeTeamId);
  const awayTeamEntries = entries.filter((e) => e.teamId === awayTeamId);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4 mt-4">
      <h3 className="font-bold text-blue-900">📊 Статистика гравців</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-2 text-green-700 text-sm">
          ✅ Статистика збережена!
        </div>
      )}

      {/* Home Team */}
      {homeTeamEntries.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Господарі</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-white border-b">
                  <th className="px-2 py-1 text-left">Гравець</th>
                  <th className="px-2 py-1 text-center">Очки</th>
                  <th className="px-2 py-1 text-center">Пд</th>
                  <th className="px-2 py-1 text-center">Ас</th>
                  <th className="px-2 py-1 text-center">Пр</th>
                  <th className="px-2 py-1 text-center">Бл</th>
                  <th className="px-2 py-1 text-center">Фл</th>
                </tr>
              </thead>
              <tbody>
                {homeTeamEntries.map((entry) => (
                  <tr key={entry.playerId} className="border-b hover:bg-white">
                    <td className="px-2 py-1">
                      {entry.number}. {entry.firstName} {entry.lastName}
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.points}
                        onChange={(e) =>
                          handleChange(entry.playerId, "points", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.rebounds}
                        onChange={(e) =>
                          handleChange(entry.playerId, "rebounds", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.assists}
                        onChange={(e) =>
                          handleChange(entry.playerId, "assists", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.steals}
                        onChange={(e) =>
                          handleChange(entry.playerId, "steals", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.blocks}
                        onChange={(e) =>
                          handleChange(entry.playerId, "blocks", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.fouls}
                        onChange={(e) =>
                          handleChange(entry.playerId, "fouls", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Away Team */}
      {awayTeamEntries.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Гості</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-white border-b">
                  <th className="px-2 py-1 text-left">Гравець</th>
                  <th className="px-2 py-1 text-center">Очки</th>
                  <th className="px-2 py-1 text-center">Пд</th>
                  <th className="px-2 py-1 text-center">Ас</th>
                  <th className="px-2 py-1 text-center">Пр</th>
                  <th className="px-2 py-1 text-center">Бл</th>
                  <th className="px-2 py-1 text-center">Фл</th>
                </tr>
              </thead>
              <tbody>
                {awayTeamEntries.map((entry) => (
                  <tr key={entry.playerId} className="border-b hover:bg-white">
                    <td className="px-2 py-1">
                      {entry.number}. {entry.firstName} {entry.lastName}
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.points}
                        onChange={(e) =>
                          handleChange(entry.playerId, "points", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.rebounds}
                        onChange={(e) =>
                          handleChange(entry.playerId, "rebounds", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.assists}
                        onChange={(e) =>
                          handleChange(entry.playerId, "assists", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.steals}
                        onChange={(e) =>
                          handleChange(entry.playerId, "steals", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.blocks}
                        onChange={(e) =>
                          handleChange(entry.playerId, "blocks", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={entry.fouls}
                        onChange={(e) =>
                          handleChange(entry.playerId, "fouls", parseInt(e.target.value) || 0)
                        }
                        className="w-12 border rounded px-1 py-0.5 text-center"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-2 rounded-lg text-sm font-bold text-white"
        style={{ backgroundColor: "#10b981" }}
      >
        {saving ? "Збереження..." : "💾 Зберегти статистику"}
      </button>
    </div>
  );
}
