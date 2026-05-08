"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createGame, updateGame, deleteGame } from "@/actions/admin-data";
import type { GameRow, TeamRow, Tour } from "../SiteEditorClient";
import BoxScoreEditor from "@/components/admin/BoxScoreEditor";

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
  group: "",
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
  const [toursLoading, setToursLoading] = useState(false);

  const [manualPlayoff, setManualPlayoff] = useState({
    semifinal_1: { teamA: "", teamB: "", scoreA: "", scoreB: "" },
    semifinal_2: { teamA: "", teamB: "", scoreA: "", scoreB: "" },
    final: { teamA: "", teamB: "", scoreA: "", scoreB: "" },
    third_place: { teamA: "", teamB: "", scoreA: "", scoreB: "" },
  });

  const playoffGames = games.filter((g: GameRow) => g.stage && g.stage !== "group");

  useEffect(() => {
    const loadTours = async () => {
      setToursLoading(true);
      try {
        const ageGroup = ageFilter === "older" ? "older" : "younger";
        const toursRes = await fetch(`/api/tours?ageGroup=${ageGroup}`);
        if (toursRes.ok) setTours(await toursRes.json());
      } catch (err) {
        console.error("Error loading tours:", err);
      } finally {
        setToursLoading(false);
      }
    };
    loadTours();
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
      group: (g as any).group || "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    setError(null);
    if (!form.homeTeamId || !form.awayTeamId || !form.scheduledAt || !form.group) {
      setError("Заповніть обов'язкові поля: команди, дату та групу");
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
      group: form.group || null,
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

  const handleFinishGame = () => {
    setError(null);
    if (!form.homeTeamId || !form.awayTeamId || !form.scheduledAt || !form.group) {
      setError("Заповніть обов'язкові поля: команди, дату та групу");
      return;
    }
    const finalData = {
      homeTeamId: Number(form.homeTeamId),
      awayTeamId: Number(form.awayTeamId),
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      status: "FINAL",
      homeScore: Number(form.homeScore),
      awayScore: Number(form.awayScore),
      ageGroup: ageFilter,
      tourId: form.tourId ? Number(form.tourId) : null,
      stage: form.stage || null,
      sourceA: form.sourceA || null,
      sourceB: form.sourceB || null,
      group: form.group || null,
    };
    startTransition(async () => {
      try {
        if (editingId) {
          await updateGame(editingId, finalData);
        }
        setForm(EMPTY_FORM);
        setEditingId(null);
        setShowForm(false);
        setError(null);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Невідома помилка при завершенні матчу";
        setError(message);
        console.error("Error finishing game:", err);
      }
    });
  };

  const handleGeneratePlayoff = async () => {
    if (!confirm("Створити плей-офф структуру?")) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/playoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ageGroup: ageFilter,
            semifinal1TeamA: "",
            semifinal1TeamB: "",
            semifinal1ScoreA: null,
            semifinal1ScoreB: null,
            semifinal2TeamA: "",
            semifinal2TeamB: "",
            semifinal2ScoreA: null,
            semifinal2ScoreB: null,
            finalTeamA: "",
            finalTeamB: "",
            finalScoreA: null,
            finalScoreB: null,
            thirdPlaceTeamA: "",
            thirdPlaceTeamB: "",
            thirdPlaceScoreA: null,
            thirdPlaceScoreB: null,
          }),
        });
        if (res.ok) {
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
              <label className="text-xs text-gray-500 mb-1 block">Група</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.group}
                onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
              >
                <option value="">Оберіть групу</option>
                <option value="A">Група A</option>
                <option value="B">Група B</option>
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
                <option value="semifinal">Półfінал</option>
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
            {form.status === "FINAL" && editingId && (
              <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700 font-semibold mb-2">
                  💡 Підказка: Після збереження гри як FINAL, статистика гравців можна додати через Live Tracker або вручну в БД.
                </p>
              </div>
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
            {editingId && form.status !== "FINAL" && (
              <button
                onClick={handleFinishGame}
                disabled={pending}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: "#10b981" }}
              >
                ✓ Завершити гру
              </button>
            )}
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-4 py-2 rounded-lg text-sm border text-gray-600"
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {/* BoxScore Editor - shown when game is FINAL and being edited */}
      {editingId && form.status === "FINAL" && (
        <BoxScoreEditor
          gameId={editingId}
          homeTeamId={Number(form.homeTeamId)}
          awayTeamId={Number(form.awayTeamId)}
        />
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

