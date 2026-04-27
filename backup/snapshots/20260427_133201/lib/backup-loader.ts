import fs from 'fs';
import path from 'path';

let cachedBackup: any = null;

export async function loadBackupData() {
  if (cachedBackup) return cachedBackup;

  try {
    const backupPath = path.join(process.cwd(), 'SUPER_FULL_BACKUP.json');
    const data = fs.readFileSync(backupPath, 'utf-8');
    cachedBackup = JSON.parse(data);
    return cachedBackup;
  } catch (error) {
    console.error('Failed to load backup:', error);
    return null;
  }
}

export async function getBackupGames(ageGroup: 'younger' | 'older', limit?: number) {
  const backup = await loadBackupData();
  if (!backup?.data?.games) return [];

  const games = backup.data.games;
  const seasons = backup.data.seasons || [];

  // Filter games by age group
  const seasonIds = seasons
    .filter((s: any) => s.ageGroup === ageGroup)
    .map((s: any) => s.id);

  const filtered = games.filter((g: any) => seasonIds.includes(g.seasonId));

  // Sort strictly by scheduledAt ascending (oldest to newest)
  const sorted = filtered.sort((a: any, b: any) => {
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  return limit ? sorted.slice(0, limit) : sorted;
}

export async function enrichGamesWithTeams(games: any[]) {
  const backup = await loadBackupData();
  if (!backup?.data?.teams) return games;

  const teams = backup.data.teams;
  const teamMap = new Map(teams.map((t: any) => [t.id, t]));

  return games.map((game: any) => ({
    ...game,
    homeTeam: teamMap.get(game.homeTeamId) || { id: game.homeTeamId, name: 'Unknown' },
    awayTeam: teamMap.get(game.awayTeamId) || { id: game.awayTeamId, name: 'Unknown' },
  }));
}
