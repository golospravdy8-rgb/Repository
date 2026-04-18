const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Восстановление 92 ИГРОКОВ из бэкапа...\n");

  // Load backup
  console.log("⏳ Загрузка бэкапа...");
  const backup = JSON.parse(fs.readFileSync("SUPER_FULL_BACKUP.json", "utf8"));
  const backupPlayers = backup.data?.players || [];
  const backupTeams = backup.data?.teams || [];

  console.log(`✅ Загружено: ${backupPlayers.length} игроков, ${backupTeams.length} команд\n`);

  if (backupPlayers.length === 0) {
    console.log("❌ В бэкапе нет игроков!");
    process.exit(1);
  }

  // Get current teams from DB
  console.log("⏳ Получение команд из БД...");
  const liveTeams = await prisma.team.findMany();
  const teamMap = Object.fromEntries(liveTeams.map((t) => [t.name, t.id]));

  console.log(`✅ На сайте ${liveTeams.length} команд\n`);

  // Prepare players for insertion
  const playersToInsert = backupPlayers
    .filter((p) => {
      // Check if team exists - use either teamId or teamName
      const actualTeamId = p.teamId || (p.teamName ? teamMap[p.teamName] : null);
      if (!actualTeamId) {
        console.warn(`⚠️  Пропуск: игрок "${p.firstName}" - команда ID ${p.teamId} не найдена`);
        return false;
      }
      return true;
    })
    .map((p) => ({
      firstName: p.firstName,
      lastName: p.lastName,
      number: p.number,
      position: p.position || null,
      teamId: p.teamId || teamMap[p.teamName],
      photoUrl: p.photoUrl || null,
    }));

  console.log(`📋 К восстановлению: ${playersToInsert.length} игроков (${backupPlayers.length - playersToInsert.length} пропущено)\n`);

  if (playersToInsert.length === 0) {
    console.log("❌ Нет игроков для восстановления!");
    process.exit(1);
  }

  // Insert players in batches
  const batchSize = 10;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < playersToInsert.length; i += batchSize) {
    const batch = playersToInsert.slice(i, i + batchSize);

    try {
      const result = await prisma.player.createMany({
        data: batch,
        skipDuplicates: true,
      });

      inserted += result.count;
      console.log(`✅ Вставлено: ${result.count} игроков (всего: ${inserted}/${playersToInsert.length})`);
    } catch (error) {
      console.error(`❌ Ошибка при вставке: ${error.message}`);
      failed += batch.length;
    }
  }

  console.log(`\n═`.repeat(35));
  console.log(`✅ Восстановление завершено!`);
  console.log(`═`.repeat(35));
  console.log(`✅ Успешно вставлено: ${inserted}`);
  console.log(`❌ Ошибок: ${failed}`);

  // Verify
  const totalPlayersNow = await prisma.player.count();
  console.log(`\n📊 Игроков в БД после восстановления: ${totalPlayersNow}\n`);

  // Show players by team
  const playersByTeam = await prisma.team.findMany({
    include: {
      players: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          number: true,
          position: true,
        },
      },
    },
  });

  console.log("📊 ИГРОКИ ПО КОМАНДАМ:\n");
  playersByTeam.forEach((team) => {
    if (team.players.length > 0) {
      console.log(`${team.name}: ${team.players.length} игроков`);
      team.players.slice(0, 3).forEach((p) => {
        console.log(`  - #${p.number} ${p.firstName} ${p.lastName} (${p.position || "?"})`);
      });
      if (team.players.length > 3) {
        console.log(`  ... и ещё ${team.players.length - 3}`);
      }
    }
  });

  console.log(`\n✨ Готово!`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Критическая ошибка:", e.message);
  process.exit(1);
});
