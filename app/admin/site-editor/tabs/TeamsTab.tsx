"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTeam, updateTeam, deleteTeam, createPlayer, updatePlayer, deletePlayer } from "@/actions/admin-data";
import TeamLogoUploader from "../components/TeamLogoUploader";
import PlayerPhotoUploader from "../components/PlayerPhotoUploader";
import type { TeamRow, PlayerRow } from "../SiteEditorClient";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const EMPTY_TEAM_FORM = { name: "", shortName: "", logoUrl: "", ageGroup: "younger" };

export default function TeamsTab({ teams, players }: { teams: TeamRow[]; players: PlayerRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ageFilter, setAgeFilter] = useState<"younger" | "older">("younger");
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);

  // Team form
  const [teamForm, setTeamForm] = useState(EMPTY_TEAM_FORM);
  const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);

  // Player form
  const [playerForm, setPlayerForm] = useState({ firstName: "", lastName: "", number: "", position: "PG", teamId: "", photoUrl: "" });
  const [editingPlayer, setEditingPlayer] = useState<PlayerRow | null>(null);
  const [showPlayerForm, setShowPlayerForm] = useState(false);

  const teamPlayers = activeTeamId ? players.filter((p) => p.teamId === activeTeamId) : [];

  /**
   * Callback коли логотип успішно завантажено через Vercel Blob
   */
  const handleLogoUploadSuccess = (blobUrl: string) => {
    setTeamForm((f) => ({ ...f, logoUrl: blobUrl }));
  };

  const handleSaveTeam = () => {
    const nameTrimmed = teamForm.name.trim();
    const shortNameTrimmed = teamForm.shortName.trim();

    if (!nameTrimmed || !shortNameTrimmed) {
      alert(`Заповніть обов'язкові поля:\n${!nameTrimmed ? '- Назва команди\n' : ''}${!shortNameTrimmed ? '- Абревіатура' : ''}`);
      return;
    }

    startTransition(async () => {
      try {
        if (editingTeam) {
          await updateTeam(editingTeam.id, { name: nameTrimmed, shortName: shortNameTrimmed, logoUrl: teamForm.logoUrl, ageGroup: teamForm.ageGroup });
        } else {
          await createTeam({ name: nameTrimmed, shortName: shortNameTrimmed, logoUrl: teamForm.logoUrl, ageGroup: ageFilter });
        }
        setTeamForm({ ...EMPTY_TEAM_FORM, ageGroup: ageFilter });
        setEditingTeam(null);
        router.refresh();
      } catch (err) {
        console.error("Помилка при збереженні команди:", err);
        alert("Помилка при збереженні команди. Спробуйте ще раз.");
      }
    });
  };

  const handleEditTeam = (team: TeamRow) => {
    setEditingTeam(team);
    setTeamForm({ name: team.name, shortName: team.shortName, logoUrl: team.logoUrl ?? "", ageGroup: team.ageGroup ?? "younger" });
  };

  const handleDeleteTeam = (id: number) => {
    if (!confirm("Видалити команду та всіх її гравців?")) return;
    startTransition(async () => {
      await deleteTeam(id);
      if (activeTeamId === id) setActiveTeamId(null);
      router.refresh();
    });
  };

  /**
   * Callback коли фото гравця успішно завантажено через Vercel Blob
   */
  const handlePlayerPhotoUploadSuccess = (blobUrl: string) => {
    setPlayerForm((f) => ({ ...f, photoUrl: blobUrl }));
  };

  const handleSavePlayer = () => {
    if (!playerForm.firstName.trim() || !playerForm.lastName.trim() || !playerForm.teamId) return;
    startTransition(async () => {
      const data = {
        firstName: playerForm.firstName,
        lastName: playerForm.lastName,
        number: Number(playerForm.number) || 0,
        position: playerForm.position,
        teamId: Number(playerForm.teamId),
        photoUrl: playerForm.photoUrl,
      };
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, data);
      } else {
        await createPlayer(data);
      }
      setPlayerForm({ firstName: "", lastName: "", number: "", position: "PG", teamId: activeTeamId?.toString() ?? "", photoUrl: "" });
      setEditingPlayer(null);
      setShowPlayerForm(false);
      router.refresh();
    });
  };

  const handleEditPlayer = (p: PlayerRow) => {
    setEditingPlayer(p);
    setPlayerForm({
      firstName: p.firstName,
      lastName: p.lastName,
      number: p.number.toString(),
      position: p.position ?? "PG",
      teamId: p.teamId.toString(),
      photoUrl: p.photoUrl ?? "",
    });
    setShowPlayerForm(true);
  };

  const handleDeletePlayer = (id: number) => {
    if (!confirm("Видалити гравця?")) return;
    startTransition(async () => {
      await deletePlayer(id);
      router.refresh();
    });
  };

  const filteredTeams = teams.filter((t) => (t.ageGroup ?? "younger") === ageFilter);

  return (
    <div className="space-y-6">
      {/* Age group switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => { setAgeFilter("younger"); setActiveTeamId(null); setEditingTeam(null); setTeamForm({ ...EMPTY_TEAM_FORM, ageGroup: "younger" }); }}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${ageFilter === "younger" ? "text-white shadow-md" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"}`}
          style={ageFilter === "younger" ? { backgroundColor: "#f97316" } : {}}
        >
          U-14
        </button>
        <button
          onClick={() => { setAgeFilter("older"); setActiveTeamId(null); setEditingTeam(null); setTeamForm({ ...EMPTY_TEAM_FORM, ageGroup: "older" }); }}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${ageFilter === "older" ? "text-white shadow-md" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"}`}
          style={ageFilter === "older" ? { backgroundColor: "#1a2744" } : {}}
        >
          U-16
        </button>
      </div>

      {/* Team form */}
      <div className="bg-gray-50 rounded-xl p-4 border">
        <h3 className="font-bold text-gray-700 mb-3">{editingTeam ? "Редагувати команду" : "Додати команду"}</h3>

        <div className="flex gap-4 flex-wrap items-start">
          {/* Logo upload — Vercel Blob */}
          <TeamLogoUploader
            currentLogoUrl={teamForm.logoUrl}
            shortName={teamForm.shortName || "БЛ"}
            onLogoUploadSuccess={handleLogoUploadSuccess}
            onError={(error) => {
              console.error("[TeamsTab] Logo upload error:", error);
              alert(`❌ Помилка: ${error}`);
            }}
            size={80}
          />

          {/* Name + shortName + buttons */}
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-40">
                <label className="text-xs text-gray-500 mb-1 block">Назва команди</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Назва команди"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-500 mb-1 block">Абревіатура</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="ШЧ"
                  maxLength={4}
                  value={teamForm.shortName}
                  onChange={(e) => setTeamForm((f) => ({ ...f, shortName: e.target.value }))}
                />
              </div>
              <div className="w-32">
                <label className="text-xs text-gray-500 mb-1 block">Вікова група</label>
                <div
                  className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-white text-center"
                  style={{ backgroundColor: ageFilter === "older" ? "#1a2744" : "#f97316" }}
                >
                  {ageFilter === "older" ? "U-16" : "U-14"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveTeam}
                disabled={pending}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: "#1a2744" }}
                title={!teamForm.name.trim() || !teamForm.shortName.trim() ? "Заповніть обов'язкові поля" : ""}
              >
                {pending ? "Зберігаю..." : editingTeam ? "Зберегти" : "Додати команду"}
              </button>
              {editingTeam && (
                <button
                  onClick={() => { setEditingTeam(null); setTeamForm({ ...EMPTY_TEAM_FORM, ageGroup: ageFilter }); }}
                  className="px-4 py-2 rounded-lg text-sm border text-gray-600 hover:bg-gray-100 transition-colors"
                  disabled={pending}
                >
                  Скасувати
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Teams list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredTeams.map((team) => (
          <div
            key={team.id}
            className={`border rounded-xl p-4 cursor-pointer transition-all ${activeTeamId === team.id ? "border-orange-500 bg-orange-50" : "bg-white hover:border-gray-300"}`}
            onClick={() => { setActiveTeamId(activeTeamId === team.id ? null : team.id); setShowPlayerForm(false); }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Team logo or placeholder */}
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border bg-gray-100 flex items-center justify-center">
                  {team.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={team.logoUrl}
                      alt={team.name}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        console.warn('[TeamsTab] Logo failed to load:', team.logoUrl);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-gray-400 text-xs font-bold">{team.shortName}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-gray-800 truncate block">{team.name}</span>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    <span>{team._count.players} гравців</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: team.ageGroup === "older" ? "#1a2744" : "#f97316" }}>
                      {team.ageGroup === "older" ? "U-16" : "U-14"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleEditTeam(team)}
                  className="text-xs px-2 py-1 rounded border text-gray-600 hover:bg-gray-100"
                >
                  Ред.
                </button>
                <button
                  onClick={() => handleDeleteTeam(team.id)}
                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50"
                >
                  Вид.
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Players panel */}
      {activeTeamId && (
        <div className="border rounded-xl p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-700">
              Гравці: {teams.find((t) => t.id === activeTeamId)?.name}
            </h3>
            <button
              onClick={() => {
                setShowPlayerForm(true);
                setEditingPlayer(null);
                setPlayerForm({ firstName: "", lastName: "", number: "", position: "PG", teamId: activeTeamId.toString(), photoUrl: "" });
              }}
              className="text-xs px-3 py-1.5 rounded-lg font-bold text-white"
              style={{ backgroundColor: "#f97316" }}
            >
              + Додати гравця
            </button>
          </div>

          {/* Player form */}
          {showPlayerForm && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3 border space-y-3">
              <div className="flex gap-3 items-start">
                {/* Photo upload — Vercel Blob */}
                <PlayerPhotoUploader
                  currentPhotoUrl={playerForm.photoUrl}
                  onPhotoUploadSuccess={handlePlayerPhotoUploadSuccess}
                  onError={(error) => {
                    console.error("[TeamsTab] Player photo upload error:", error);
                    alert(`❌ Помилка: ${error}`);
                  }}
                />

                {/* Fields */}
                <div className="flex gap-2 flex-wrap flex-1">
                  <input
                    className="border rounded px-2 py-1.5 text-sm flex-1 min-w-28"
                    placeholder="Ім'я"
                    value={playerForm.firstName}
                    onChange={(e) => setPlayerForm((f) => ({ ...f, firstName: e.target.value }))}
                  />
                  <input
                    className="border rounded px-2 py-1.5 text-sm flex-1 min-w-28"
                    placeholder="Прізвище"
                    value={playerForm.lastName}
                    onChange={(e) => setPlayerForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                  <input
                    className="border rounded px-2 py-1.5 text-sm w-16"
                    placeholder="#"
                    type="number"
                    value={playerForm.number}
                    onChange={(e) => setPlayerForm((f) => ({ ...f, number: e.target.value }))}
                  />
                  <select
                    className="border rounded px-2 py-1.5 text-sm"
                    value={playerForm.position}
                    onChange={(e) => setPlayerForm((f) => ({ ...f, position: e.target.value }))}
                  >
                    {POSITIONS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <button
                    onClick={handleSavePlayer}
                    disabled={pending}
                    className="px-3 py-1.5 rounded text-sm font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: "#1a2744" }}
                  >
                    {editingPlayer ? "Зберегти" : "Додати"}
                  </button>
                  <button
                    onClick={() => { setShowPlayerForm(false); setEditingPlayer(null); }}
                    className="px-3 py-1.5 rounded text-sm border text-gray-600"
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Players list */}
          {teamPlayers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Гравців немає. Додайте першого!</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs border-b">
                  <th className="pb-2 pr-2">#</th>
                  <th className="pb-2">Гравець</th>
                  <th className="pb-2">Поз.</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {teamPlayers.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-2 font-mono text-gray-500">{p.number}</td>
                    <td className="py-2 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 border flex-shrink-0 flex items-center justify-center">
                          {p.photoUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={p.photoUrl} alt={p.firstName} className="object-cover w-full h-full" />
                            : <span className="text-gray-300 text-xs">👤</span>
                          }
                        </div>
                        {p.firstName} {p.lastName}
                      </div>
                    </td>
                    <td className="py-2 text-gray-400">{p.position}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => handleEditPlayer(p)} className="text-xs text-blue-500 hover:underline mr-2">Ред.</button>
                      <button onClick={() => handleDeletePlayer(p.id)} className="text-xs text-red-400 hover:underline">Вид.</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
