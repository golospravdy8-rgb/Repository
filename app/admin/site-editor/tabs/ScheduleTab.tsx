"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGame, updateGame, deleteGame } from "@/actions/admin-data";
import type { GameRow, TeamRow } from "../SiteEditorClient";

const STATUSES = ["SCHEDULED", "LIVE", "FINAL"];
const STATUS_LABELS: Record<string, string> = { SCHEDULED: "Заплановано", LIVE: "Live", FINAL: "Фінал" };
const STATUS_COLORS: Record<string, string> = { SCHEDULED: "#3b82f6", LIVE: "#ef4444", FINAL: "#6b7280" };

const EMPTY_FORM = {
  homeTeamId: "",
  awayTeamId: "",
  scheduledAt: "",
  status: "SCHEDULED",
  homeScore: "0",
  awayScore: "0",
};

type TeamRowWithAge = TeamRow & { ageGroup?: string };

export default function ScheduleTab({ games, teams }: { games: GameRow[]; teams: TeamRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [ageFilter, setAgeFilter] = useState<"younger" | "older">("younger");

  // Determine ageGroup of a game by its home team
  const teamAgeMap: Record<number, string> = {};
  (teams as TeamRowWithAge[]).forEach((t) => {
    teamAgeMap[t.id] = t.ageGroup ?? "younger";
  });

  const getGameAge = (g: GameRow) => teamAgeMap[g.homeTeamId] ?? teamAgeMap[g.awayTeamId] ?? "younger";

  const filteredGames = games.filter((g) => getGameAge(g) === ageFilter);
  const filteredTeams = (teams as TeamRowWithAge[]).filter((t) => (t.ageGroup ?? "younger") === ageFilter);

  const handleEdit = (g: GameRow) => {
    setEditingId(g.id);
    const dt = new Date(g.scheduledAt);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      homeTeamId: g.homeTeamId.toString(),
      awayTeamId: g.awayTeamId.toString(),
      scheduledAt: local,
      status: g.status,
      homeScore: g.homeScore.toString(),
      awayScore: g.awayScore.toString(),
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.homeTeamId || !form.awayTeamId || !form.scheduledAt) return;
    const data = {
      homeTeamId: Number(form.homeTeamId),
      awayTeamId: Number(form.awayTeamId),
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      status: form.status,
      homeScore: Number(form.homeScore),
      awayScore: Number(form.awayScore),
      ageGroup: ageFilter,
    };
    startTransition(async () => {
      if (editingId) {
        await updateGame(editingId, data);
      } else {
        await createGame(data);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      router.refresh();
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Видалити матч?")) return;
    startTransition(async () => {
      await deleteGame(id);
      router.refresh();
    });
  };

  const upcoming = filteredGames.filter((g: GameRow) => g.status !== "FINAL");
  const finished = filteredGames.filter((g: GameRow) => g.status === "FINAL");

  return (
    <div className="space-y-5">
      {/* Age group switcher */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => { setAgeFilter("younger"); setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); }}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              ageFilter === "younger" ? "text-white shadow-md" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
            }`}
            style={ageFilter === "younger" ? { backgroundColor: "#f97316" } : {}}
          >
            U-14
          </button>
          <button
            onClick={() => { setAgeFilter("older"); setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); }}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
              ageFilter === "older" ? "text-white shadow-md" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
            }`}
            style={ageFilter === "older" ? { backgroundColor: "#1a2744" } : {}}
          >
            U-16
          </button>
        </div>

        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: "#f97316" }}
        >
          + Додати матч
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 border rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-gray-700">
            {editingId ? "Редагувати матч" : "Новий матч"}{" "}
            <span
              className="text-xs font-bold text-white px-2 py-0.5 rounded ml-1"
              style={{ backgroundColor: ageFilter === "older" ? "#1a2744" : "#f97316" }}
            >
              {ageFilter === "older" ? "U-16" : "U-14"}
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Господарі</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.homeTeamId}
                onChange={(e) => setForm((f) => ({ ...f, homeTeamId: e.target.value }))}
              >
                <option value="">Оберіть команду</option>
                {filteredTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Гості</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.awayTeamId}
                onChange={(e) => setForm((f) => ({ ...f, awayTeamId: e.target.value }))}
              >
                <option value="">Оберіть команду</option>
                {filteredTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Дата та час</label>
              <input
                type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            {form.status !== "SCHEDULED" && (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Рахунок господарів</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.homeScore}
                    onChange={(e) => setForm((f) => ({ ...f, homeScore: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Рахунок гостей</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.awayScore}
                    onChange={(e) => setForm((f) => ({ ...f, awayScore: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={pending}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: "#1a2744" }}
            >
              {editingId ? "Зберегти" : "Додати матч"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-4 py-2 rounded-lg text-sm border text-gray-600"
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div>
        <h3 className="font-bold text-gray-700 mb-2">Заплановані матчі ({upcoming.length})</h3>
        {upcoming.length === 0 ? (
          <p className="text-gray-400 text-sm py-2">Немає запланованих матчів</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((g) => (
              <GameRowItem key={g.id} game={g} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Finished */}
      <div>
        <h3 className="font-bold text-gray-700 mb-2">Зіграні матчі ({finished.length})</h3>
        {finished.length === 0 ? (
          <p className="text-gray-400 text-sm py-2">Немає завершених матчів</p>
        ) : (
          <div className="space-y-2">
            {finished.map((g) => (
              <GameRowItem key={g.id} game={g} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GameRowItem({ game, onEdit, onDelete }: { game: GameRow; onEdit: (g: GameRow) => void; onDelete: (id: number) => void }) {
  const date = new Date(game.scheduledAt);
  return (
    <div className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        <div className="text-xs text-gray-400 w-20 shrink-0">
          {date.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}{" "}
          {date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="font-medium text-gray-800 text-sm">
          {game.homeTeam.name} — {game.awayTeam.name}
        </div>
        {game.status !== "SCHEDULED" && (
          <div className="font-bold text-sm" style={{ color: "#1a2744" }}>
            {game.homeScore} : {game.awayScore}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
          style={{ backgroundColor: STATUS_COLORS[game.status] }}
        >
          {STATUS_LABELS[game.status]}
        </span>
        <button onClick={() => onEdit(game)} className="text-xs text-blue-500 hover:underline">Ред.</button>
        <button onClick={() => onDelete(game.id)} className="text-xs text-red-400 hover:underline">Вид.</button>
      </div>
    </div>
  );
}
