"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createGame, updateGame, deleteGame } from "@/actions/admin-data";
import type { GameRow, TeamRow, Tour, Group } from "../SiteEditorClient";

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
  tourId: "",
  stage: "",
  sourceA: "",
  sourceB: "",
};

type TeamRowWithAge = TeamRow & { ageGroup?: string };

export default function ScheduleTab({ games, teams }: { games: GameRow[]; teams: TeamRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Защита от null/undefined
  const safeGames = games || [];
  const safeTeams = teams || [];
  const [showForm, setShowForm] = useState(false);
  const [ageFilter, setAgeFilter] = useState<"younger" | "older">("younger");
  const [error, setError] = useState<string | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [toursLoading, setToursLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [showPlayoffForm, setShowPlayoffForm] = useState(false);
  const [playoffMatches, setPlayoffMatches] = useState({
    // Півфінал 1
    sf1_home_team: "",
    sf1_home_score: "",
    sf1_away_team: "",
    sf1_away_score: "",
    sf1_date: "",

    // Півфінал 2
    sf2_home_team: "",
    sf2_home_score: "",
    sf2_away_team: "",
    sf2_away_score: "",
    sf2_date: "",

    // Фінал
    final_home_team: "",
    final_home_score: "",
    final_away_team: "",
    final_away_score: "",
    final_date: "",

    // Матч за 3 місце
    third_home_team: "",
    third_home_score: "",
    third_away_team: "",
    third_away_score: "",
    third_date: "",
  });

  const [manualPlayoff, setManualPlayoff] = useState({
    semifinal_1: { teamA: "", teamB: "", scoreA: "", scoreB: "" },
    semifinal_2: { teamA: "", teamB: "", scoreA: "", scoreB: "" },
    final: { teamA: "", teamB: "", scoreA: "", scoreB: "" },
    third_place: { teamA: "", teamB: "", scoreA: "", scoreB: "" },
  });

  const playoffGames = games.filter((g: GameRow) => g.stage && g.stage !== "group");

  useEffect(() => {
    const loadToursAndGroups = async () => {
      setToursLoading(true);
      setGroupsLoading(true);
      try {
        const ageGroup = ageFilter === "older" ? "older" : "younger";
        const [toursRes, groupsRes] = await Promise.all([
          fetch(`/api/tours?ageGroup=${ageGroup}`),
          fetch(`/api/groups?ageGroup=${ageGroup}`),
        ]);
        if (toursRes.ok) setTours(await toursRes.json());
        if (groupsRes.ok) setGroups(await groupsRes.json());
      } catch (err) {
        console.error("Error loading tours/groups:", err);
      } finally {
        setToursLoading(false);
        setGroupsLoading(false);
      }
    };
    loadToursAndGroups();
  }, [ageFilter]);

  // Загрузить плей-офф данные при смене ageFilter
  useEffect(() => {
    const loadPlayoff = async () => {
      try {
        const response = await fetch(`/api/playoff?ageGroup=${ageFilter}`);
        const playoff = await response.json();

        if (playoff) {
          console.log("📥 Loaded playoff:", playoff);
          setManualPlayoff({
            semifinal_1: {
              teamA: playoff.semifinal1TeamA || "",
              teamB: playoff.semifinal1TeamB || "",
              scoreA: playoff.semifinal1ScoreA?.toString() || "",
              scoreB: playoff.semifinal1ScoreB?.toString() || "",
            },
            semifinal_2: {
              teamA: playoff.semifinal2TeamA || "",
              teamB: playoff.semifinal2TeamB || "",
              scoreA: playoff.semifinal2ScoreA?.toString() || "",
              scoreB: playoff.semifinal2ScoreB?.toString() || "",
            },
            final: {
              teamA: playoff.finalTeamA || "",
              teamB: playoff.finalTeamB || "",
              scoreA: playoff.finalScoreA?.toString() || "",
              scoreB: playoff.finalScoreB?.toString() || "",
            },
            third_place: {
              teamA: playoff.thirdPlaceTeamA || "",
              teamB: playoff.thirdPlaceTeamB || "",
              scoreA: playoff.thirdPlaceScoreA?.toString() || "",
              scoreB: playoff.thirdPlaceScoreB?.toString() || "",
            },
          });
        }
      } catch (error) {
        console.error("❌ Failed to load playoff:", error);
      }
    };

    loadPlayoff();
  }, [ageFilter]);

  // Determine ageGroup of a game by its home team
  const teamAgeMap: Record<number, string> = {};
  (teams as TeamRowWithAge[]).forEach((t) => {
    teamAgeMap[t.id] = t.ageGroup ?? "younger";
  });

  const getGameAge = (g: GameRow) => teamAgeMap[g.homeTeamId] ?? teamAgeMap[g.awayTeamId] ?? "younger";

  const filteredGames = safeGames.filter((g) => getGameAge(g) === ageFilter);
  const filteredTeams = (safeTeams as TeamRowWithAge[]).filter((t) => (t.ageGroup ?? "younger") === ageFilter);

  const handleManualPlayoffChange = (stage: string, field: string, value: string) => {
    setManualPlayoff(prev => ({
      ...prev,
      [stage]: {
        ...(prev as any)[stage],
        [field]: value
      }
    }));
  };

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
      tourId: g.tourId ? g.tourId.toString() : "",
      stage: g.stage || "",
      sourceA: g.sourceA || "",
      sourceB: g.sourceB || "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    setError(null);
    if (!form.homeTeamId || !form.awayTeamId || !form.scheduledAt) {
      setError("Заповніть обов'язкові поля: команди та дату");
      return;
    }
    const data = {
      homeTeamId: Number(form.homeTeamId),
      awayTeamId: Number(form.awayTeamId),
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      status: form.status,
      homeScore: Number(form.homeScore),
      awayScore: Number(form.awayScore),
      ageGroup: ageFilter,
      tourId: form.tourId ? Number(form.tourId) : null,
      stage: form.stage || null,
      sourceA: form.sourceA || null,
      sourceB: form.sourceB || null,
    };
    startTransition(async () => {
      try {
        if (editingId) {
          await updateGame(editingId, data);
        } else {
          await createGame(data);
        }
        setForm(EMPTY_FORM);
        setEditingId(null);
        setShowForm(false);
        setError(null);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Невідома помилка при збереженні матчу";
        setError(message);
        console.error("Error saving game:", err);
      }
    });
  };

  const handleGeneratePlayoff = async () => {
    if (!confirm("Створити 4 матчі плей-офф?")) return;
    console.log("🔴 handleGeneratePlayoff called!");
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/games/playoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ageGroup: ageFilter }),
        });
        console.log("📱 API response:", res.ok);
        if (res.ok) {
          console.log("✅ Setting showPlayoffForm to true");
          setShowPlayoffForm(true);
          router.refresh();
        } else {
          const err = await res.json();
          setError(err.error || "Не вдалося створити плей-офф");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Невідома помилка";
        setError(message);
      }
    });
  };

  const STAGE_LABELS: Record<string, string> = {
    semifinal: "Półфінал",
    final: "🥇 Фінал",
    third_place: "🥉 За 3 місце",
  };

  const handleDelete = (id: number) => {
    if (!confirm("Видалити матч?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteGame(id);
        setError(null);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Невідома помилка при видаленні матчу";
        setError(message);
        console.error("Error deleting game:", err);
      }
    });
  };

  const upcoming = filteredGames.filter((g: GameRow) => g.status !== "FINAL");
  const finished = filteredGames.filter((g: GameRow) => g.status === "FINAL");

  const savePlayoffMatches = async () => {
    try {
      console.log("🎯 Saving playoff to Playoff table:", manualPlayoff);

      const payload = {
        ageGroup: ageFilter,
        // ПОЛУФИНАЛ 1
        semifinal1TeamA: manualPlayoff.semifinal_1.teamA || null,
        semifinal1TeamB: manualPlayoff.semifinal_1.teamB || null,
        semifinal1ScoreA: manualPlayoff.semifinal_1.scoreA ? parseInt(manualPlayoff.semifinal_1.scoreA) : null,
        semifinal1ScoreB: manualPlayoff.semifinal_1.scoreB ? parseInt(manualPlayoff.semifinal_1.scoreB) : null,
        // ПОЛУФИНАЛ 2
        semifinal2TeamA: manualPlayoff.semifinal_2.teamA || null,
        semifinal2TeamB: manualPlayoff.semifinal_2.teamB || null,
        semifinal2ScoreA: manualPlayoff.semifinal_2.scoreA ? parseInt(manualPlayoff.semifinal_2.scoreA) : null,
        semifinal2ScoreB: manualPlayoff.semifinal_2.scoreB ? parseInt(manualPlayoff.semifinal_2.scoreB) : null,
        // ФИНАЛ
        finalTeamA: manualPlayoff.final.teamA || null,
        finalTeamB: manualPlayoff.final.teamB || null,
        finalScoreA: manualPlayoff.final.scoreA ? parseInt(manualPlayoff.final.scoreA) : null,
        finalScoreB: manualPlayoff.final.scoreB ? parseInt(manualPlayoff.final.scoreB) : null,
        // ЗА 3 МІСЦЕ
        thirdPlaceTeamA: manualPlayoff.third_place.teamA || null,
        thirdPlaceTeamB: manualPlayoff.third_place.teamB || null,
        thirdPlaceScoreA: manualPlayoff.third_place.scoreA ? parseInt(manualPlayoff.third_place.scoreA) : null,
        thirdPlaceScoreB: manualPlayoff.third_place.scoreB ? parseInt(manualPlayoff.third_place.scoreB) : null,
      };

      const response = await fetch("/api/playoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save playoff");
      }

      console.log("✅ Playoff saved successfully!");
      alert("✅ Плей-офф дані збережені!");
      router.refresh();
    } catch (error) {
      console.error("❌ Error saving playoff:", error);
      alert("❌ Помилка при збереженні плей-офф");
    }
  };

  return (
    <div className="space-y-5">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-start justify-between">
          <div>
            <strong>⚠️ Помилка:</strong> {error}
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

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
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Тур</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.tourId}
                onChange={(e) => setForm((f) => ({ ...f, tourId: e.target.value }))}
              >
                <option value="">Без туру</option>
                {tours.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Стадія гри</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.stage}
                onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
              >
                <option value="">Груповий етап</option>
                <option value="semifinal">Півфінал</option>
                <option value="final">Фінал</option>
                <option value="third_place">Матч за 3 місце</option>
              </select>
            </div>
            {form.stage && form.stage !== "group" && (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Команда A (або джерело: A1, Winner SF1)</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.sourceA}
                    onChange={(e) => setForm((f) => ({ ...f, sourceA: e.target.value }))}
                    placeholder="A1 або назва команди"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Команда B (або джерело: B2, Winner SF2)</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.sourceB}
                    onChange={(e) => setForm((f) => ({ ...f, sourceB: e.target.value }))}
                    placeholder="B2 або назва команди"
                  />
                </div>
              </>
            )}
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

      {/* Tours Manager */}
      <ToursManager ageGroup={ageFilter} tours={tours} onToursUpdate={() => {}} />

      {/* Groups Manager */}
      <GroupsManager ageGroup={ageFilter} groups={groups} teams={filteredTeams} onGroupsUpdate={() => {}} />

      {/* 🏆 Playoff Manager */}
      <div className="bg-gray-50 border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-700">🏆 Плей-офф</h3>
          <button
            onClick={handleGeneratePlayoff}
            disabled={pending || playoffGames.length > 0}
            className="px-3 py-1.5 text-xs rounded-lg font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "#f59e0b" }}
          >
            ⚡ Згенерувати плей-офф
          </button>
        </div>

        {/* 🏆 Плей-офф (ручний ввід) */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold mb-6 text-blue-900">🏆 Плей-офф (ручний ввід)</h3>

          {/* ПІВФІНАЛ 1 */}
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h4 className="font-bold text-sm mb-3 text-gray-700">ПІВФІНАЛ 1</h4>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Команда A"
                value={manualPlayoff.semifinal_1.teamA}
                onChange={(e) => handleManualPlayoffChange("semifinal_1", "teamA", e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Рахунок"
                value={manualPlayoff.semifinal_1.scoreA}
                onChange={(e) => handleManualPlayoffChange("semifinal_1", "scoreA", e.target.value)}
                min="0"
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Рахунок"
                value={manualPlayoff.semifinal_1.scoreB}
                onChange={(e) => handleManualPlayoffChange("semifinal_1", "scoreB", e.target.value)}
                min="0"
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Команда B"
                value={manualPlayoff.semifinal_1.teamB}
                onChange={(e) => handleManualPlayoffChange("semifinal_1", "teamB", e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* ПІВФІНАЛ 2 */}
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h4 className="font-bold text-sm mb-3 text-gray-700">ПІВФІНАЛ 2</h4>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Команда A"
                value={manualPlayoff.semifinal_2.teamA}
                onChange={(e) => handleManualPlayoffChange("semifinal_2", "teamA", e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Рахунок"
                value={manualPlayoff.semifinal_2.scoreA}
                onChange={(e) => handleManualPlayoffChange("semifinal_2", "scoreA", e.target.value)}
                min="0"
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Рахунок"
                value={manualPlayoff.semifinal_2.scoreB}
                onChange={(e) => handleManualPlayoffChange("semifinal_2", "scoreB", e.target.value)}
                min="0"
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Команда B"
                value={manualPlayoff.semifinal_2.teamB}
                onChange={(e) => handleManualPlayoffChange("semifinal_2", "teamB", e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* ФІНАЛ */}
          <div className="bg-white border-2 border-yellow-400 rounded-lg p-4 mb-4">
            <h4 className="font-bold text-sm mb-3 text-yellow-700">🥇 ФІНАЛ</h4>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Команда A"
                value={manualPlayoff.final.teamA}
                onChange={(e) => handleManualPlayoffChange("final", "teamA", e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Рахунок"
                value={manualPlayoff.final.scoreA}
                onChange={(e) => handleManualPlayoffChange("final", "scoreA", e.target.value)}
                min="0"
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Рахунок"
                value={manualPlayoff.final.scoreB}
                onChange={(e) => handleManualPlayoffChange("final", "scoreB", e.target.value)}
                min="0"
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Команда B"
                value={manualPlayoff.final.teamB}
                onChange={(e) => handleManualPlayoffChange("final", "teamB", e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* ЗА 3 МІСЦЕ */}
          <div className="bg-white border-2 border-orange-400 rounded-lg p-4 mb-4">
            <h4 className="font-bold text-sm mb-3 text-orange-700">🥉 ЗА 3 МІСЦЕ</h4>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Команда A"
                value={manualPlayoff.third_place.teamA}
                onChange={(e) => handleManualPlayoffChange("third_place", "teamA", e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Рахунок"
                value={manualPlayoff.third_place.scoreA}
                onChange={(e) => handleManualPlayoffChange("third_place", "scoreA", e.target.value)}
                min="0"
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Рахунок"
                value={manualPlayoff.third_place.scoreB}
                onChange={(e) => handleManualPlayoffChange("third_place", "scoreB", e.target.value)}
                min="0"
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Команда B"
                value={manualPlayoff.third_place.teamB}
                onChange={(e) => handleManualPlayoffChange("third_place", "teamB", e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={() => savePlayoffMatches()}
            className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-bold"
          >
            💾 Зберегти плей-офф
          </button>
        </div>

        {/* 🟨 Керування таблицями соревнований */}
        <GroupTablesManager ageGroup={ageFilter} />

        {/* ✅ НОВЕ: Форма з 8 полями (4 матчі) */}
        {showPlayoffForm && (
          <div className="bg-white border rounded-lg p-4 space-y-4">
            {/* DEBUG BLOCK */}
            <div style={{ background: '#ef4444', color: 'white', padding: '12px', marginBottom: '16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>
              ✅ DEBUG: showPlayoffForm = {String(showPlayoffForm)} | playoffGames.length = {playoffGames.length}
            </div>

            <h4 className="text-sm font-bold text-gray-700 border-b pb-2">
              📝 Введіть дані для плей-офф матчів
            </h4>

            {/* ПІВФІНАЛ 1 */}
            <div className="bg-blue-50 rounded p-3 space-y-2">
              <h5 className="text-xs font-bold text-blue-700">🔵 ПІВФІНАЛ 1</h5>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Команда 1</label>
                  <input
                    type="text"
                    placeholder="Назва"
                    value={playoffMatches.sf1_home_team}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        sf1_home_team: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Рахунок 1</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={playoffMatches.sf1_home_score}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        sf1_home_score: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Команда 2</label>
                  <input
                    type="text"
                    placeholder="Назва"
                    value={playoffMatches.sf1_away_team}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        sf1_away_team: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Рахунок 2</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={playoffMatches.sf1_away_score}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        sf1_away_score: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Дата</label>
                  <input
                    type="date"
                    value={playoffMatches.sf1_date}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        sf1_date: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* ПІВФІНАЛ 2 */}
            <div className="bg-blue-50 rounded p-3 space-y-2">
              <h5 className="text-xs font-bold text-blue-700">🔵 ПІВФІНАЛ 2</h5>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Команда 1</label>
                  <input
                    type="text"
                    placeholder="Назва"
                    value={playoffMatches.sf2_home_team}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        sf2_home_team: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Рахунок 1</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={playoffMatches.sf2_home_score}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        sf2_home_score: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Команда 2</label>
                  <input
                    type="text"
                    placeholder="Назва"
                    value={playoffMatches.sf2_away_team}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        sf2_away_team: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Рахунок 2</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={playoffMatches.sf2_away_score}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        sf2_away_score: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Дата</label>
                  <input
                    type="date"
                    value={playoffMatches.sf2_date}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        sf2_date: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* ФІНАЛ */}
            <div className="bg-yellow-50 rounded p-3 space-y-2">
              <h5 className="text-xs font-bold text-yellow-700">🥇 ФІНАЛ</h5>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Команда 1</label>
                  <input
                    type="text"
                    placeholder="Назва"
                    value={playoffMatches.final_home_team}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        final_home_team: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Рахунок 1</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={playoffMatches.final_home_score}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        final_home_score: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Команда 2</label>
                  <input
                    type="text"
                    placeholder="Назва"
                    value={playoffMatches.final_away_team}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        final_away_team: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Рахунок 2</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={playoffMatches.final_away_score}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        final_away_score: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Дата</label>
                  <input
                    type="date"
                    value={playoffMatches.final_date}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        final_date: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* МАТЧ ЗА 3 МІСЦЕ */}
            <div className="bg-orange-50 rounded p-3 space-y-2">
              <h5 className="text-xs font-bold text-orange-700">🥉 ЗА 3 МІСЦЕ</h5>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Команда 1</label>
                  <input
                    type="text"
                    placeholder="Назва"
                    value={playoffMatches.third_home_team}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        third_home_team: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Рахунок 1</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={playoffMatches.third_home_score}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        third_home_score: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Команда 2</label>
                  <input
                    type="text"
                    placeholder="Назва"
                    value={playoffMatches.third_away_team}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        third_away_team: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Рахунок 2</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={playoffMatches.third_away_score}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        third_away_score: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">Дата</label>
                  <input
                    type="date"
                    value={playoffMatches.third_date}
                    onChange={(e) =>
                      setPlayoffMatches((m) => ({
                        ...m,
                        third_date: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded text-sm transition disabled:opacity-50"
              disabled={pending}
              onClick={async () => {
                setError(null);
                startTransition(async () => {
                  try {
                    const sfMatches = playoffGames.filter((g) => g.stage === "semifinal");
                    const finalMatch = playoffGames.find((g) => g.stage === "final");
                    const thirdMatch = playoffGames.find((g) => g.stage === "third_place");

                    if (sfMatches.length >= 2) {
                      await updateGame(sfMatches[0].id, {
                        homeTeamId: sfMatches[0].homeTeamId,
                        awayTeamId: sfMatches[0].awayTeamId,
                        homeScore: sfMatches[0].homeScore,
                        awayScore: sfMatches[0].awayScore,
                        playoffTeamA: playoffMatches.sf1_home_team || sfMatches[0].playoffTeamA,
                        playoffTeamB: playoffMatches.sf1_away_team || sfMatches[0].playoffTeamB,
                        playoffScoreA: Number(playoffMatches.sf1_home_score) || null,
                        playoffScoreB: Number(playoffMatches.sf1_away_score) || null,
                        scheduledAt: playoffMatches.sf1_date
                          ? new Date(playoffMatches.sf1_date).toISOString()
                          : new Date(sfMatches[0].scheduledAt).toISOString(),
                        status: sfMatches[0].status,
                        ageGroup: ageFilter,
                        stage: "semifinal",
                      });

                      await updateGame(sfMatches[1].id, {
                        homeTeamId: sfMatches[1].homeTeamId,
                        awayTeamId: sfMatches[1].awayTeamId,
                        homeScore: sfMatches[1].homeScore,
                        awayScore: sfMatches[1].awayScore,
                        playoffTeamA: playoffMatches.sf2_home_team || sfMatches[1].playoffTeamA,
                        playoffTeamB: playoffMatches.sf2_away_team || sfMatches[1].playoffTeamB,
                        playoffScoreA: Number(playoffMatches.sf2_home_score) || null,
                        playoffScoreB: Number(playoffMatches.sf2_away_score) || null,
                        scheduledAt: playoffMatches.sf2_date
                          ? new Date(playoffMatches.sf2_date).toISOString()
                          : new Date(sfMatches[1].scheduledAt).toISOString(),
                        status: sfMatches[1].status,
                        ageGroup: ageFilter,
                        stage: "semifinal",
                      });
                    }

                    if (finalMatch) {
                      await updateGame(finalMatch.id, {
                        homeTeamId: finalMatch.homeTeamId,
                        awayTeamId: finalMatch.awayTeamId,
                        homeScore: finalMatch.homeScore,
                        awayScore: finalMatch.awayScore,
                        playoffTeamA: playoffMatches.final_home_team || finalMatch.playoffTeamA,
                        playoffTeamB: playoffMatches.final_away_team || finalMatch.playoffTeamB,
                        playoffScoreA: Number(playoffMatches.final_home_score) || null,
                        playoffScoreB: Number(playoffMatches.final_away_score) || null,
                        scheduledAt: playoffMatches.final_date
                          ? new Date(playoffMatches.final_date).toISOString()
                          : new Date(finalMatch.scheduledAt).toISOString(),
                        status: finalMatch.status,
                        ageGroup: ageFilter,
                        stage: "final",
                      });
                    }

                    if (thirdMatch) {
                      await updateGame(thirdMatch.id, {
                        homeTeamId: thirdMatch.homeTeamId,
                        awayTeamId: thirdMatch.awayTeamId,
                        homeScore: thirdMatch.homeScore,
                        awayScore: thirdMatch.awayScore,
                        playoffTeamA: playoffMatches.third_home_team || thirdMatch.playoffTeamA,
                        playoffTeamB: playoffMatches.third_away_team || thirdMatch.playoffTeamB,
                        playoffScoreA: Number(playoffMatches.third_home_score) || null,
                        playoffScoreB: Number(playoffMatches.third_away_score) || null,
                        scheduledAt: playoffMatches.third_date
                          ? new Date(playoffMatches.third_date).toISOString()
                          : new Date(thirdMatch.scheduledAt).toISOString(),
                        status: thirdMatch.status,
                        ageGroup: ageFilter,
                        stage: "third_place",
                      });
                    }

                    router.refresh();
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Невідома помилка";
                    setError(message);
                  }
                });
              }}
            >
              💾 Зберегти дані плей-офф
            </button>
          </div>
        )}

        {/* Список плей-офф матчів */}
        {playoffGames.length === 0 ? (
          <p className="text-gray-400 text-sm">Плей-офф матчів не створено</p>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Створені матчи:</h4>
            {playoffGames.map((g) => (
              <div
                key={g.id}
                className="bg-white border rounded p-2 text-sm flex items-center justify-between hover:bg-gray-50"
              >
                <span>
                  <strong>{STAGE_LABELS[g.stage || ""] || g.stage}:</strong>{" "}
                  {g.homeTeam?.name || g.sourceA || "TBD"} vs{" "}
                  {g.awayTeam?.name || g.sourceB || "TBD"}
                </span>
                <span className="text-xs text-gray-400">{g.status}</span>
              </div>
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

function ToursManager({ ageGroup, tours, onToursUpdate }: { ageGroup: "younger" | "older"; tours: Tour[]; onToursUpdate: () => void }) {
  const [newTourName, setNewTourName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddTour = async () => {
    if (!newTourName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTourName, order: (tours?.length ?? 0) + 1, ageGroup }),
      });
      if (res.ok) {
        setNewTourName("");
        window.location.reload();
      } else {
        setError("Не вдалося створити тур");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTour = async (tourId: number) => {
    if (!confirm("Видалити тур?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tours/${tourId}`, { method: "DELETE" });
      if (res.ok) {
        window.location.reload();
      } else {
        setError("Не вдалося видалити тур");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 border rounded-xl p-4 space-y-3">
      <h3 className="font-bold text-gray-700">Керування турами</h3>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Назва туру"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          value={newTourName}
          onChange={(e) => setNewTourName(e.target.value)}
        />
        <button
          onClick={handleAddTour}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: "#f97316" }}
        >
          Додати тур
        </button>
      </div>
      {(tours?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {tours.map((t) => (
            <div key={t.id} className="bg-white border rounded p-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t.name}</span>
              <button
                onClick={() => handleDeleteTour(t.id)}
                className="text-xs text-red-400 hover:underline"
              >
                Видалити
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupTablesManager({ ageGroup }: { ageGroup: "younger" | "older" }) {
  const [groupA, setGroupA] = useState<string>("");
  const [groupB, setGroupB] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGroupTables = async () => {
      try {
        const res = await fetch(`/api/groups?ageGroup=${ageGroup}`);
        const data = await res.json();
        if (data) {
          setGroupA((data.groupA || []).join("\n"));
          setGroupB((data.groupB || []).join("\n"));
        }
      } catch (err) {
        console.error("Error loading group tables:", err);
      }
    };
    loadGroupTables();
  }, [ageGroup]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ageGroup,
        groupA: groupA.split("\n").filter((t) => t.trim()),
        groupB: groupB.split("\n").filter((t) => t.trim()),
      };

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("✅ Таблиці змагань збережені!");
      } else {
        setError("Не вдалося зберегти таблиці");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border rounded-xl p-4 space-y-3 mb-4">
      <h3 className="font-bold text-yellow-700">🟨 Керування таблицями соревнований</h3>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block font-bold">Група A (по одній команді на рядок)</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
            rows={6}
            value={groupA}
            onChange={(e) => setGroupA(e.target.value)}
            placeholder="Команда 1&#10;Команда 2&#10;Команда 3"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block font-bold">Група B (по одній команді на рядок)</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
            rows={6}
            value={groupB}
            onChange={(e) => setGroupB(e.target.value)}
            placeholder="Команда 4&#10;Команда 5&#10;Команда 6"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full px-4 py-2 rounded-lg text-sm font-bold text-white"
        style={{ backgroundColor: "#f97316" }}
      >
        {loading ? "Збереження..." : "💾 Зберегти таблиці"}
      </button>
    </div>
  );
}

function GroupsManager({ ageGroup, groups, teams, onGroupsUpdate }: { ageGroup: "younger" | "older"; groups: Group[]; teams: TeamRowWithAge[]; onGroupsUpdate: () => void }) {
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, ageGroup }),
      });
      if (res.ok) {
        setNewGroupName("");
        window.location.reload();
      } else {
        setError("Не вдалося створити групу");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm("Видалити групу?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (res.ok) {
        window.location.reload();
      } else {
        setError("Не вдалося видалити групу");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeamToGroup = async (groupId: number, teamId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        setError(err.error || "Не вдалося додати команду");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeamFromGroup = async (groupId: number, teamId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/teams`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        setError("Не вдалося видалити команду з групи");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 border rounded-xl p-4 space-y-3">
      <h3 className="font-bold text-gray-700">Керування групами команд</h3>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Назва групи"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />
        <button
          onClick={handleAddGroup}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: "#1a2744" }}
        >
          Додати групу
        </button>
      </div>
      {(groups?.length ?? 0) > 0 && (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="bg-white border rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{g.name}</span>
                <button
                  onClick={() => handleDeleteGroup(g.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Видалити групу
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.groupTeams.map((gt) => (
                  <span key={gt.id} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                    {gt.team.name}
                    <button
                      onClick={() => handleRemoveTeamFromGroup(g.id, gt.teamId)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <select
                className="w-full border rounded text-sm px-2 py-1"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddTeamToGroup(g.id, Number(e.target.value));
                    e.target.value = "";
                  }
                }}
              >
                <option value="">Додати команду до групи...</option>
                {teams
                  .filter((t) => !g.groupTeams.some((gt) => gt.teamId === t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
