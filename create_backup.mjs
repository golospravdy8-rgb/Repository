import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const p = new PrismaClient();

async function main() {
  console.log('⏳ Збираємо всі дані...');

  const backup = {
    meta: {
      createdAt: new Date().toISOString(),
      version: '2.0',
      description: 'Повний бекап ДБЛ Львів'
    },
    data: {
      seasons:     await p.season.findMany(),
      teams:       await p.team.findMany(),
      players:     await p.player.findMany(),
      tours:       await p.tour.findMany({ orderBy: { order: 'asc' } }),
      games:       await p.game.findMany({
                     include: {
                       homeTeam: { select: { name: true } },
                       awayTeam: { select: { name: true } },
                       tour:     { select: { name: true } }
                     }
                   }),
      groups:      await p.group.findMany({ include: { groupTeams: true } }),
      groupTables: await p.groupTables.findMany(),
      boxScores:   await p.boxScore.findMany({
                     include: {
                       player: { select: { firstName: true, lastName: true, number: true } },
                       team:   { select: { name: true } },
                       game:   { select: { scheduledAt: true, homeScore: true, awayScore: true } }
                     }
                   }),
      standings:   await p.standing.findMany({
                     include: { team: { select: { name: true, ageGroup: true } } }
                   }),
      playoffs:    await p.playoff.findMany(),
    }
  };

  // Створи папку backups в корені проекту
  const backupDir = join(process.cwd(), 'backups');
  mkdirSync(backupDir, { recursive: true });

  // Назва файлу з датою
  const timestamp = new Date().toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .slice(0, 19);
  const filename = `backup_${timestamp}.json`;
  const filepath = join(backupDir, filename);

  writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8');

  console.log('\n✅ БЕКАП СТВОРЕНО!');
  console.log('📁 Шлях:', filepath);
  console.log('\n📊 Збережено:');
  Object.entries(backup.data).forEach(([key, val]) => {
    console.log(`  ${key}: ${Array.isArray(val) ? val.length : 1} записів`);
  });

  await p.$disconnect();
}
main();
